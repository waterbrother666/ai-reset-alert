import BetterSqlite3 from 'better-sqlite3'
import type { HistoryPage, HistoryQuery, HistoryRecord, MonitorSettings, ResetEvent, SourceHealth } from '../../shared/domain'
import type { NotificationStatus } from '../contracts'
import { StorageError } from '../errors'
import { migrate } from './migrations'

interface EventRow {
  row_id: number; event_id: string; type: ResetEvent['type']; label: string; status: ResetEvent['status']
  title: string; scope: string; created_at: string; updated_at: string; confirmed_at: string | null
  occurred_on: string | null; confirmation_basis: ResetEvent['confirmationBasis']; schedule_json: string | null
  posts_json: string; event_url: string; source: string; first_observed_at: string
  notification_status: NotificationStatus; notification_sent_at: string | null; notification_attempts: number
}

const encodeCursor = (rowId: number): string => Buffer.from(String(rowId)).toString('base64url')
const decodeCursor = (cursor?: string): number | null => {
  if (!cursor) return null
  const value = Number(Buffer.from(cursor, 'base64url').toString())
  return Number.isInteger(value) && value > 0 ? value : null
}

export class MonitorDatabase {
  readonly raw: BetterSqlite3.Database
  constructor(path: string) {
    try { this.raw = new BetterSqlite3(path); migrate(this.raw) }
    catch (cause) {
      const detail = cause instanceof Error ? ` (${cause.message})` : ''
      throw new StorageError(`Could not open monitor database: ${path}${detail}`, { cause })
    }
  }

  close(): void { if (this.raw.open) this.raw.close() }
  metadata(key: string): string | null {
    return (this.raw.prepare('SELECT value FROM metadata WHERE key = ?').get(key) as { value: string } | undefined)?.value ?? null
  }
  setMetadata(key: string, value: string): void {
    this.raw.prepare('INSERT INTO metadata(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, value)
  }
  deleteMetadata(key: string): void { this.raw.prepare('DELETE FROM metadata WHERE key=?').run(key) }

  getSettings(defaults: MonitorSettings): MonitorSettings {
    const rows = this.raw.prepare('SELECT key,value_json FROM settings').all() as { key: string; value_json: string }[]
    const saved = Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value_json)]))
    return {
      enabled: typeof saved.enabled === 'boolean' ? saved.enabled : defaults.enabled,
      intervalMinutes: [5, 15, 30, 60].includes(saved.intervalMinutes as number) ? saved.intervalMinutes as MonitorSettings['intervalMinutes'] : defaults.intervalMinutes,
      notificationsEnabled: typeof saved.notificationsEnabled === 'boolean' ? saved.notificationsEnabled : defaults.notificationsEnabled,
      launchAtLogin: typeof saved.launchAtLogin === 'boolean' ? saved.launchAtLogin : defaults.launchAtLogin,
      closeToTray: typeof saved.closeToTray === 'boolean' ? saved.closeToTray : defaults.closeToTray,
    }
  }
  saveSettings(settings: MonitorSettings, now: string): void {
    const statement = this.raw.prepare(`INSERT INTO settings(key,value_json,updated_at) VALUES(?,?,?)
      ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`)
    this.raw.transaction(() => { for (const [key, value] of Object.entries(settings)) statement.run(key, JSON.stringify(value), now) })()
  }

  syncEvents(input: { events: ResetEvent[]; source: string; observedAt: string; baseline: boolean; notificationsEnabled: boolean }): {
    newCount: number; changedCount: number; signals: HistoryRecord[]
  } {
    return this.raw.transaction(() => {
      const select = this.raw.prepare('SELECT status,type FROM reset_events WHERE event_id=?')
      const upsert = this.raw.prepare(`INSERT INTO reset_events(event_id,type,label,status,title,scope,created_at,updated_at,
        confirmed_at,occurred_on,confirmation_basis,schedule_json,posts_json,event_url,source,first_observed_at,
        notification_status,notification_sent_at,notification_error,notification_attempts)
        VALUES(@eventId,@type,@label,@status,@title,@scope,@createdAt,@updatedAt,@confirmedAt,@occurredOn,
        @confirmationBasis,@schedule,@posts,@url,@source,@observedAt,@notificationStatus,NULL,NULL,@attempts)
        ON CONFLICT(event_id) DO UPDATE SET type=excluded.type,label=excluded.label,status=excluded.status,title=excluded.title,
        scope=excluded.scope,created_at=excluded.created_at,updated_at=excluded.updated_at,confirmed_at=excluded.confirmed_at,
        occurred_on=excluded.occurred_on,confirmation_basis=excluded.confirmation_basis,schedule_json=excluded.schedule_json,
        posts_json=excluded.posts_json,event_url=excluded.event_url,source=excluded.source,
        notification_status=CASE WHEN @meaningfulChange=1 THEN excluded.notification_status ELSE reset_events.notification_status END,
        notification_sent_at=CASE WHEN @meaningfulChange=1 THEN NULL ELSE reset_events.notification_sent_at END,
        notification_error=CASE WHEN @meaningfulChange=1 THEN NULL ELSE reset_events.notification_error END,
        notification_attempts=CASE WHEN @meaningfulChange=1 THEN excluded.notification_attempts ELSE reset_events.notification_attempts END`)
      const incoming = new Set(input.events.map((event) => event.id))
      let newCount = 0; let changedCount = 0; const signalIds: string[] = []
      for (const event of input.events) {
        const previous = select.get(event.id) as { status: string; type: string } | undefined
        const isNew = !previous
        const meaningfulChange = Boolean(previous && (previous.status !== event.status || previous.type !== event.type))
        if (isNew) newCount += 1
        if (meaningfulChange) changedCount += 1
        const shouldNotify = input.notificationsEnabled && !input.baseline && (isNew || meaningfulChange)
        upsert.run({ ...event, eventId: event.id, schedule: event.schedule ? JSON.stringify(event.schedule) : null,
          posts: JSON.stringify(event.posts), source: input.source, observedAt: input.observedAt,
          notificationStatus: shouldNotify ? 'pending' : 'suppressed', attempts: shouldNotify ? 1 : 0,
          meaningfulChange: Number(meaningfulChange) })
        if (shouldNotify) signalIds.push(event.id)
      }
      const existing = this.raw.prepare('SELECT event_id FROM reset_events').all() as { event_id: string }[]
      const remove = this.raw.prepare('DELETE FROM reset_events WHERE event_id=?')
      for (const row of existing) if (!incoming.has(row.event_id)) remove.run(row.event_id)
      return { newCount, changedCount, signals: signalIds.map((id) => this.getEvent(id)!).filter(Boolean) }
    })()
  }

  markNotification(recordId: string, sent: boolean, sentAt: string | null, error: string | null): void {
    const result = this.raw.prepare(`UPDATE reset_events SET notification_status=?,notification_sent_at=?,notification_error=? WHERE event_id=?`)
      .run(sent ? 'sent' : 'failed', sent ? sentAt : null, sent ? null : error, recordId)
    if (!result.changes) throw new StorageError(`History record does not exist: ${recordId}`)
  }
  claimPendingNotifications(now: string): HistoryRecord[] {
    return this.raw.transaction(() => {
      const cutoff = new Date(new Date(now).getTime() - 24 * 60 * 60 * 1000).toISOString()
      this.raw.prepare(`UPDATE reset_events SET notification_status='suppressed'
        WHERE notification_status='pending' AND (first_observed_at < ? OR notification_attempts >= 2)`).run(cutoff)
      const rows = this.raw.prepare(`${this.eventSelect()} WHERE notification_status='pending' ORDER BY rowid`).all() as EventRow[]
      const update = this.raw.prepare('UPDATE reset_events SET notification_attempts=notification_attempts+1 WHERE event_id=?')
      for (const row of rows) update.run(row.event_id)
      return rows.map((row) => this.toRecord(row))
    })()
  }

  updateSource(url: string, attemptedAt: string, success: boolean, error?: string): void {
    this.raw.prepare(`INSERT INTO source_health(url,last_attempt_at,last_success_at,last_error) VALUES(?,?,?,?)
      ON CONFLICT(url) DO UPDATE SET last_attempt_at=excluded.last_attempt_at,
      last_success_at=CASE WHEN excluded.last_error IS NULL THEN excluded.last_attempt_at ELSE source_health.last_success_at END,
      last_error=excluded.last_error`).run(url, attemptedAt, success ? attemptedAt : null, success ? null : error ?? 'Unknown source error')
  }
  sourceHealth(urls: string[]): SourceHealth[] {
    const statement = this.raw.prepare('SELECT * FROM source_health WHERE url=?')
    return urls.map((url) => {
      const row = statement.get(url) as any
      return { url, host: new URL(url).hostname, ok: Boolean(row?.last_success_at && !row?.last_error),
        lastAttemptAt: row?.last_attempt_at ?? null, lastSuccessAt: row?.last_success_at ?? null, lastError: row?.last_error ?? null }
    })
  }

  listHistory(query: HistoryQuery = {}): HistoryPage {
    const limit = Math.min(200, Math.max(1, query.limit ?? 50)); const clauses: string[] = []; const params: unknown[] = []
    if (query.type) { clauses.push('type=?'); params.push(query.type) }
    if (query.status) { clauses.push('status=?'); params.push(query.status) }
    const cursor = decodeCursor(query.cursor)
    if (query.cursor && cursor === null) throw new StorageError('Invalid history cursor')
    if (cursor) { clauses.push('rowid<?'); params.push(cursor) }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const rows = this.raw.prepare(`${this.eventSelect()} ${where} ORDER BY created_at DESC,rowid DESC LIMIT ?`).all(...params, limit + 1) as EventRow[]
    const hasMore = rows.length > limit; const selected = rows.slice(0, limit)
    return { items: selected.map((row) => this.toRecord(row)), nextCursor: hasMore ? encodeCursor(selected.at(-1)!.row_id) : null }
  }
  latestRelevant(): HistoryRecord | null { return this.listHistory({ limit: 1 }).items[0] ?? null }

  private getEvent(id: string): HistoryRecord | null {
    const row = this.raw.prepare(`${this.eventSelect()} WHERE event_id=?`).get(id) as EventRow | undefined
    return row ? this.toRecord(row) : null
  }
  private eventSelect(): string { return `SELECT rowid row_id,* FROM reset_events` }
  private toRecord(row: EventRow): HistoryRecord {
    return { id: row.event_id, observedAt: row.first_observed_at, source: row.source, notificationSentAt: row.notification_sent_at,
      event: { id: row.event_id, type: row.type, label: row.label, status: row.status, title: row.title, scope: row.scope,
        createdAt: row.created_at, updatedAt: row.updated_at, confirmedAt: row.confirmed_at, occurredOn: row.occurred_on,
        confirmationBasis: row.confirmation_basis, schedule: row.schedule_json ? JSON.parse(row.schedule_json) : null,
        posts: JSON.parse(row.posts_json), url: row.event_url } }
  }
}

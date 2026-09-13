import type { CheckResult, HistoryPage, HistoryQuery, HistoryRecord, MonitorSettings, MonitorSnapshot } from '../shared/domain'
import { fetchCodexResets } from './api/fetchCodexResets'
import { parseCodexResets } from './api/parseCodexResets'
import type { HostLookup } from './api/validateUrl'
import { DEFAULT_SETTINGS } from './config/defaults'
import { AIHOT_CODEX_RESETS_URL } from './config/sources'
import type { EngineInitOptions, MonitorEngine } from './contracts'
import { SourceHttpError } from './errors'
import { MonitorDatabase } from './storage/database'

type Events = { signal: (record: HistoryRecord) => void; snapshot: (snapshot: MonitorSnapshot) => void }

function validateSettings(settings: MonitorSettings): void {
  if (![5, 15, 30, 60].includes(settings.intervalMinutes)) throw new TypeError('intervalMinutes must be 5, 15, 30, or 60')
}

export class DefaultMonitorEngine implements MonitorEngine {
  private database: MonitorDatabase | null = null
  private now: () => Date = () => new Date()
  private fetchImpl: typeof fetch = globalThis.fetch
  private resolveHost: HostLookup | null | undefined
  private checking: Promise<CheckResult> | null = null
  private recoveredPending = false
  private listeners: { [K in keyof Events]: Set<Events[K]> } = { signal: new Set(), snapshot: new Set() }

  async initialize(options: EngineInitOptions): Promise<void> {
    if (this.database) throw new Error('Monitor engine is already initialized')
    this.now = options.now ?? (() => new Date()); this.fetchImpl = options.fetchImpl ?? globalThis.fetch; this.resolveHost = options.resolveHost
    this.database = new MonitorDatabase(options.databasePath)
    const settings = this.database.getSettings(DEFAULT_SETTINGS); validateSettings(settings)
    this.database.saveSettings(settings, this.now().toISOString())
  }

  checkNow(): Promise<CheckResult> {
    this.assertInitialized()
    if (!this.checking) this.checking = this.performCheck().finally(() => { this.checking = null })
    return this.checking
  }

  private async performCheck(): Promise<CheckResult> {
    const db = this.getDatabase(); const settings = db.getSettings(DEFAULT_SETTINGS)
    this.recoverPendingSignals(); this.emit('snapshot', this.buildSnapshot('checking'))
    const checkedAt = this.now().toISOString()
    const retryAt = db.metadata('retry_after_at')
    if (retryAt && Date.parse(retryAt) > this.now().getTime()) {
      const error = `AIHOT 请求暂缓至 ${retryAt}`
      db.setMetadata('last_check_at', checkedAt); db.setMetadata('last_error', error)
      const snapshot = this.buildSnapshot('error'); this.emit('snapshot', snapshot)
      return { ok: false, checkedAt, fetchedCount: 0, newCount: 0, relevantCount: 0, snapshot, error }
    }
    try {
      const fetched = await fetchCodexResets(AIHOT_CODEX_RESETS_URL, {
        fetchImpl: this.fetchImpl, resolveHost: this.resolveHost, etag: db.metadata('aihot_etag'),
      })
      db.updateSource(AIHOT_CODEX_RESETS_URL, checkedAt, true)
      db.deleteMetadata('retry_after_at')
      if (fetched.body === null) {
        db.setMetadata('last_check_at', checkedAt); db.setMetadata('last_error', '')
        const snapshot = this.buildSnapshot(settings.enabled ? 'running' : 'paused'); this.emit('snapshot', snapshot)
        return { ok: true, checkedAt, fetchedCount: 0, newCount: 0, relevantCount: 0, snapshot }
      }
      const response = parseCodexResets(fetched.body)
      const baseline = db.metadata('aihot_initialized_at') === null
      const synced = db.syncEvents({ events: response.events, source: fetched.finalUrl, observedAt: checkedAt,
        baseline, notificationsEnabled: settings.notificationsEnabled })
      if (baseline) db.setMetadata('aihot_initialized_at', checkedAt)
      if (fetched.etag) db.setMetadata('aihot_etag', fetched.etag)
      if (response.checkedAt) db.setMetadata('aihot_checked_at', response.checkedAt)
      db.setMetadata('last_check_at', checkedAt); db.setMetadata('last_error', '')
      const snapshot = this.buildSnapshot(settings.enabled ? 'running' : 'paused')
      for (const record of synced.signals) this.emit('signal', record)
      this.emit('snapshot', snapshot)
      return { ok: true, checkedAt, fetchedCount: response.count, newCount: synced.newCount,
        relevantCount: synced.newCount + synced.changedCount, snapshot }
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      if (error instanceof SourceHttpError && error.retryAfterSeconds) {
        db.setMetadata('retry_after_at', new Date(this.now().getTime() + error.retryAfterSeconds * 1000).toISOString())
      }
      db.updateSource(AIHOT_CODEX_RESETS_URL, checkedAt, false, message)
      db.setMetadata('last_check_at', checkedAt); db.setMetadata('last_error', message)
      const snapshot = this.buildSnapshot('error'); this.emit('snapshot', snapshot)
      return { ok: false, checkedAt, fetchedCount: 0, newCount: 0, relevantCount: 0, snapshot, error: message }
    }
  }

  async getSnapshot(): Promise<MonitorSnapshot> { this.assertInitialized(); return this.buildSnapshot() }
  async listHistory(query?: HistoryQuery): Promise<HistoryPage> { return this.getDatabase().listHistory(query) }
  async getSettings(): Promise<MonitorSettings> { return this.getDatabase().getSettings(DEFAULT_SETTINGS) }
  async updateSettings(patch: Partial<MonitorSettings>): Promise<MonitorSettings> {
    const db = this.getDatabase(); const updated = { ...db.getSettings(DEFAULT_SETTINGS), ...patch }; validateSettings(updated)
    db.saveSettings(updated, this.now().toISOString()); this.emit('snapshot', this.buildSnapshot(updated.enabled ? 'running' : 'paused'))
    return updated
  }
  async markNotificationResult(recordId: string, result: { sent: boolean; sentAt?: string; error?: string }): Promise<void> {
    this.getDatabase().markNotification(recordId, result.sent, result.sent ? result.sentAt ?? this.now().toISOString() : null, result.error ?? null)
    this.emit('snapshot', this.buildSnapshot())
  }
  async close(): Promise<void> {
    if (!this.database) return
    await this.checking; this.database.close(); this.database = null
    this.listeners.signal.clear(); this.listeners.snapshot.clear()
  }
  on<K extends keyof Events>(event: K, listener: Events[K]): () => void {
    const listeners = this.listeners[event] as Set<Events[K]>; listeners.add(listener); return () => listeners.delete(listener)
  }

  private buildSnapshot(status?: MonitorSnapshot['status']): MonitorSnapshot {
    const db = this.getDatabase(), settings = db.getSettings(DEFAULT_SETTINGS)
    const lastCheckAt = db.metadata('last_check_at'); const lastError = db.metadata('last_error') || null
    return {
      status: status ?? (lastError ? 'error' : settings.enabled ? 'running' : 'paused'), lastCheckAt,
      nextCheckAt: settings.enabled && lastCheckAt ? new Date(Date.parse(lastCheckAt) + settings.intervalMinutes * 60_000).toISOString() : null,
      upstreamCheckedAt: db.metadata('aihot_checked_at'), latestRelevant: db.latestRelevant(),
      sourceHealth: db.sourceHealth([AIHOT_CODEX_RESETS_URL]), lastError,
    }
  }
  private emit<K extends keyof Events>(event: K, value: Parameters<Events[K]>[0]): void {
    for (const listener of [...this.listeners[event]]) { try { (listener as (input: typeof value) => void)(value) } catch { /* isolate consumers */ } }
  }
  private recoverPendingSignals(): void {
    if (this.recoveredPending || this.listeners.signal.size === 0) return
    this.recoveredPending = true
    for (const record of this.getDatabase().claimPendingNotifications(this.now().toISOString())) this.emit('signal', record)
  }
  private getDatabase(): MonitorDatabase { this.assertInitialized(); return this.database! }
  private assertInitialized(): void { if (!this.database) throw new Error('Monitor engine is not initialized') }
}

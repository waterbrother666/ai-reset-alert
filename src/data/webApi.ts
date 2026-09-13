import type {
  AppApi, CheckResult, HistoryPage, HistoryQuery, HistoryRecord, MonitorSnapshot, ResetEvent,
} from './domain'

const API_URL = 'https://aihot.news/api/v1/codex-resets'
const CHECK_INTERVAL_MS = 5 * 60_000

interface ApiResponse {
  schemaVersion: 1
  timezone: 'Asia/Shanghai'
  checkedAt: string | null
  count: number
  events: ResetEvent[]
}

const isDate = (value: unknown): value is string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value))

function isEvent(value: unknown): value is ResetEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Partial<ResetEvent>
  return typeof event.id === 'string' &&
    ['direct_reset', 'reset_credit'].includes(event.type ?? '') &&
    ['announced', 'confirmed'].includes(event.status ?? '') &&
    typeof event.title === 'string' && isDate(event.createdAt) &&
    isDate(event.updatedAt) && Array.isArray(event.posts) &&
    event.posts.every((post) => typeof post?.id === 'string' &&
      typeof post.text === 'string' && typeof post.originalText === 'string' &&
      isDate(post.publishedAt) && /^https:\/\/(?:x\.com|twitter\.com)\//.test(post.url))
}

function parseResponse(value: unknown): ApiResponse {
  if (!value || typeof value !== 'object') throw new Error('AIHOT 返回的不是有效对象')
  const response = value as Partial<ApiResponse>
  if (response.schemaVersion !== 1 || response.timezone !== 'Asia/Shanghai') {
    throw new Error('AIHOT 接口版本不受支持')
  }
  if (!Array.isArray(response.events) || !response.events.every(isEvent) ||
      response.count !== response.events.length) {
    throw new Error('AIHOT 事件数据格式无效')
  }
  return response as ApiResponse
}

class BrowserApi implements AppApi {
  private events: ResetEvent[] = []
  private etag: string | null = null
  private lastCheckAt: string | null = null
  private upstreamCheckedAt: string | null = null
  private lastError: string | null = null
  private loading: Promise<CheckResult> | null = null
  private snapshotListeners = new Set<(snapshot: MonitorSnapshot) => void>()
  private signalListeners = new Set<(record: HistoryRecord) => void>()

  async getSnapshot(): Promise<MonitorSnapshot> {
    if (!this.lastCheckAt) await this.fetchEvents()
    return this.snapshot()
  }

  checkNow(): Promise<CheckResult> {
    return this.fetchEvents()
  }

  async listHistory(query: HistoryQuery = {}): Promise<HistoryPage> {
    if (!this.lastCheckAt) await this.fetchEvents()
    const limit = Math.min(200, Math.max(1, query.limit ?? 50))
    const items = this.records().filter(({ event }) =>
      (!query.type || event.type === query.type) &&
      (!query.status || event.status === query.status))
    return { items: items.slice(0, limit), nextCursor: null }
  }

  async openPost(url: string): Promise<void> {
    if (!/^https:\/\/(?:x\.com|twitter\.com|aihot\.news)\//.test(url)) {
      throw new Error('不允许打开此链接')
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  onSnapshotChanged(listener: (snapshot: MonitorSnapshot) => void): () => void {
    this.snapshotListeners.add(listener)
    return () => this.snapshotListeners.delete(listener)
  }

  onSignalDetected(listener: (record: HistoryRecord) => void): () => void {
    this.signalListeners.add(listener)
    return () => this.signalListeners.delete(listener)
  }

  private fetchEvents(): Promise<CheckResult> {
    if (this.loading) return this.loading
    this.loading = this.performFetch().finally(() => { this.loading = null })
    return this.loading
  }

  private async performFetch(): Promise<CheckResult> {
    const checkedAt = new Date().toISOString()
    const previous = new Map(this.events.map((event) => [event.id, event.status]))
    try {
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (this.etag) headers['If-None-Match'] = this.etag
      const response = await fetch(API_URL, { headers, cache: 'no-cache' })
      if (response.status === 304) {
        this.lastCheckAt = checkedAt
        this.lastError = null
        return this.finishCheck(checkedAt, this.events.length, 0, 0)
      }
      if (!response.ok) throw new Error(`AIHOT 返回 HTTP ${response.status}`)
      const parsed = parseResponse(await response.json())
      const changed = parsed.events.filter((event) =>
        previous.has(event.id) && previous.get(event.id) !== event.status)
      const added = parsed.events.filter((event) => !previous.has(event.id))
      this.events = [...parsed.events].sort((a, b) =>
        Date.parse(b.createdAt) - Date.parse(a.createdAt))
      this.etag = response.headers.get('etag') ?? this.etag
      this.lastCheckAt = checkedAt
      this.upstreamCheckedAt = parsed.checkedAt
      this.lastError = null
      const result = this.finishCheck(checkedAt, parsed.count, added.length,
        added.length + changed.length)
      if (previous.size > 0) {
        const changedIds = new Set([...added, ...changed].map((event) => event.id))
        this.records().filter((record) => changedIds.has(record.id)).forEach((record) =>
          this.signalListeners.forEach((listener) => listener(record)))
      }
      return result
    } catch (cause) {
      this.lastCheckAt = checkedAt
      this.lastError = cause instanceof Error ? cause.message : String(cause)
      const snapshot = this.snapshot()
      this.snapshotListeners.forEach((listener) => listener(snapshot))
      if (!this.events.length) throw cause
      return { ok: false, checkedAt, fetchedCount: 0, newCount: 0,
        relevantCount: 0, snapshot, error: this.lastError }
    }
  }

  private finishCheck(checkedAt: string, fetchedCount: number, newCount: number,
    relevantCount: number): CheckResult {
    const snapshot = this.snapshot()
    this.snapshotListeners.forEach((listener) => listener(snapshot))
    return { ok: true, checkedAt, fetchedCount, newCount, relevantCount, snapshot }
  }

  private records(): HistoryRecord[] {
    return this.events.map((event) => ({ id: event.id,
      observedAt: this.lastCheckAt ?? event.updatedAt, source: API_URL,
      notificationSentAt: null, event }))
  }

  private snapshot(): MonitorSnapshot {
    const ok = Boolean(this.lastCheckAt && !this.lastError)
    return {
      status: this.lastError ? 'error' : 'running',
      lastCheckAt: this.lastCheckAt,
      nextCheckAt: this.lastCheckAt
        ? new Date(Date.parse(this.lastCheckAt) + CHECK_INTERVAL_MS).toISOString() : null,
      upstreamCheckedAt: this.upstreamCheckedAt,
      latestRelevant: this.records()[0] ?? null,
      sourceHealth: [{ url: API_URL, host: 'aihot.news', ok,
        lastAttemptAt: this.lastCheckAt, lastSuccessAt: ok ? this.lastCheckAt : null,
        lastError: this.lastError }],
      lastError: this.lastError,
    }
  }
}

export function createBrowserApi(): AppApi {
  return new BrowserApi()
}

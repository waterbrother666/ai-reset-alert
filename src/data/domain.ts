export type ResetEventType = 'direct_reset' | 'reset_credit'
export type ResetEventStatus = 'announced' | 'confirmed'

export interface ResetSchedule {
  precision: 'exact' | 'approximate' | 'deadline' | 'date' | 'window'
  from: string
  through: string
  label: string
}

export interface ResetPost {
  id: string
  publishedAt: string
  stage: string
  text: string
  originalText: string
  url: string
}

export interface ResetEvent {
  id: string
  type: ResetEventType
  label: string
  status: ResetEventStatus
  title: string
  scope: string
  createdAt: string
  updatedAt: string
  confirmedAt: string | null
  occurredOn: string | null
  confirmationBasis: 'source_post' | 'receipt_review' | null
  schedule: ResetSchedule | null
  posts: ResetPost[]
  url: string
}

export interface HistoryRecord {
  id: string
  observedAt: string
  source: string
  notificationSentAt: string | null
  event: ResetEvent
}

export interface SourceHealth {
  url: string
  host: string
  ok: boolean
  lastAttemptAt: string | null
  lastSuccessAt: string | null
  lastError: string | null
}

export interface MonitorSnapshot {
  status: 'running' | 'checking' | 'error'
  lastCheckAt: string | null
  nextCheckAt: string | null
  upstreamCheckedAt: string | null
  latestRelevant: HistoryRecord | null
  sourceHealth: SourceHealth[]
  lastError: string | null
}

export interface CheckResult {
  ok: boolean
  checkedAt: string
  fetchedCount: number
  newCount: number
  relevantCount: number
  snapshot: MonitorSnapshot
  error?: string
}

export interface HistoryQuery {
  type?: ResetEventType
  status?: ResetEventStatus
  limit?: number
}

export interface HistoryPage {
  items: HistoryRecord[]
  nextCursor: string | null
}

export interface AppApi {
  getSnapshot(): Promise<MonitorSnapshot>
  checkNow(): Promise<CheckResult>
  listHistory(query?: HistoryQuery): Promise<HistoryPage>
  openPost(url: string): Promise<void>
  onSnapshotChanged(listener: (snapshot: MonitorSnapshot) => void): () => void
  onSignalDetected(listener: (record: HistoryRecord) => void): () => void
}

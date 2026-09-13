export type ResetEventType = 'direct_reset' | 'reset_credit'
export type ResetEventStatus = 'announced' | 'confirmed'
export type ConfirmationBasis = 'source_post' | 'receipt_review' | null

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
  confirmationBasis: ConfirmationBasis
  schedule: ResetSchedule | null
  posts: ResetPost[]
  url: string
}

export interface HistoryRecord {
  id: string
  observedAt: string
  source: string
  event: ResetEvent
  notificationSentAt: string | null
}

export interface MonitorSettings {
  enabled: boolean
  intervalMinutes: 5 | 15 | 30 | 60
  notificationsEnabled: boolean
  launchAtLogin: boolean
  closeToTray: boolean
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
  status: 'running' | 'paused' | 'checking' | 'error'
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
  cursor?: string
  limit?: number
}

export interface HistoryPage {
  items: HistoryRecord[]
  nextCursor: string | null
}

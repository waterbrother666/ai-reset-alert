import type {
  CheckResult,
  HistoryPage,
  HistoryQuery,
  HistoryRecord,
  MonitorSettings,
  MonitorSnapshot,
} from '../shared/domain'

export interface EngineInitOptions {
  databasePath: string
  now?: () => Date
  fetchImpl?: typeof fetch
  /** null delegates DNS resolution to a trusted proxy-aware transport after host allowlisting. */
  resolveHost?: ((hostname: string) => Promise<string[]>) | null
}

export interface MonitorEngine {
  initialize(options: EngineInitOptions): Promise<void>
  checkNow(): Promise<CheckResult>
  getSnapshot(): Promise<MonitorSnapshot>
  listHistory(query?: HistoryQuery): Promise<HistoryPage>
  getSettings(): Promise<MonitorSettings>
  updateSettings(patch: Partial<MonitorSettings>): Promise<MonitorSettings>
  markNotificationResult(
    recordId: string,
    result: { sent: boolean; sentAt?: string; error?: string },
  ): Promise<void>
  close(): Promise<void>
  on(event: 'signal', listener: (record: HistoryRecord) => void): () => void
  on(event: 'snapshot', listener: (snapshot: MonitorSnapshot) => void): () => void
}

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'suppressed'

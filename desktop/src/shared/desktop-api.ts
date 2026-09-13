import type {
  CheckResult,
  HistoryPage,
  HistoryQuery,
  HistoryRecord,
  MonitorSettings,
  MonitorSnapshot,
} from './domain'

export const IPC_CHANNELS = {
  getSnapshot: 'monitor:getSnapshot',
  checkNow: 'monitor:checkNow',
  setEnabled: 'monitor:setEnabled',
  listHistory: 'monitor:listHistory',
  getSettings: 'settings:get',
  updateSettings: 'settings:update',
  testNotification: 'system:testNotification',
  openPost: 'system:openPost',
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggleMaximize',
  windowClose: 'window:close',
  windowIsMaximized: 'window:isMaximized',
  windowMaximizedChanged: 'window:maximizedChanged',
  snapshotChanged: 'monitor:snapshotChanged',
  signalDetected: 'monitor:signalDetected',
  openRecord: 'navigation:openRecord',
} as const

export interface DesktopApi {
  getSnapshot(): Promise<MonitorSnapshot>
  checkNow(): Promise<CheckResult>
  setMonitoring(enabled: boolean): Promise<MonitorSnapshot>
  getSettings(): Promise<MonitorSettings>
  updateSettings(patch: Partial<MonitorSettings>): Promise<MonitorSettings>
  listHistory(query?: HistoryQuery): Promise<HistoryPage>
  testNotification(): Promise<{ ok: boolean; error?: string }>
  openPost(url: string): Promise<void>
  minimizeWindow(): Promise<void>
  toggleMaximizeWindow(): Promise<boolean>
  closeWindow(): Promise<void>
  isWindowMaximized(): Promise<boolean>
  onWindowMaximizedChanged(listener: (maximized: boolean) => void): () => void
  onSnapshotChanged(listener: (snapshot: MonitorSnapshot) => void): () => void
  onSignalDetected(listener: (record: HistoryRecord) => void): () => void
  onOpenRecord(listener: (recordId: string) => void): () => void
}

import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopApi } from '../shared/desktop-api'
import { IPC_CHANNELS } from '../shared/desktop-api'
import type { HistoryQuery, HistoryRecord, MonitorSettings, MonitorSnapshot } from '../shared/domain'

const subscribe = <T>(channel: string, listener: (value: T) => void): (() => void) => {
  const wrapped = (_event: Electron.IpcRendererEvent, value: T): void => listener(value)
  ipcRenderer.on(channel, wrapped)
  return () => ipcRenderer.removeListener(channel, wrapped)
}

const desktopApi: DesktopApi = Object.freeze({
  getSnapshot: () => ipcRenderer.invoke(IPC_CHANNELS.getSnapshot),
  checkNow: () => ipcRenderer.invoke(IPC_CHANNELS.checkNow),
  setMonitoring: (enabled: boolean) => ipcRenderer.invoke(IPC_CHANNELS.setEnabled, enabled),
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.getSettings),
  updateSettings: (patch: Partial<MonitorSettings>) => ipcRenderer.invoke(IPC_CHANNELS.updateSettings, patch),
  listHistory: (query?: HistoryQuery) => ipcRenderer.invoke(IPC_CHANNELS.listHistory, query),
  testNotification: () => ipcRenderer.invoke(IPC_CHANNELS.testNotification),
  openPost: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.openPost, url),
  minimizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.windowMinimize),
  toggleMaximizeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.windowToggleMaximize),
  closeWindow: () => ipcRenderer.invoke(IPC_CHANNELS.windowClose),
  isWindowMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.windowIsMaximized),
  onWindowMaximizedChanged: (listener: (maximized: boolean) => void) => subscribe(IPC_CHANNELS.windowMaximizedChanged, listener),
  onSnapshotChanged: (listener: (snapshot: MonitorSnapshot) => void) => subscribe(IPC_CHANNELS.snapshotChanged, listener),
  onSignalDetected: (listener: (record: HistoryRecord) => void) => subscribe(IPC_CHANNELS.signalDetected, listener),
  onOpenRecord: (listener: (recordId: string) => void) => subscribe(IPC_CHANNELS.openRecord, listener),
})

contextBridge.exposeInMainWorld('desktopApi', desktopApi)

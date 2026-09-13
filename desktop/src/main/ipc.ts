import { ipcMain, shell } from 'electron'
import type { BrowserWindow } from 'electron'
import type { MonitorEngine } from '../monitor/contracts'
import { IPC_CHANNELS } from '../shared/desktop-api'
import type { NativeNotifications } from './notifications'
import type { MonitorScheduler } from './scheduler'
import { requireBoolean, requireHistoryQuery, requirePostUrl, requireSettingsPatch } from './validation'

export function registerIpc(
  engine: MonitorEngine,
  scheduler: MonitorScheduler,
  notifications: NativeNotifications,
  window: () => BrowserWindow | null,
): () => void {
  const channels = Object.values(IPC_CHANNELS).filter((channel) =>
    !channel.endsWith('Changed') && !channel.endsWith('Detected') && channel !== IPC_CHANNELS.openRecord)
  ipcMain.handle(IPC_CHANNELS.getSnapshot, () => engine.getSnapshot())
  ipcMain.handle(IPC_CHANNELS.checkNow, () => scheduler.check())
  ipcMain.handle(IPC_CHANNELS.setEnabled, async (_event, value) => {
    await engine.updateSettings({ enabled: requireBoolean(value, 'enabled') }); await scheduler.reschedule(); return engine.getSnapshot()
  })
  ipcMain.handle(IPC_CHANNELS.listHistory, (_event, query) => engine.listHistory(requireHistoryQuery(query)))
  ipcMain.handle(IPC_CHANNELS.getSettings, () => engine.getSettings())
  ipcMain.handle(IPC_CHANNELS.updateSettings, async (_event, raw) => {
    const patch = requireSettingsPatch(raw)
    const settings = await engine.updateSettings(patch); await scheduler.reschedule(); return settings
  })
  ipcMain.handle(IPC_CHANNELS.testNotification, () => notifications.test())
  ipcMain.handle(IPC_CHANNELS.openPost, async (_event, raw) => { await shell.openExternal(requirePostUrl(raw)) })
  ipcMain.handle(IPC_CHANNELS.windowMinimize, () => { window()?.minimize() })
  ipcMain.handle(IPC_CHANNELS.windowToggleMaximize, () => {
    const target = window()
    if (!target) return false
    if (target.isMaximized()) target.unmaximize()
    else target.maximize()
    return target.isMaximized()
  })
  ipcMain.handle(IPC_CHANNELS.windowClose, () => { window()?.close() })
  ipcMain.handle(IPC_CHANNELS.windowIsMaximized, () => window()?.isMaximized() ?? false)
  const offSnapshot = engine.on('snapshot', (snapshot) => window()?.webContents.send(IPC_CHANNELS.snapshotChanged, snapshot))
  const offSignal = engine.on('signal', (record) => window()?.webContents.send(IPC_CHANNELS.signalDetected, record))
  return () => { for (const channel of channels) ipcMain.removeHandler(channel); offSnapshot(); offSignal() }
}

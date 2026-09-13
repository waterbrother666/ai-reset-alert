import { app, BrowserWindow, dialog, Menu, net, powerMonitor, shell } from 'electron'
import { join } from 'node:path'
import { createMonitorEngine } from '../monitor'
import type { MonitorSnapshot } from '../shared/domain'
import { IPC_CHANNELS } from '../shared/desktop-api'
import { registerIpc } from './ipc'
import { APP_NAME, WINDOWS_APP_ID } from './appIdentity'
import { AppLogger } from './logger'
import { NativeNotifications } from './notifications'
import { MonitorScheduler } from './scheduler'
import { AppTray } from './tray'

app.setName(APP_NAME)
if (process.platform === 'win32') app.setAppUserModelId(WINDOWS_APP_ID)

const hasSingleInstanceLock = app.requestSingleInstanceLock()
if (!hasSingleInstanceLock) app.quit()

let mainWindow: BrowserWindow | null = null
let tray: AppTray | null = null
let allowQuit = false
let closeToTray = true
let disposeIpc: (() => void) | null = null
const engine = createMonitorEngine()
const scheduler = new MonitorScheduler(engine)
let logger: AppLogger | null = null
const resourcesPath = join(__dirname, '../../resources')

function showWindow(): void {
  if (!mainWindow) createWindow()
  mainWindow?.show()
  if (mainWindow?.isMinimized()) mainWindow.restore()
  mainWindow?.focus()
}

function openRecord(recordId?: string): void {
  showWindow()
  if (!recordId || !mainWindow) return
  const send = () => mainWindow?.webContents.send(IPC_CHANNELS.openRecord, recordId)
  if (mainWindow.webContents.isLoading()) mainWindow.webContents.once('did-finish-load', send)
  else send()
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1060, height: 720, minWidth: 900, minHeight: 620, show: false,
    backgroundColor: '#000000', title: APP_NAME, icon: join(resourcesPath, 'icon.png'),
    frame: process.platform !== 'win32',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'), contextIsolation: true,
      nodeIntegration: false, sandbox: true, webSecurity: true, devTools: !app.isPackaged,
    },
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/(?:x\.com|twitter\.com|aihot\.news)\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('did-fail-load', (_event, code, description, url) => {
    logger?.error(`Renderer failed to load ${url} (${code})`, description)
  })
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logger?.error(`Renderer process exited: ${details.reason} (${details.exitCode})`)
  })
  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      void mainWindow?.webContents.executeJavaScript(`JSON.stringify({
        title: document.title,
        rootChildren: document.querySelector('#root')?.childElementCount ?? -1,
        textLength: document.body?.innerText?.length ?? -1,
        desktopApi: Boolean(window.desktopApi),
        hasResetContent: document.body?.innerText?.includes('Codex 额度重置已完成') ?? false
      })`).then((state) => logger?.info(`Renderer ready ${state}`))
        .catch((error) => logger?.error('Renderer diagnostic failed', error))
    }, 2_000)
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = process.env.ELECTRON_RENDERER_URL ? url.startsWith(process.env.ELECTRON_RENDERER_URL) : url.startsWith('file:')
    if (!allowed) event.preventDefault()
  })
  mainWindow.on('close', (event) => {
    if (!allowQuit && closeToTray) { event.preventDefault(); mainWindow?.hide() }
  })
  mainWindow.on('closed', () => { mainWindow = null })
  const sendMaximizedState = () => mainWindow?.webContents.send(IPC_CHANNELS.windowMaximizedChanged, mainWindow.isMaximized())
  mainWindow.on('maximize', sendMaximizedState)
  mainWindow.on('unmaximize', sendMaximizedState)
  mainWindow.once('ready-to-show', () => { if (!process.argv.includes('--hidden')) mainWindow?.show() })
  if (process.env.ELECTRON_RENDERER_URL) void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

async function shutdown(): Promise<void> {
  scheduler.stop(); disposeIpc?.(); tray?.destroy(); await engine.close(); logger?.info('Application stopped')
}

app.on('second-instance', () => showWindow())
app.on('activate', () => showWindow())
app.on('before-quit', () => { allowQuit = true })
app.on('will-quit', (event) => {
  if (!allowQuit) return
  event.preventDefault(); allowQuit = false
  void shutdown().finally(() => app.exit(0))
})

if (hasSingleInstanceLock) void app.whenReady().then(async () => {
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null)
  const activeLogger = new AppLogger(app.getPath('logs'))
  logger = activeLogger
  process.on('uncaughtException', (error) => activeLogger.error('Uncaught exception', error))
  process.on('unhandledRejection', (error) => activeLogger.error('Unhandled rejection', error))
  activeLogger.info('Application started')
  const proxyAwareFetch: typeof fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
    net.fetch(input as string, init as Parameters<typeof net.fetch>[1])) as typeof fetch
  try {
    await engine.initialize({
      databasePath: join(app.getPath('userData'), 'monitor.sqlite'),
      fetchImpl: proxyAwareFetch,
      // Chromium's network service applies the user's system proxy and may resolve DNS remotely.
      // URL scheme and host allowlisting are still enforced on every redirect.
      resolveHost: null,
    })
  }
  catch (error) {
    activeLogger.error('Database initialization failed', error)
    dialog.showErrorBox(`${APP_NAME} 无法启动`, error instanceof Error ? error.message : String(error))
    allowQuit = true; app.quit(); return
  }
  const settings = await engine.getSettings()
  closeToTray = settings.closeToTray
  if (app.isPackaged) {
    try { app.setLoginItemSettings({ openAtLogin: false }) }
    catch (error) { activeLogger.error('Legacy launch-at-login cleanup failed', error) }
  }
  if (settings.launchAtLogin) await engine.updateSettings({ launchAtLogin: false })
  createWindow()
  const notifications = new NativeNotifications(engine, join(resourcesPath, 'icon.png'), openRecord)
  disposeIpc = registerIpc(engine, scheduler, notifications, () => mainWindow)
  tray = new AppTray(
    () => mainWindow,
    engine,
    scheduler,
    resourcesPath,
    () => { allowQuit = true; app.quit() },
  )
  engine.on('signal', (record) => { void notifications.send(record) })
  engine.on('snapshot', (snapshot: MonitorSnapshot) => {
    tray?.update(snapshot)
    void engine.getSettings().then((current) => { closeToTray = current.closeToTray })
    activeLogger.info(`Monitor status=${snapshot.status}`)
  })
  powerMonitor.on('resume', () => { setTimeout(() => { void scheduler.check() }, 3_000) })
  powerMonitor.on('unlock-screen', async () => scheduler.checkIfOverdue((await engine.getSnapshot()).lastCheckAt))
  await scheduler.start()
}).catch((error) => {
  dialog.showErrorBox(`${APP_NAME} 无法启动`, error instanceof Error ? error.message : String(error)); app.exit(1)
})

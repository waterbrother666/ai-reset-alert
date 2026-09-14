import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Electron security boundary', () => {
  it('requests a single instance and enables secure BrowserWindow flags', () => {
    const source = readFileSync(new URL('../../src/main/index.ts', import.meta.url), 'utf8')
    expect(source).toContain('requestSingleInstanceLock()')
    expect(source).toContain('setAppUserModelId(WINDOWS_APP_ID)')
    expect(source).toContain('contextIsolation: true')
    expect(source).toContain('nodeIntegration: false')
    expect(source).toContain('sandbox: true')
    expect(source).toContain('frame: isMac')
  })
  it('preload exposes a fixed API without generic send access', () => {
    const source = readFileSync(new URL('../../src/preload/index.ts', import.meta.url), 'utf8')
    expect(source).toContain("exposeInMainWorld('desktopApi'")
    expect(source).not.toMatch(/ipcRenderer\.send\s*\(/)
    expect(source).not.toContain('exposeInMainWorld(\'ipcRenderer\'')
    expect(source).toContain('onOpenRecord:')
    expect(source).toContain('minimizeWindow:')
    expect(source).toContain('toggleMaximizeWindow:')
    expect(source).toContain('closeWindow:')
  })

  it('opens the app from notification and tray interactions', () => {
    const notifications = readFileSync(new URL('../../src/main/notifications.ts', import.meta.url), 'utf8')
    const tray = readFileSync(new URL('../../src/main/tray.ts', import.meta.url), 'utf8')
    expect(notifications).toContain("notification.on('click', () => this.activate(record.id))")
    expect(tray).toContain("this.tray.on('click', () => this.showWindow())")
    expect(tray).toContain("this.tray.on('right-click', () => this.togglePopover())")
    expect(tray).not.toContain('开机启动')
    expect(tray).not.toContain('模拟重置通知')
  })

  it('uses the native inset title bar and application menu on macOS', () => {
    const main = readFileSync(new URL('../../src/main/index.ts', import.meta.url), 'utf8')
    const menu = readFileSync(new URL('../../src/main/macMenu.ts', import.meta.url), 'utf8')
    expect(main).toContain("titleBarStyle: isMac ? 'hiddenInset' : 'default'")
    expect(main).toContain('installMacApplicationMenu()')
    expect(menu).toContain("role: 'quit'")
  })

  it('uses a native macOS popover and notification sound', () => {
    const tray = readFileSync(new URL('../../src/main/tray.ts', import.meta.url), 'utf8')
    const notifications = readFileSync(new URL('../../src/main/notifications.ts', import.meta.url), 'utf8')
    expect(tray).toContain("vibrancy: isMac ? 'popover' : undefined")
    expect(tray).toContain('visibleOnFullScreen: true')
    expect(notifications).toContain("sound: process.platform === 'darwin' ? 'default' : undefined")
  })

  it('loads the Tibo avatar from the packaged renderer directory', () => {
    const signalCard = readFileSync(new URL('../../../src/components/SignalCard.tsx', import.meta.url), 'utf8')
    expect(signalCard).toContain('src="./tibo-avatar.jpg"')
    expect(signalCard).not.toContain('src="/tibo-avatar.jpg"')
  })
})

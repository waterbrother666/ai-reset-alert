import { BrowserWindow, Tray, nativeImage, screen } from 'electron'
import { join } from 'node:path'
import type { MonitorEngine } from '../monitor/contracts'
import type { MonitorSnapshot } from '../shared/domain'
import type { MonitorScheduler } from './scheduler'
import { placeTrayPopover } from './trayPosition'

const POPOVER_WIDTH = 228
const POPOVER_HEIGHT = 196

export class AppTray {
  private tray: Tray
  private popover: BrowserWindow | null = null
  private snapshot: MonitorSnapshot | null = null

  constructor(
    private readonly window: () => BrowserWindow | null,
    private readonly engine: MonitorEngine,
    private readonly scheduler: MonitorScheduler,
    resourcesPath: string,
    private readonly quit: () => void,
  ) {
    const path = process.platform === 'darwin' ? join(resourcesPath, 'trayTemplate.png') : join(resourcesPath, 'tray.png')
    const image = nativeImage.createFromPath(path)
    if (process.platform === 'darwin') image.setTemplateImage(true)
    this.tray = new Tray(image)
    this.tray.setToolTip('ai-reset-alert')
    this.tray.on('click', () => this.showWindow())
    this.tray.on('right-click', () => this.togglePopover())
  }

  update(snapshot: MonitorSnapshot): void {
    this.snapshot = snapshot
    if (this.popover?.isVisible()) void this.renderPopover()
  }

  destroy(): void { this.popover?.destroy(); this.tray.destroy() }

  private showWindow(): void {
    const window = this.window()
    if (!window) return
    window.show()
    if (window.isMinimized()) window.restore()
    window.focus()
    this.popover?.hide()
  }

  private togglePopover(): void {
    const popover = this.ensurePopover()
    if (popover.isVisible()) { popover.hide(); return }
    void this.renderPopover().then(() => {
      popover.setBounds(this.popoverBounds(this.tray.getBounds()))
      popover.show()
      popover.focus()
    })
  }

  private ensurePopover(): BrowserWindow {
    if (this.popover && !this.popover.isDestroyed()) return this.popover
    const popover = new BrowserWindow({
      width: POPOVER_WIDTH, height: POPOVER_HEIGHT, show: false, frame: false,
      resizable: false, movable: false, minimizable: false, maximizable: false,
      fullscreenable: false, skipTaskbar: true, alwaysOnTop: true, backgroundColor: '#00000000',
      transparent: true,
      backgroundMaterial: 'none',
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, devTools: false },
    })
    popover.on('blur', () => popover.hide())
    popover.on('closed', () => { this.popover = null })
    popover.webContents.on('will-navigate', (event, url) => {
      if (!url.startsWith('aireset://')) return
      event.preventDefault()
      void this.handleAction(url.slice('aireset://'.length))
    })
    this.popover = popover
    return popover
  }

  private async handleAction(action: string): Promise<void> {
    this.popover?.hide()
    if (action === 'open') this.showWindow()
    else if (action === 'check') await this.scheduler.check()
    else if (action === 'toggle') {
      const paused = this.snapshot?.status === 'paused'
      await this.engine.updateSettings({ enabled: paused })
      await this.scheduler.reschedule()
    }
    else if (action === 'quit') this.quit()
  }

  private async renderPopover(): Promise<void> {
    const popover = this.ensurePopover()
    const status = this.snapshot?.status ?? 'running'
    const label = { running: '监控中', paused: '已暂停', checking: '正在检查', error: '检查失败' }[status]
    const statusClass = status === 'error' ? 'error' : status === 'paused' ? 'paused' : 'active'
    const toggleLabel = status === 'paused' ? '恢复监控' : '暂停监控'
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>
      *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent;color:#eff3f4;font-family:"Microsoft YaHei UI","Segoe UI",sans-serif}
      body{padding:0}.panel{height:100%;overflow:hidden;border:1px solid rgba(47,51,54,.88);border-radius:12px;background:linear-gradient(145deg,rgba(21,23,25,.78),rgba(13,14,15,.72));backdrop-filter:blur(22px) saturate(125%);-webkit-backdrop-filter:blur(22px) saturate(125%);box-shadow:0 14px 36px rgba(0,0,0,.55)}
      .status{display:flex;align-items:center;gap:7px;height:34px;padding:0 11px;border-bottom:1px solid #25282b;color:#aab8c2;font-size:11.5px}.dot{width:6px;height:6px;border-radius:50%;background:#eff3f4;box-shadow:0 0 7px rgba(239,243,244,.45)}.dot.error{background:#e66}.dot.paused{background:#71767b;box-shadow:none}
      .menu{padding:5px}.item{display:flex;align-items:center;height:34px;padding:0 12px;border-radius:8px;color:#eff3f4;text-decoration:none;font-size:12.5px;font-weight:650;transition:background .16s ease,transform .16s ease}.item:hover{background:rgba(36,39,42,.82);transform:translateX(1px)}
      .separator{height:1px;margin:5px 8px;background:rgba(47,51,54,.82)}.quit:hover{background:rgba(58,23,23,.82);color:#ffb4ab}
    </style></head><body><div class="panel">
      <div class="status"><span class="dot ${statusClass}"></span>${label}</div>
      <nav class="menu">
        <a class="item" href="aireset://open">打开应用</a>
        <a class="item" href="aireset://check">立即检查</a>
        <a class="item" href="aireset://toggle">${toggleLabel}</a>
        <div class="separator"></div>
        <a class="item quit" href="aireset://quit">退出</a>
      </nav>
    </div></body></html>`
    await popover.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  }

  private popoverBounds(trayBounds: Electron.Rectangle): Electron.Rectangle {
    const { workArea } = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y })
    return placeTrayPopover(trayBounds, workArea, POPOVER_WIDTH, POPOVER_HEIGHT)
  }
}

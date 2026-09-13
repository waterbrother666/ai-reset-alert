import { Notification, nativeImage, type NativeImage } from 'electron'
import type { HistoryRecord } from '../shared/domain'
import type { MonitorEngine } from '../monitor/contracts'

export class NativeNotifications {
  private readonly icon: NativeImage

  constructor(
    private readonly engine: MonitorEngine,
    iconPath: string,
    private readonly activate: (recordId?: string) => void,
  ) {
    this.icon = nativeImage.createFromPath(iconPath)
  }

  async send(record: HistoryRecord): Promise<void> {
    try {
      if (!Notification.isSupported()) throw new Error('System notifications are unavailable')
      const post = record.event.posts[0]
      const notification = new Notification({
        title: record.event.type === 'reset_credit'
          ? `Codex 重置卡${record.event.status === 'confirmed' ? '已确认' : '新预告'}`
          : `Codex 额度重置${record.event.status === 'confirmed' ? '已确认' : '新预告'}`,
        body: (post?.text || post?.originalText || record.event.title).slice(0, 240),
        icon: this.icon,
        silent: false,
        timeoutType: 'never',
        urgency: 'critical',
      })
      notification.on('click', () => this.activate(record.id))
      notification.show()
      await this.engine.markNotificationResult(record.id, { sent: true, sentAt: new Date().toISOString() })
    } catch (error) {
      await this.engine.markNotificationResult(record.id, {
        sent: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  test(): { ok: boolean; error?: string } {
    try {
      if (!Notification.isSupported()) return { ok: false, error: '系统通知不可用或尚未授权。' }
      const notification = new Notification({
        title: 'Codex 额度重置已确认',
        body: 'Tibo：Reset all propagated. 所有重置均已传播完毕。',
        icon: this.icon,
        silent: false,
        timeoutType: 'never',
        urgency: 'critical',
      })
      notification.on('click', () => this.activate())
      notification.show()
      return { ok: true }
    } catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) } }
  }
}

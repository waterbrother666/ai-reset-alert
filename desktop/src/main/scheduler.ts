import type { CheckResult, MonitorSettings } from '../shared/domain'

export interface SchedulerEngine {
  checkNow(): Promise<CheckResult>
  getSettings(): Promise<MonitorSettings>
}

export class MonitorScheduler {
  private timer: ReturnType<typeof setTimeout> | null = null
  private running: Promise<CheckResult> | null = null

  constructor(
    private readonly engine: SchedulerEngine,
    private readonly setTimer: typeof setTimeout = setTimeout,
    private readonly clearTimer: typeof clearTimeout = clearTimeout,
  ) {}

  async start(): Promise<CheckResult | null> {
    const settings = await this.engine.getSettings()
    if (!settings.enabled) return null
    return this.check()
  }

  check(): Promise<CheckResult> {
    if (this.running) return this.running
    this.cancelTimer()
    this.running = this.engine.checkNow().finally(async () => {
      this.running = null
      await this.scheduleNext()
    })
    return this.running
  }

  async reschedule(): Promise<void> {
    this.cancelTimer()
    if (!this.running) await this.scheduleNext()
  }

  stop(): void { this.cancelTimer() }

  async checkIfOverdue(lastCheckAt: string | null): Promise<CheckResult | null> {
    const settings = await this.engine.getSettings()
    if (!settings.enabled) return null
    if (!lastCheckAt || Date.now() - new Date(lastCheckAt).getTime() >= settings.intervalMinutes * 60_000) return this.check()
    return null
  }

  private async scheduleNext(): Promise<void> {
    const settings = await this.engine.getSettings()
    if (!settings.enabled) return
    this.timer = this.setTimer(() => { void this.check() }, settings.intervalMinutes * 60_000)
  }
  private cancelTimer(): void {
    if (this.timer) this.clearTimer(this.timer)
    this.timer = null
  }
}

import { describe, expect, it, vi } from 'vitest'
import type { CheckResult, MonitorSettings } from '../../src/shared/domain'
import { MonitorScheduler } from '../../src/main/scheduler'

const settings = (enabled = true, intervalMinutes: MonitorSettings['intervalMinutes'] = 30): MonitorSettings => ({
  enabled, intervalMinutes, notificationsEnabled: true, launchAtLogin: false, closeToTray: true,
})
const result = { ok: true } as CheckResult

describe('MonitorScheduler', () => {
  it('checks immediately and schedules only after completion', async () => {
    vi.useFakeTimers()
    let resolve!: (value: CheckResult) => void
    const checkNow = vi.fn(() => new Promise<CheckResult>((done) => { resolve = done }))
    const engine = { checkNow, getSettings: vi.fn(async () => settings()) }
    const scheduler = new MonitorScheduler(engine)
    const started = scheduler.start()
    await vi.waitFor(() => expect(checkNow).toHaveBeenCalledTimes(1))
    const concurrent = scheduler.check()
    expect(checkNow).toHaveBeenCalledTimes(1)
    resolve(result)
    await expect(started).resolves.toBe(result)
    await expect(concurrent).resolves.toBe(result)
    await vi.advanceTimersByTimeAsync(30 * 60_000)
    expect(checkNow).toHaveBeenCalledTimes(2)
    scheduler.stop(); vi.useRealTimers()
  })

  it('does not start or retain a timer while paused', async () => {
    vi.useFakeTimers()
    const engine = { checkNow: vi.fn(async () => result), getSettings: vi.fn(async () => settings(false)) }
    const scheduler = new MonitorScheduler(engine)
    expect(await scheduler.start()).toBeNull()
    await vi.advanceTimersByTimeAsync(60 * 60_000)
    expect(engine.checkNow).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('checks after resume only when the previous check is overdue', async () => {
    const engine = { checkNow: vi.fn(async () => result), getSettings: vi.fn(async () => settings(true, 5)) }
    const scheduler = new MonitorScheduler(engine)
    await scheduler.checkIfOverdue(new Date(Date.now() - 6 * 60_000).toISOString())
    expect(engine.checkNow).toHaveBeenCalledOnce()
    scheduler.stop()
  })
})

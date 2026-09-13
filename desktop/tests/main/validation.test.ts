import { describe, expect, it } from 'vitest'
import { requireHistoryQuery, requirePostUrl, requireSettingsPatch } from '../../src/main/validation'

describe('IPC validation', () => {
  it('accepts canonical X posts and the AIHOT event page only', () => {
    expect(requirePostUrl('https://x.com/thsottiaux/status/123')).toContain('/123')
    expect(requirePostUrl('https://aihot.news/codex-reset')).toContain('aihot.news')
    expect(() => requirePostUrl('https://x.com.evil.test/a/status/123')).toThrow()
    expect(() => requirePostUrl('javascript:alert(1)')).toThrow()
  })
  it('rejects unknown settings fields and invalid intervals', () => {
    expect(requireSettingsPatch({ enabled: false })).toEqual({ enabled: false })
    expect(() => requireSettingsPatch({ token: 'secret' })).toThrow('unknown')
    expect(() => requireSettingsPatch({ intervalMinutes: 10 })).toThrow('interval')
  })
  it('bounds history pagination', () => {
    expect(requireHistoryQuery({ type: 'direct_reset', limit: 50 })).toEqual({ type: 'direct_reset', limit: 50 })
    expect(() => requireHistoryQuery({ limit: 1000 })).toThrow()
  })
})

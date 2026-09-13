import { describe, expect, it } from 'vitest'
import { fetchCodexResets } from '../../src/monitor/api/fetchCodexResets'
import { parseCodexResets } from '../../src/monitor/api/parseCodexResets'
import { validateSourceUrl } from '../../src/monitor/api/validateUrl'
import { MAX_RESPONSE_BYTES } from '../../src/monitor/config/defaults'

describe('AIHOT API contract', () => {
  it('rejects unsupported schema versions', () => {
    expect(() => parseCodexResets('{"schemaVersion":2,"timezone":"Asia/Shanghai","events":[]}')).toThrow('Unsupported schemaVersion')
  })
  it('rejects a mismatched event count', () => {
    expect(() => parseCodexResets(JSON.stringify({ schemaVersion: 1, timezone: 'Asia/Shanghai', checkedAt: null,
      historyFrom: '2026-06-12T00:00:00+08:00', count: 1, events: [] }))).toThrow('count does not match')
  })
})

describe('AIHOT URL protection', () => {
  it('allows the fixed API host and Clash fake IP only after allowlisting', async () => {
    await expect(validateSourceUrl('https://aihot.news/api/v1/codex-resets', async () => ['198.18.0.20'])).resolves.toBeInstanceOf(URL)
    await expect(validateSourceUrl('https://evil.invalid/api', async () => ['198.18.0.20'])).rejects.toThrow('not allowlisted')
  })
  it.each(['127.0.0.1', '192.168.1.2', '169.254.1.1', '::1', 'fd00::1', '192.0.2.1', '::ffff:127.0.0.1'])(
    'blocks reserved address %s', async (address) => {
      await expect(validateSourceUrl('https://aihot.news/api/v1/codex-resets', async () => [address])).rejects.toThrow('blocked address')
    },
  )
  it('delegates DNS to the system proxy only after host allowlisting', async () => {
    await expect(validateSourceUrl('https://aihot.news/api/v1/codex-resets', null)).resolves.toBeInstanceOf(URL)
    await expect(validateSourceUrl('https://evil.invalid/api', null)).rejects.toThrow('not allowlisted')
  })
  it('revalidates redirects and rejects oversized bodies', async () => {
    const redirect = async () => new Response(null, { status: 302, headers: { location: 'http://aihot.news/api/v1/codex-resets' } })
    await expect(fetchCodexResets('https://aihot.news/api/v1/codex-resets', { fetchImpl: redirect as typeof fetch,
      resolveHost: async () => ['1.1.1.1'] })).rejects.toThrow('HTTPS')
    const oversized = async () => new Response(new Uint8Array(MAX_RESPONSE_BYTES + 1), { headers: { 'content-type': 'application/json' } })
    await expect(fetchCodexResets('https://aihot.news/api/v1/codex-resets', { fetchImpl: oversized as typeof fetch,
      resolveHost: async () => ['1.1.1.1'] })).rejects.toThrow('2 MiB')
  })
})

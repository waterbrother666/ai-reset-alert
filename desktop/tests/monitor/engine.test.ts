import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { ResetEvent } from '../../src/shared/domain'
import { createMonitorEngine } from '../../src/monitor'

const dirs: string[] = []
const makeDb = () => { const dir = mkdtempSync(join(tmpdir(), 'tibo-engine-')); dirs.push(dir); return join(dir, 'monitor.sqlite') }
afterEach(() => { while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true }) })
const resolveHost = async () => ['93.184.216.34']
const event = (id: string, status: ResetEvent['status'] = 'announced'): ResetEvent => ({
  id, type: 'direct_reset', label: '全员重置', status, title: status === 'confirmed' ? 'Codex 额度重置已完成' : 'Tibo 预告将重置额度',
  scope: 'Plus、Pro', createdAt: '2026-09-13T12:00:00.000+08:00', updatedAt: status === 'confirmed' ? '2026-09-13T13:00:00.000+08:00' : '2026-09-13T12:00:00.000+08:00',
  confirmedAt: status === 'confirmed' ? '2026-09-13T13:00:00.000+08:00' : null, occurredOn: null,
  confirmationBasis: status === 'confirmed' ? 'source_post' : null,
  schedule: { precision: 'deadline', from: '2026-09-13T15:00:00.000+08:00', through: '2026-09-13T15:00:00.000+08:00', label: '北京时间预计 9月13日 15:00 前' },
  posts: [{ id: id.replace(/\D/g, '') || '1', publishedAt: '2026-09-13T12:00:00.000+08:00', stage: status === 'confirmed' ? '确认完成' : '预告',
    text: '重置相关中文摘要', originalText: 'Reset related source quote', url: `https://x.com/thsottiaux/status/${id.replace(/\D/g, '') || '1'}` }],
  url: 'https://aihot.news/codex-reset',
})
const response = (events: ResetEvent[]) => JSON.stringify({ schemaVersion: 1, timezone: 'Asia/Shanghai',
  checkedAt: '2026-09-13T13:00:00.000+08:00', historyFrom: '2026-06-12T00:00:00.000+08:00', count: events.length, events })
const jsonResponse = (events: ResetEvent[], etag = '"v1"') => new Response(response(events), { status: 200,
  headers: { 'content-type': 'application/json', etag } })

describe('AIHOT monitor engine', () => {
  it('establishes a quiet baseline and notifies for a newly added event', async () => {
    let events = [event('event-100')]
    const engine = createMonitorEngine()
    await engine.initialize({ databasePath: makeDb(), now: () => new Date('2026-09-13T05:00:00Z'),
      fetchImpl: (async () => jsonResponse(events)) as typeof fetch, resolveHost })
    const signals: string[] = []; engine.on('signal', (record) => signals.push(record.event.id))
    expect(await engine.checkNow()).toMatchObject({ ok: true, fetchedCount: 1, newCount: 1 })
    expect(signals).toEqual([])
    events = [event('event-101'), event('event-100')]
    expect((await engine.checkNow()).newCount).toBe(1)
    expect(signals).toEqual(['event-101'])
    expect((await engine.listHistory()).items.map((row) => row.event.id)).toEqual(['event-101', 'event-100'])
    await engine.markNotificationResult('event-101', { sent: true })
    expect((await engine.listHistory()).items[0].notificationSentAt).toBe('2026-09-13T05:00:00.000Z')
    await engine.close()
  })

  it('notifies again when an announced event becomes confirmed', async () => {
    let current = event('event-200')
    const engine = createMonitorEngine()
    await engine.initialize({ databasePath: makeDb(), fetchImpl: (async () => jsonResponse([current])) as typeof fetch, resolveHost })
    await engine.checkNow()
    const signals: string[] = []; engine.on('signal', (record) => signals.push(record.event.status))
    current = event('event-200', 'confirmed')
    const result = await engine.checkNow()
    expect(result).toMatchObject({ newCount: 0, relevantCount: 1 })
    expect(signals).toEqual(['confirmed'])
    expect((await engine.listHistory()).items[0].event.status).toBe('confirmed')
    await engine.close()
  })

  it('uses ETag and accepts a 304 response without rewriting history', async () => {
    const headers: (string | null)[] = []; let calls = 0
    const fetchImpl = async (_url: unknown, init?: RequestInit) => {
      headers.push(new Headers(init?.headers).get('if-none-match')); calls += 1
      return calls === 1 ? jsonResponse([event('event-300')], '"snapshot-1"') : new Response(null, { status: 304, headers: { etag: '"snapshot-1"' } })
    }
    const engine = createMonitorEngine()
    await engine.initialize({ databasePath: makeDb(), fetchImpl: fetchImpl as typeof fetch, resolveHost })
    await engine.checkNow(); const result = await engine.checkNow()
    expect(headers).toEqual([null, '"snapshot-1"']); expect(result).toMatchObject({ ok: true, fetchedCount: 0, newCount: 0 })
    expect((await engine.listHistory()).items).toHaveLength(1)
    await engine.close()
  })

  it('keeps the previous snapshot when the API response is invalid', async () => {
    let valid = true
    const engine = createMonitorEngine()
    await engine.initialize({ databasePath: makeDb(), fetchImpl: (async () => valid ? jsonResponse([event('event-400')]) :
      new Response('{"schemaVersion":2}', { headers: { 'content-type': 'application/json' } })) as typeof fetch, resolveHost })
    await engine.checkNow(); valid = false
    expect((await engine.checkNow()).ok).toBe(false)
    expect((await engine.listHistory()).items.map((row) => row.event.id)).toEqual(['event-400'])
    await engine.close()
  })

  it('recovers one pending notification after restart', async () => {
    const databasePath = makeDb(); let events = [event('event-500')]
    const fetchImpl = (async () => jsonResponse(events)) as typeof fetch
    const first = createMonitorEngine(); await first.initialize({ databasePath, fetchImpl, resolveHost }); await first.checkNow()
    events = [event('event-501'), event('event-500')]; first.on('signal', () => {}); await first.checkNow(); await first.close()
    const second = createMonitorEngine(); const retried: string[] = []
    await second.initialize({ databasePath, fetchImpl, resolveHost }); second.on('signal', (record) => retried.push(record.event.id)); await second.checkNow()
    expect(retried).toEqual(['event-501']); await second.close()
  })
})

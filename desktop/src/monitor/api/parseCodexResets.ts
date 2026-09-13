import type { ResetEvent, ResetPost, ResetSchedule } from '../../shared/domain'
import { ApiParseError } from '../errors'

export interface CodexResetsResponse {
  schemaVersion: 1
  timezone: 'Asia/Shanghai'
  checkedAt: string | null
  historyFrom: string
  count: number
  events: ResetEvent[]
}

const object = (value: unknown, name: string): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiParseError(`${name} must be an object`)
  return value as Record<string, unknown>
}
const string = (value: unknown, name: string): string => {
  if (typeof value !== 'string') throw new ApiParseError(`${name} must be a string`)
  return value
}
const nullableString = (value: unknown, name: string): string | null => value === null ? null : string(value, name)
const date = (value: unknown, name: string): string => {
  const result = string(value, name)
  if (Number.isNaN(Date.parse(result))) throw new ApiParseError(`${name} must be a valid date`)
  return result
}
const nullableDate = (value: unknown, name: string): string | null => value === null ? null : date(value, name)
const url = (value: unknown, name: string, hosts: string[]): string => {
  const result = string(value, name)
  let parsed: URL
  try { parsed = new URL(result) } catch { throw new ApiParseError(`${name} must be a valid URL`) }
  if (parsed.protocol !== 'https:' || !hosts.includes(parsed.hostname.toLowerCase())) throw new ApiParseError(`${name} has an unexpected host`)
  return result
}

function parsePost(value: unknown, index: number): ResetPost {
  const row = object(value, `posts[${index}]`)
  return {
    id: string(row.id, `posts[${index}].id`),
    publishedAt: date(row.publishedAt, `posts[${index}].publishedAt`),
    stage: string(row.stage, `posts[${index}].stage`),
    text: string(row.text, `posts[${index}].text`),
    originalText: string(row.originalText, `posts[${index}].originalText`),
    url: url(row.url, `posts[${index}].url`, ['x.com', 'twitter.com']),
  }
}

function parseSchedule(value: unknown): ResetSchedule | null {
  if (value === null) return null
  const row = object(value, 'schedule')
  const precision = string(row.precision, 'schedule.precision')
  if (!['exact', 'approximate', 'deadline', 'date', 'window'].includes(precision)) throw new ApiParseError('Invalid schedule.precision')
  return { precision: precision as ResetSchedule['precision'], from: date(row.from, 'schedule.from'),
    through: date(row.through, 'schedule.through'), label: string(row.label, 'schedule.label') }
}

function parseEvent(value: unknown, index: number): ResetEvent {
  const row = object(value, `events[${index}]`)
  const type = string(row.type, `events[${index}].type`)
  const status = string(row.status, `events[${index}].status`)
  const basis = row.confirmationBasis
  if (!['direct_reset', 'reset_credit'].includes(type)) throw new ApiParseError(`Invalid events[${index}].type`)
  if (!['announced', 'confirmed'].includes(status)) throw new ApiParseError(`Invalid events[${index}].status`)
  if (basis !== null && basis !== 'source_post' && basis !== 'receipt_review') throw new ApiParseError(`Invalid events[${index}].confirmationBasis`)
  if (!Array.isArray(row.posts) || row.posts.length === 0) throw new ApiParseError(`events[${index}].posts must not be empty`)
  return {
    id: string(row.id, `events[${index}].id`), type: type as ResetEvent['type'], label: string(row.label, `events[${index}].label`),
    status: status as ResetEvent['status'], title: string(row.title, `events[${index}].title`), scope: string(row.scope, `events[${index}].scope`),
    createdAt: date(row.createdAt, `events[${index}].createdAt`), updatedAt: date(row.updatedAt, `events[${index}].updatedAt`),
    confirmedAt: nullableDate(row.confirmedAt, `events[${index}].confirmedAt`), occurredOn: nullableString(row.occurredOn, `events[${index}].occurredOn`),
    confirmationBasis: basis, schedule: parseSchedule(row.schedule), posts: row.posts.map(parsePost),
    url: url(row.url, `events[${index}].url`, ['aihot.news']),
  }
}

export function parseCodexResets(raw: Uint8Array | string): CodexResetsResponse {
  let parsed: unknown
  try { parsed = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw)) }
  catch (cause) { throw new ApiParseError('Response is not valid JSON', { cause }) }
  const root = object(parsed, 'response')
  if (root.schemaVersion !== 1) throw new ApiParseError(`Unsupported schemaVersion: ${String(root.schemaVersion)}`)
  if (root.timezone !== 'Asia/Shanghai') throw new ApiParseError(`Unexpected timezone: ${String(root.timezone)}`)
  if (!Array.isArray(root.events)) throw new ApiParseError('events must be an array')
  const events = root.events.map(parseEvent)
  if (typeof root.count !== 'number' || !Number.isInteger(root.count) || root.count !== events.length) throw new ApiParseError('count does not match events')
  return { schemaVersion: 1, timezone: 'Asia/Shanghai', checkedAt: root.checkedAt === null ? null : date(root.checkedAt, 'checkedAt'),
    historyFrom: date(root.historyFrom, 'historyFrom'), count: root.count, events }
}

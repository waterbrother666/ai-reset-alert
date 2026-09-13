import type { HistoryQuery, MonitorSettings } from '../shared/domain'

const SAFE_SOURCE = /^(?:https:\/\/(?:x\.com|twitter\.com)\/[A-Za-z0-9_]+\/status\/\d+|https:\/\/aihot\.news\/codex-reset)$/
const plainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function requireBoolean(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be a boolean`)
  return value
}

export function requirePostUrl(value: unknown): string {
  if (typeof value !== 'string' || !SAFE_SOURCE.test(value)) throw new TypeError('Only AIHOT and canonical X source URLs are allowed')
  return value
}

export function requireSettingsPatch(value: unknown): Partial<MonitorSettings> {
  if (!plainObject(value)) throw new TypeError('Settings patch must be an object')
  const allowed = new Set(['enabled', 'intervalMinutes', 'notificationsEnabled', 'launchAtLogin', 'closeToTray'])
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new TypeError('Settings patch contains unknown fields')
  if ('enabled' in value && typeof value.enabled !== 'boolean') throw new TypeError('enabled must be a boolean')
  if ('intervalMinutes' in value && ![5, 15, 30, 60].includes(value.intervalMinutes as number)) throw new TypeError('Invalid interval')
  for (const key of ['notificationsEnabled', 'launchAtLogin', 'closeToTray'] as const) {
    if (key in value && typeof value[key] !== 'boolean') throw new TypeError(`${key} must be a boolean`)
  }
  return value as Partial<MonitorSettings>
}

export function requireHistoryQuery(value: unknown): HistoryQuery | undefined {
  if (value === undefined) return undefined
  if (!plainObject(value)) throw new TypeError('History query must be an object')
  const allowed = new Set(['type', 'status', 'cursor', 'limit'])
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new TypeError('History query contains unknown fields')
  if ('cursor' in value && typeof value.cursor !== 'string') throw new TypeError('cursor must be a string')
  if ('limit' in value && (!Number.isInteger(value.limit) || (value.limit as number) < 1 || (value.limit as number) > 200)) throw new TypeError('limit must be 1-200')
  if ('type' in value && !['direct_reset', 'reset_credit'].includes(value.type as string)) throw new TypeError('Invalid event type')
  if ('status' in value && !['announced', 'confirmed'].includes(value.status as string)) throw new TypeError('Invalid event status')
  return value as HistoryQuery
}

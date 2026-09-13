import type { MonitorSettings } from '../../shared/domain'

export const DEFAULT_SETTINGS: MonitorSettings = {
  enabled: true,
  intervalMinutes: 5,
  notificationsEnabled: true,
  launchAtLogin: false,
  closeToTray: true,
}

export const REQUEST_TIMEOUT_MS = 12_000
export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024
export const MAX_REDIRECTS = 3

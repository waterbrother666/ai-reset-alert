import type { AppApi } from '../data/domain'
import type { DesktopApi } from '../../desktop/src/shared/desktop-api'

declare global {
  interface Window {
    appApi: AppApi
    desktopApi?: DesktopApi
    appRuntime?: 'desktop' | 'web'
  }
}

export {}

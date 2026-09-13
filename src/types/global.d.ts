import type { AppApi } from '../data/domain'

declare global {
  interface Window {
    appApi: AppApi
  }
}

export {}

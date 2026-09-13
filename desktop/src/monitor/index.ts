export { DefaultMonitorEngine } from './engine'
export type { EngineInitOptions, MonitorEngine } from './contracts'
export * from '../shared/domain'

import { DefaultMonitorEngine } from './engine'
export function createMonitorEngine(): DefaultMonitorEngine { return new DefaultMonitorEngine() }

export class MonitorError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = new.target.name
  }
}
export class SourceTimeoutError extends MonitorError {}
export class SourceHttpError extends MonitorError {
  constructor(message: string, public readonly retryAfterSeconds: number | null = null, options?: ErrorOptions) {
    super(message, options)
  }
}
export class ApiParseError extends MonitorError {}
export class UnsafeUrlError extends MonitorError {}
export class StorageError extends MonitorError {}

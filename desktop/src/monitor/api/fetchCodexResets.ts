import { MAX_REDIRECTS, MAX_RESPONSE_BYTES, REQUEST_TIMEOUT_MS } from '../config/defaults'
import { SourceHttpError, SourceTimeoutError } from '../errors'
import { validateSourceUrl, type HostLookup } from './validateUrl'

export interface FetchApiOptions { fetchImpl?: typeof fetch; timeoutMs?: number; resolveHost?: HostLookup | null; etag?: string | null }
export interface FetchedApi { body: Uint8Array | null; finalUrl: string; etag: string | null; retryAfterSeconds: number | null }

const retryAfter = (response: Response): number | null => {
  const seconds = Number(response.headers.get('retry-after'))
  return Number.isInteger(seconds) && seconds > 0 ? seconds : null
}

export async function fetchCodexResets(url: string, options: FetchApiOptions = {}): Promise<FetchedApi> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  let current = (await validateSourceUrl(url, options.resolveHost)).toString()
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? REQUEST_TIMEOUT_MS)
    let response: Response
    try {
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (options.etag) headers['If-None-Match'] = options.etag
      response = await fetchImpl(current, { redirect: 'manual', signal: controller.signal, headers })
    } catch (cause) {
      clearTimeout(timer)
      if (controller.signal.aborted) throw new SourceTimeoutError(`API request timed out: ${current}`, { cause })
      throw new SourceHttpError(`API request failed: ${current}`, null, { cause })
    }
    if (response.status >= 300 && response.status < 400 && response.status !== 304) {
      const location = response.headers.get('location'); clearTimeout(timer)
      if (!location) throw new SourceHttpError(`API redirect has no Location header: ${current}`)
      if (redirects === MAX_REDIRECTS) throw new SourceHttpError(`API exceeded ${MAX_REDIRECTS} redirects`)
      current = (await validateSourceUrl(new URL(location, current).toString(), options.resolveHost)).toString(); continue
    }
    const etag = response.headers.get('etag')
    if (response.status === 304) { clearTimeout(timer); return { body: null, finalUrl: current, etag: etag ?? options.etag ?? null, retryAfterSeconds: null } }
    if (!response.ok) {
      clearTimeout(timer)
      const wait = retryAfter(response)
      throw new SourceHttpError(`API returned HTTP ${response.status}: ${current}`, wait)
    }
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!contentType.includes('application/json')) { clearTimeout(timer); throw new SourceHttpError(`API returned unexpected content type: ${contentType || '<missing>'}`) }
    const declared = Number(response.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) { clearTimeout(timer); throw new SourceHttpError('API response exceeds 2 MiB limit') }
    const reader = response.body?.getReader()
    if (!reader) { clearTimeout(timer); throw new SourceHttpError('API response has no body') }
    const chunks: Uint8Array[] = []; let total = 0
    while (true) {
      let read: ReadableStreamReadResult<Uint8Array>
      try { read = await reader.read() } catch (cause) {
        clearTimeout(timer)
        if (controller.signal.aborted) throw new SourceTimeoutError(`API response timed out while reading: ${current}`, { cause })
        throw new SourceHttpError(`API response failed while reading: ${current}`, null, { cause })
      }
      if (read.done) break
      total += read.value.byteLength
      if (total > MAX_RESPONSE_BYTES) { clearTimeout(timer); await reader.cancel(); throw new SourceHttpError('API response exceeds 2 MiB limit') }
      chunks.push(read.value)
    }
    clearTimeout(timer)
    const body = new Uint8Array(total); let offset = 0
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
    return { body, finalUrl: current, etag, retryAfterSeconds: null }
  }
  throw new SourceHttpError('Unreachable redirect state')
}

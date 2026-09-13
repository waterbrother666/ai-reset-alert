import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { ALLOWED_SOURCE_HOSTS } from '../config/sources'
import { UnsafeUrlError } from '../errors'

const CLASH_START = 0xc6120000
const CLASH_END = 0xc613ffff

function ipv4Number(ip: string): number {
  return ip.split('.').reduce((value, part) => (value << 8) + Number(part), 0) >>> 0
}

function inRange(value: number, base: number, prefix: number): boolean {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (value & mask) === (base & mask)
}

function blockedAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const n = ipv4Number(address)
    if (n >= CLASH_START && n <= CLASH_END) return false
    return [
      [0x00000000, 8], [0x0a000000, 8], [0x64400000, 10], [0x7f000000, 8],
      [0xa9fe0000, 16], [0xac100000, 12], [0xc0000000, 24], [0xc0000200, 24],
      [0xc0a80000, 16], [0xc0586300, 24], [0xc6336400, 24], [0xcb007100, 24],
      [0xe0000000, 4],
    ].some(([base, prefix]) => inRange(n, base, prefix))
  }
  const normalized = address.toLowerCase().split('%')[0]
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice(7)
    return isIP(mapped) === 4 ? blockedAddress(mapped) : true
  }
  return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') ||
    normalized.startsWith('fd') || /^fe[89ab]/.test(normalized) || normalized.startsWith('ff') ||
    normalized === '100::' || normalized.startsWith('100::') || normalized.startsWith('2001:db8:')
}

export type HostLookup = (hostname: string) => Promise<string[]>
const systemLookup: HostLookup = async (hostname) =>
  (await lookup(hostname, { all: true, verbatim: true })).map((row) => row.address)

export async function validateSourceUrl(rawUrl: string, resolve: HostLookup | null = systemLookup): Promise<URL> {
  let url: URL
  try { url = new URL(rawUrl) } catch (cause) { throw new UnsafeUrlError(`Invalid API URL: ${rawUrl}`, { cause }) }
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (url.protocol !== 'https:') throw new UnsafeUrlError('API source must use HTTPS')
  if (url.username || url.password) throw new UnsafeUrlError('API source credentials are not allowed')
  if (!ALLOWED_SOURCE_HOSTS.has(host)) throw new UnsafeUrlError(`API host is not allowlisted: ${host || '<missing>'}`)
  if (resolve === null) return url
  let addresses: string[]
  try { addresses = await resolve(host) } catch (cause) { throw new UnsafeUrlError(`Cannot resolve API host ${host}`, { cause }) }
  if (!addresses.length) throw new UnsafeUrlError(`API host has no addresses: ${host}`)
  const unsafe = addresses.find(blockedAddress)
  if (unsafe) throw new UnsafeUrlError(`API host resolves to blocked address: ${unsafe}`)
  return url
}

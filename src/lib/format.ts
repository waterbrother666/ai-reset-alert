import type { Category } from '../data/viewModels'

const relativeFormatter = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' })

export function relativeTime(timestamp: number, base = Date.now()): string {
  const difference = timestamp - base
  const absolute = Math.abs(difference)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (absolute < minute) return difference >= 0 ? '即将' : '刚刚'
  if (absolute < hour) return relativeFormatter.format(Math.round(difference / minute), 'minute')
  if (absolute < day) return relativeFormatter.format(Math.round(difference / hour), 'hour')
  return relativeFormatter.format(Math.round(difference / day), 'day')
}

export function absoluteTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(timestamp)
}

export function dateLabel(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long', day: 'numeric',
  }).format(timestamp)
}

export const CATEGORY_TONE: Record<Category, {
  dot: string
  chipBg: string
  chipText: string
}> = {
  reset_released: { dot: 'bg-[var(--color-brand)]',
    chipBg: 'bg-[var(--color-brand-soft)]', chipText: 'text-[var(--color-brand-text)]' },
  reset_upcoming: { dot: 'bg-[var(--color-info)]',
    chipBg: 'bg-[var(--color-brand-soft)]', chipText: 'text-[var(--color-brand-text)]' },
  reset_announced: { dot: 'bg-[var(--color-info)]',
    chipBg: 'bg-[var(--color-surface-2)]', chipText: 'text-[var(--color-text-muted)]' },
  reset_credit_announced: { dot: 'bg-[var(--color-text-muted)]',
    chipBg: 'bg-[var(--color-surface-2)]', chipText: 'text-[var(--color-text-muted)]' },
  reset_credit_released: { dot: 'bg-[var(--color-ok)]',
    chipBg: 'bg-[var(--color-ok-soft)]', chipText: 'text-[var(--color-ok)]' },
}

export function heatColor(count: number): string {
  return [
    'var(--color-heat-0)', 'var(--color-heat-1)', 'var(--color-heat-2)',
    'var(--color-heat-3)', 'var(--color-heat-4)',
  ][Math.min(4, count)]
}

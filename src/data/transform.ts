import type { HistoryRecord } from './domain'
import type { DayActivity, SignalRecord } from './viewModels'

export function toSignal(record: HistoryRecord): SignalRecord {
  const { event } = record
  const post = event.posts[0]
  const upcoming = event.status === 'announced' && event.schedule &&
    Date.parse(event.schedule.through) > Date.now()
  const category: SignalRecord['category'] = event.type === 'reset_credit'
    ? event.status === 'confirmed' ? 'reset_credit_released' : 'reset_credit_announced'
    : event.status === 'confirmed' ? 'reset_released'
      : upcoming ? 'reset_upcoming' : 'reset_announced'
  return {
    id: record.id,
    category,
    claim: event.title,
    body: post?.text ?? event.title,
    originalText: post?.originalText ?? '',
    publishedAt: Date.parse(post?.publishedAt ?? event.createdAt),
    notify: 'not_applicable',
    url: post?.url ?? event.url,
    related: true,
    status: event.status,
    eventType: event.type,
  }
}

export function buildLiveHeatmap(records: SignalRecord[], weeks = 27,
  endDate = new Date()): DayActivity[] {
  const today = new Date(endDate)
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - (weeks * 7 - 1))
  const counts = new Map<number, { count: number; released: boolean }>()
  for (const record of records) {
    const date = new Date(record.publishedAt)
    date.setHours(0, 0, 0, 0)
    const current = counts.get(date.getTime()) ?? { count: 0, released: false }
    current.count += 1
    current.released ||= record.status === 'confirmed'
    counts.set(date.getTime(), current)
  }
  return Array.from({ length: weeks * 7 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    const value = counts.get(day.getTime())
    return { date: day.getTime(), count: value?.count ?? 0,
      released: value?.released ?? false }
  })
}

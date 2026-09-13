import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { MonitorSnapshot } from '../data/domain'
import type { SignalRecord } from '../data/viewModels'
import { buildLiveHeatmap } from '../data/transform'
import { Button, Card, SectionLabel, Banner, EmptyState } from '../components/ui/primitives'
import { SignalCard, TiboPost } from '../components/SignalCard'
import { ResetHeatmap } from '../components/ResetHeatmap'
import { RefreshIcon, XCircleIcon, InboxIcon, HistoryIcon } from '../components/ui/Icon'
import { absoluteTime, relativeTime } from '../lib/format'

interface DashboardProps {
  snapshot: MonitorSnapshot | null
  records: SignalRecord[]
  loading: boolean
  checking: boolean
  error: string | null
  onCheck: () => void
  onGoHistory: () => void
}

export function Dashboard({ snapshot, records, loading, checking, error, onCheck, onGoHistory }: DashboardProps) {
  const today = useToday()
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const sources = snapshot?.sourceHealth ?? []
  const failedSources = sources.filter((source) => !source.ok).length
  const latestSignal = records.find((record) => record.related)
  const lastCheck = snapshot?.lastCheckAt ? Date.parse(snapshot.lastCheckAt) : 0

  return <Page>
    <Header checking={checking} onCheck={onCheck} />
    {error && <Banner icon={<XCircleIcon size={18} />} title="检查失败">{error}</Banner>}
    {snapshot?.status === 'error' && failedSources === sources.length && sources.length > 0 && <Banner
      icon={<XCircleIcon size={18} />} title="AIHOT 数据接口检查失败">
      上一次成功数据仍然保留{lastCheck ? `（${relativeTime(lastCheck)}）` : ''}。
    </Banner>}
    <div>
      <div className="mb-2 flex items-center justify-between"><SectionLabel>最新重置信号</SectionLabel>
        <button onClick={onGoHistory} className="smooth-action inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-[var(--color-brand-text)] hover:bg-[var(--color-brand-soft)]">
          <HistoryIcon size={14} />历史记录<span className="tnum">· {records.filter((record) => record.related).length}</span>
        </button></div>
      {!latestSignal ? <Card><EmptyState icon={<InboxIcon size={22} />} title={loading ? '正在读取监控数据' : '暂无相关信号'}
        desc="AIHOT 发布新的 Tibo 重置事件后会显示在这里。" /></Card> : <SignalCard record={latestSignal} />}
    </div>
    <Card className="p-5"><ResetHeatmap data={buildLiveHeatmap(records, 27, today)} onSelectDay={(day) => setSelectedDay(day.date)} /></Card>
    {selectedDay !== null && <DayPostsModal date={selectedDay} records={records} onClose={() => setSelectedDay(null)} />}
  </Page>
}

function DayPostsModal({ date, records, onClose }: { date: number; records: SignalRecord[]; onClose: () => void }) {
  const posts = useMemo(() => records.filter((record) => isSameDay(record.publishedAt, date)), [date, records])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return createPortal(
    <div data-day-posts-modal className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="day-posts-title" className="flex max-h-[82vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgba(0,0,0,0.72)]">
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id="day-posts-title" className="text-[18px] font-bold text-[var(--color-text)]">{formatDayTitle(date)}</h2>
            <p className="mt-0.5 text-[13.5px] text-[var(--color-text-muted)]">Tibo 当天发布了 {posts.length} 条重置信息</p>
          </div>
          <button autoFocus onClick={onClose} aria-label="关闭弹窗" className="flex h-9 w-9 items-center justify-center rounded-full text-[23px] leading-none text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text)]">×</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" onWheel={(event) => event.stopPropagation()}>
          {posts.length > 0
            ? posts.map((record) => <div key={record.id} className="border-b border-[var(--color-border)] px-5 py-5 last:border-0"><TiboPost record={record} compact /></div>)
            : <div className="flex flex-col items-center px-6 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-text-faint)]"><InboxIcon size={22} /></div>
                <p className="mt-3 text-[15px] font-bold text-[var(--color-text)]">当天没有重置信息</p>
                <p className="mt-1 text-[13.5px] text-[var(--color-text-muted)]">AIHOT 没有收录 Tibo 在这一天发布的重置事件。</p>
              </div>}
        </div>
      </section>
    </div>,
    document.body,
  )
}

function isSameDay(first: number, second: number): boolean {
  const a = new Date(first)
  const b = new Date(second)
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDayTitle(date: number): string {
  return absoluteTime(date).split(' ')[0]
}

function useToday(): Date {
  const [today, setToday] = useState(() => startOfToday())

  useEffect(() => {
    let timer = 0
    const scheduleNextDay = () => {
      const now = new Date()
      const nextDay = new Date(now)
      nextDay.setHours(24, 0, 1, 0)
      timer = window.setTimeout(() => {
        setToday(startOfToday())
        scheduleNextDay()
      }, nextDay.getTime() - now.getTime())
    }
    scheduleNextDay()
    return () => window.clearTimeout(timer)
  }, [])

  return today
}

function startOfToday(): Date {
  const value = new Date()
  value.setHours(0, 0, 0, 0)
  return value
}

function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto flex max-w-[1080px] flex-col gap-5">{children}</div>
}

function Header({ checking, onCheck }: { checking: boolean; onCheck: () => void }) {
  return <div className="flex items-center justify-between">
    <h1 className="text-[23px] font-bold tracking-tight text-[var(--color-text)]">Codex Reset 检测</h1>
    <Button variant="primary" className="smooth-action" loading={checking} icon={<RefreshIcon size={15} />} onClick={onCheck}>{checking ? '检查中' : '立即检查'}</Button>
  </div>
}

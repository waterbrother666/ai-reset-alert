import { useMemo, useState } from 'react'
import type { SignalRecord } from '../data/viewModels'
import { Button, Card, Segmented, Skeleton, EmptyState, Banner } from '../components/ui/primitives'
import { TiboPost } from '../components/SignalCard'
import { SearchIcon, InboxIcon, AlertIcon, RefreshIcon, ChevronLeftIcon } from '../components/ui/Icon'

function HistoryRow({ record, expanded, onToggle }: { record: SignalRecord; expanded: boolean; onToggle: () => void }) {
  return <div className="border-b border-[var(--color-border)] px-4 py-4 last:border-0 hover:bg-[var(--color-surface-2)]/50 sm:px-5">
    <TiboPost record={record} compact expanded={expanded} onToggle={onToggle} />
  </div>
}

export function History({ records, loading, error, onReload, onBack }: { records: SignalRecord[]; loading: boolean; error: string | null; onReload: () => void; onBack: () => void }) {
  const [scope, setScope] = useState<'all' | 'direct_reset' | 'reset_credit'>('all')
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [visible, setVisible] = useState(50)
  const filtered = useMemo(() => records.filter((record) => scope === 'all' || record.eventType === scope).filter((record) => !query.trim() || record.body.toLowerCase().includes(query.toLowerCase()) || record.originalText.toLowerCase().includes(query.toLowerCase()) || record.claim.toLowerCase().includes(query.toLowerCase())), [records, scope, query])
  const shown = filtered.slice(0, visible)
  return <div className="mx-auto flex max-w-[1080px] flex-col gap-4">
    <div><button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-[13.5px] text-[var(--color-text-muted)]"><ChevronLeftIcon size={14} /> 返回仪表盘</button><h1 className="text-[23px] font-semibold text-[var(--color-text)]">历史记录</h1></div>
    {error && <Banner icon={<AlertIcon size={16} />} title="历史记录加载失败" actions={<Button onClick={onReload}>重试</Button>}>{error}</Banner>}
    <div className="flex flex-wrap items-center gap-2"><Segmented options={[{ value: 'all', label: '全部', count: records.length }, { value: 'direct_reset', label: '全员重置', count: records.filter((record) => record.eventType === 'direct_reset').length }, { value: 'reset_credit', label: '重置卡', count: records.filter((record) => record.eventType === 'reset_credit').length }]} value={scope} onChange={setScope} />
      <div className="relative"><SearchIcon size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索帖子内容" className="h-8 w-48 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] pl-8 pr-2.5 text-[13.5px] text-[var(--color-text)]" /></div>
      <button onClick={onReload} className="ml-auto inline-flex items-center gap-1 text-[13px] text-[var(--color-text-muted)]"><RefreshIcon size={13} />刷新</button></div>
    <Card className="overflow-hidden">{loading ? <div>{Array.from({ length: 5 }).map((_, index) => <div key={index} className="flex gap-3 px-5 py-4"><Skeleton className="h-10 w-10 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></div>)}</div>
      : shown.length === 0 ? <EmptyState icon={<InboxIcon size={22} />} title="没有符合条件的记录" desc="AIHOT 同步到的 Tibo 重置帖子会显示在这里。" />
      : <>{shown.map((record) => <HistoryRow key={record.id} record={record} expanded={expandedId === record.id} onToggle={() => setExpandedId((id) => id === record.id ? null : record.id)} />)}{filtered.length > visible && <div className="p-3"><Button variant="ghost" className="mx-auto w-full" onClick={() => setVisible((value) => value + 50)}>加载更多</Button></div>}</>}</Card>
  </div>
}

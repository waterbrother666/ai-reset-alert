import { useCallback, useEffect, useRef, useState } from 'react'
import type { MonitorSnapshot } from './data/domain'
import { TitleBar } from './components/shell/TitleBar'
import { Dashboard } from './pages/Dashboard'
import { History } from './pages/History'
import type { SignalRecord } from './data/viewModels'
import { toSignal } from './data/transform'

type PageId = 'dashboard' | 'history'

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard')
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null)
  const [records, setRecords] = useState<SignalRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const elasticLayer = useRef<HTMLDivElement | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [nextSnapshot, history] = await Promise.all([
        window.appApi.getSnapshot(),
        window.appApi.listHistory({ limit: 200 }),
      ])
      setSnapshot(nextSnapshot)
      setRecords(history.items.map(toSignal))
      setError(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setLoading(false) }
  }, [])

  const checkNow = useCallback(async () => {
    if (checking) return
    setChecking(true); setError(null)
    try {
      const result = await window.appApi.checkNow()
      setSnapshot(result.snapshot)
      if (!result.ok) setError(result.error ?? 'AIHOT 接口检查失败')
      const history = await window.appApi.listHistory({ limit: 200 })
      setRecords(history.items.map(toSignal))
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setChecking(false); setLoading(false) }
  }, [checking])

  useEffect(() => {
    void refresh()
    const offSnapshot = window.appApi.onSnapshotChanged((value) => setSnapshot(value))
    const offSignal = window.appApi.onSignalDetected(() => { void refresh() })
    return () => { offSnapshot(); offSignal() }
  }, [refresh])

  useEffect(() => {
    const update = () => {
      if (document.visibilityState !== 'visible') return
      void window.appApi.checkNow().then(() => refresh()).catch(() => refresh())
    }
    const timer = window.setInterval(update, 5 * 60_000)
    document.addEventListener('visibilitychange', update)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update) }
  }, [refresh])

  useEffect(() => {
    if (page !== 'dashboard') return
    let offset = 0, velocity = 0
    let releaseTimer: number | null = null, frame: number | null = null
    const render = () => elasticLayer.current?.style.setProperty('--elastic-y', `${offset}px`)
    const springBack = () => {
      velocity += -offset * 0.095; velocity *= 0.78; offset += velocity; render()
      if (Math.abs(offset) > 0.08 || Math.abs(velocity) > 0.08) frame = requestAnimationFrame(springBack)
      else { offset = 0; velocity = 0; render(); frame = null }
    }
    const handleWheel = (event: WheelEvent) => {
      if (document.querySelector('[data-day-posts-modal]')) {
        event.preventDefault()
        return
      }
      event.preventDefault()
      if (frame !== null) cancelAnimationFrame(frame)
      if (releaseTimer !== null) window.clearTimeout(releaseTimer)
      frame = null; offset = Math.max(-48, Math.min(48, offset - event.deltaY * 0.13)); velocity = 0; render()
      releaseTimer = window.setTimeout(() => { releaseTimer = null; frame = requestAnimationFrame(springBack) }, 90)
    }
    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', handleWheel)
      if (releaseTimer !== null) window.clearTimeout(releaseTimer)
      if (frame !== null) cancelAnimationFrame(frame)
      elasticLayer.current?.style.setProperty('--elastic-y', '0px')
    }
  }, [page])

  return <div className="app-shell flex h-screen flex-col overflow-hidden text-[var(--color-text)]">
    <TitleBar />
    <div className="flex min-h-0 flex-1"><div ref={elasticLayer} className="elastic-layer flex min-w-0 flex-1 flex-col">
      <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6"><div key={page} className="page-enter">
        {page === 'dashboard' ? <Dashboard snapshot={snapshot} records={records} loading={loading} checking={checking}
          error={error} onCheck={() => { void checkNow() }} onGoHistory={() => setPage('history')} />
          : <History records={records} loading={loading} error={error} onReload={() => { void refresh() }} onBack={() => setPage('dashboard')} />}
      </div></main>
    </div></div>
  </div>
}

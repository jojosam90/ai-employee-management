import { useState } from 'react'
import { GaugeCircle, Layers, Repeat2, Lightbulb, Loader2 } from 'lucide-react'
import { useSim } from '@/engine/store'
import { cn } from '@/lib/cn'
import type { ITReportData } from './data'

const TABS = ['Summary', 'Volume', 'Problems', 'Recommendations'] as const
type Tab = (typeof TABS)[number]

const fmt = (m: number) => (m >= 60 ? `${(m / 60).toFixed(1)} h` : `${Math.round(m)} min`)

export function ITReport() {
  const wrap = useSim((s) => s.report)
  const phase = useSim((s) => s.phase)
  const progress = useSim((s) => s.reportProgress)
  const [tab, setTab] = useState<Tab>('Summary')
  const r = wrap?.data as ITReportData | undefined

  if (!r) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <Loader2 className="animate-spin text-cyan" size={26} />
        <p className="text-[0.9rem] text-txt">
          {phase === 'reporting'
            ? `Compiling the shift report… ${Math.round(progress)}%`
            : 'The shift report is prepared once every incident is resolved.'}
        </p>
        <p className="max-w-md text-[0.84rem] text-dim">
          MTTR and SLA attainment, incident volume by category and priority, recurring root causes, and the
          recommended problem records / automations will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 overflow-x-auto border-b border-edge-soft px-3 pt-2 scroll-thin">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'whitespace-nowrap rounded-t-md px-3 py-1.5 text-[0.88rem] font-medium transition',
              tab === t ? 'bg-bg-2 text-cyan ring-1 ring-b-0 ring-edge-soft' : 'text-dim hover:text-txt',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin p-4">
        {tab === 'Summary' && <Summary r={r} wrapSummary={wrap!.summary} />}
        {tab === 'Volume' && <Volume r={r} />}
        {tab === 'Problems' && <Problems r={r} />}
        {tab === 'Recommendations' && <Recs r={r} />}
      </div>
    </div>
  )
}

function Kpi({ label, value, tone = 'text-txt' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-edge-soft bg-bg-2/60 px-3 py-2.5">
      <div className="text-[0.72rem] uppercase tracking-wide text-faint">{label}</div>
      <div className={cn('mt-1 text-lg font-semibold tabular-nums', tone)}>{value}</div>
    </div>
  )
}

function Summary({ r, wrapSummary }: { r: ITReportData; wrapSummary: string[] }) {
  const slaPct = Math.round((r.bySla.met / Math.max(1, r.total)) * 100)
  return (
    <div className="space-y-4">
      <ul className="space-y-1.5 rounded-lg border border-edge-soft bg-bg-2/40 p-3">
        {wrapSummary.map((s, i) => (
          <li key={i} className="flex gap-2 text-[0.88rem] leading-snug text-txt/90">
            <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
            {s}
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Kpi label="Incidents" value={String(r.total)} />
        <Kpi label="Mean time to resolve" value={fmt(r.mttrMins)} />
        <Kpi label="Within SLA" value={`${slaPct}%`} tone={slaPct >= 80 ? 'text-teal' : 'text-amber'} />
        <Kpi label="Recurring root causes" value={String(r.problems.length)} tone={r.problems.length ? 'text-amber' : 'text-teal'} />
      </div>
      <div className="rounded-lg border border-edge-soft bg-bg-2/40 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[0.72rem] uppercase tracking-wide text-dim">
          <GaugeCircle size={12} /> MTTR by priority
        </div>
        <div className="space-y-1.5">
          {r.byPriority.map((p) => (
            <div key={p.p} className="flex items-center gap-2 text-[0.82rem]">
              <span className="w-8 font-mono text-dim">{p.p}</span>
              <span className="w-10 tabular-nums text-faint">{p.count}×</span>
              <div className="h-1.5 flex-1 rounded-full bg-bg-2">
                <div
                  className="h-full rounded-full bg-cyan"
                  style={{ width: `${Math.min(100, (p.mttr / (r.byPriority[0]?.mttr || 1)) * 100)}%` }}
                />
              </div>
              <span className="w-16 text-right tabular-nums text-txt">{fmt(p.mttr)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Volume({ r }: { r: ITReportData }) {
  const max = r.byCategory[0]?.count ?? 1
  return (
    <div className="space-y-2">
      <div className="mb-1 flex items-center gap-1.5 text-[0.72rem] uppercase tracking-wide text-dim">
        <Layers size={12} /> Incidents by category
      </div>
      {r.byCategory.map((c) => (
        <div key={c.category} className="rounded-lg border border-edge-soft bg-bg-2/40 px-3 py-2">
          <div className="flex items-center gap-2 text-[0.9rem]">
            <span className="font-medium text-txt">{c.category}</span>
            <span className="ml-auto tabular-nums text-txt">{c.count}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-bg-2">
            <div className="h-full rounded-full bg-cyan" style={{ width: `${(c.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function Problems({ r }: { r: ITReportData }) {
  if (!r.problems.length)
    return <p className="py-8 text-center text-[0.85rem] text-teal">No recurring root causes this period.</p>
  return (
    <div className="space-y-2.5">
      {r.problems.map((p) => (
        <div key={p.rootCause} className="rounded-lg border border-amber/35 bg-amber/[0.05] p-3">
          <div className="flex items-center gap-2">
            <Repeat2 size={15} className="text-amber" />
            <span className="text-[0.86rem] font-semibold text-txt">{p.rootCause}</span>
            <span className="ml-auto text-[0.78rem] tabular-nums text-amber">{p.count} incidents</span>
          </div>
          <p className="mt-1.5 text-[0.82rem] text-dim">
            {p.refs.join(', ')} — link these under one Problem record and drive a single permanent fix.
          </p>
        </div>
      ))}
    </div>
  )
}

function Recs({ r }: { r: ITReportData }) {
  return (
    <div className="space-y-2">
      {r.recommendations.map((rec, i) => (
        <div key={i} className="rounded-lg border border-edge-soft bg-bg-2/40 p-3">
          <div className="flex items-center gap-2">
            <Lightbulb size={14} className="text-teal" />
            <span className="text-[0.85rem] font-semibold text-txt">{rec.title}</span>
          </div>
          <p className="mt-1.5 text-[0.84rem] leading-snug text-dim">{rec.detail}</p>
        </div>
      ))}
    </div>
  )
}

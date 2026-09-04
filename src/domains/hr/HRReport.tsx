import { useState } from 'react'
import { Filter, Trophy, Lightbulb, Loader2 } from 'lucide-react'
import { useSim } from '@/engine/store'
import { cn } from '@/lib/cn'
import type { HRReportData } from './data'

const TABS = ['Summary', 'Shortlists', 'Recommendations'] as const
type Tab = (typeof TABS)[number]

export function HRReport() {
  const wrap = useSim((s) => s.report)
  const phase = useSim((s) => s.phase)
  const progress = useSim((s) => s.reportProgress)
  const [tab, setTab] = useState<Tab>('Summary')
  const r = wrap?.data as HRReportData | undefined

  if (!r) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <Loader2 className="animate-spin text-cyan" size={26} />
        <p className="text-[0.9rem] text-txt">
          {phase === 'reporting'
            ? `Compiling the hiring report… ${Math.round(progress)}%`
            : 'The hiring report is prepared once every candidate is assessed.'}
        </p>
        <p className="max-w-md text-[0.84rem] text-dim">
          The pipeline funnel, a ranked shortlist per role, and the recommended next steps (offers, second
          rounds, sourcing) will appear here.
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
        {tab === 'Summary' && <Summary r={r} bullets={wrap!.summary} />}
        {tab === 'Shortlists' && <Shortlists r={r} />}
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

function Summary({ r, bullets }: { r: HRReportData; bullets: string[] }) {
  const funnel = [
    { label: 'Applied', n: r.applied },
    { label: 'Cleared screen', n: r.screenedPass },
    { label: 'Interviewed', n: r.interviewed },
    { label: 'Shortlisted', n: r.shortlisted },
  ]
  const max = funnel[0].n || 1
  return (
    <div className="space-y-4">
      <ul className="space-y-1.5 rounded-lg border border-edge-soft bg-bg-2/40 p-3">
        {bullets.map((s, i) => (
          <li key={i} className="flex gap-2 text-[0.88rem] leading-snug text-txt/90">
            <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
            {s}
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Kpi label="Candidates" value={String(r.applied)} />
        <Kpi label="Shortlisted" value={String(r.shortlisted)} tone="text-teal" />
        <Kpi label="Avg JD match" value={`${r.avgJdMatch}%`} />
        <Kpi label="Avg interview" value={String(r.avgInterview)} />
      </div>
      <div className="rounded-lg border border-edge-soft bg-bg-2/40 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[0.72rem] uppercase tracking-wide text-dim">
          <Filter size={12} /> Pipeline funnel
        </div>
        <div className="space-y-1.5">
          {funnel.map((f) => (
            <div key={f.label} className="flex items-center gap-2 text-[0.82rem]">
              <span className="w-28 text-dim">{f.label}</span>
              <div className="h-2 flex-1 rounded-full bg-bg-2">
                <div className="h-full rounded-full bg-cyan" style={{ width: `${(f.n / max) * 100}%` }} />
              </div>
              <span className="w-6 text-right tabular-nums text-txt">{f.n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Shortlists({ r }: { r: HRReportData }) {
  return (
    <div className="space-y-4">
      {r.roles.map((role) => (
        <div key={role.role} className="rounded-lg border border-edge-soft bg-bg-2/40 p-3">
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-teal" />
            <span className="text-[0.9rem] font-semibold text-txt">{role.role}</span>
            <span className="ml-auto text-[0.78rem] text-dim">
              {role.qualified}/{role.applicants} qualified
            </span>
          </div>
          {role.shortlist.length === 0 ? (
            <p className="mt-2 text-[0.82rem] text-amber">No candidate cleared the bar — widen sourcing.</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {role.shortlist.map((c) => (
                <div key={c.ref} className="flex items-center gap-2 rounded-md border border-edge-soft bg-white/[0.02] px-2.5 py-1.5 text-[0.82rem]">
                  <span className="w-6 font-mono text-dim">#{c.rank}</span>
                  <span className="font-medium text-txt">{c.name}</span>
                  <span className="text-faint">· {c.strength}</span>
                  <span className="ml-auto tabular-nums text-txt">{c.score}</span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[0.68rem] ring-1 ring-inset',
                      c.recommendation === 'Advance to offer'
                        ? 'bg-teal/10 text-teal ring-teal/30'
                        : 'bg-cyan/10 text-cyan ring-cyan/30',
                    )}
                  >
                    {c.recommendation}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function Recs({ r }: { r: HRReportData }) {
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

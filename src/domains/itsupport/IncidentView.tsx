import { LifeBuoy, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { useSim } from '@/engine/store'
import { StatusDot } from '@/components/ui'
import { cn } from '@/lib/cn'
import { stageReveal } from '../rng'
import type { IncidentData } from './data'

const STAGE_IDS = ['l1triage', 'l2diagnose', 'l3resolve']
const STAGE_LABEL: Record<string, string> = {
  l1triage: 'L1 · triaging',
  l2diagnose: 'L2 · diagnosing root cause',
  l3resolve: 'L3 · applying the fix',
  done: 'Resolved · closed',
}

/** ServiceNow-style priority cell colours */
const PRIO_CELL: Record<string, string> = {
  P1: 'bg-[#c62828] text-white border-[#c62828]',
  P2: 'bg-[#ef6c00] text-white border-[#ef6c00]',
  P3: 'bg-[#f9d976] text-[#5a4a12] border-[#e6c256]',
  P4: 'bg-[#eceff1] text-[#5c6b7a] border-[#d3dae0]',
}
const PRIO_LABEL: Record<string, string> = {
  P1: '1 - Critical',
  P2: '2 - High',
  P3: '3 - Moderate',
  P4: '4 - Low',
}
const STATE_PILL: Record<string, string> = {
  New: 'bg-[#8a9aa6]',
  'In Progress': 'bg-[#2f7dbf]',
  Resolved: 'bg-[#3c9a5f]',
  Closed: 'bg-[#5b6f7a]',
}

const AGENT = {
  L1: { name: 'Alex Kim', team: 'Service Desk (L1)' },
  L2: { name: 'Bianca Lopez', team: 'Diagnostics (L2)' },
  L3: { name: 'Carlos Mendez', team: 'Engineering (L3)' },
} as const

function dt(iso: string) {
  return new Date(iso).toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
function plusMin(iso: string, mins: number) {
  return dt(new Date(new Date(iso).getTime() + mins * 60_000).toISOString())
}
function initials(name: string) {
  const p = name.split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p[p.length - 1]?.[0] ?? '')).toUpperCase()
}

export default function IncidentView() {
  const docs = useSim((s) => s.docs)
  const spotlightId = useSim((s) => s.spotlightId)
  const phase = useSim((s) => s.phase)

  const item = docs.find((d) => d.id === spotlightId)
  const closed = docs.filter((d) => d.stage === 'done')

  if (!item) {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 p-6 text-center">
        <LifeBuoy className="text-cyan" size={26} />
        <p className="text-[0.9rem] text-txt">
          {phase === 'standby'
            ? 'Awaiting an operator instruction before the queue starts.'
            : 'Waiting for the first incident to reach L1…'}
        </p>
        <p className="max-w-md text-[0.82rem] text-dim">
          Each incident is triaged by L1, diagnosed by L2, and permanently fixed and closed by L3 — work notes
          accumulate on the record as it moves.
        </p>
      </div>
    )
  }

  const d = item.data as unknown as IncidentData
  const reveal = stageReveal(item.stage, item.progress, STAGE_IDS)
  const active = item.assignedTo != null
  const showL1 = reveal > 0.33
  const showL2 = reveal > 0.66
  const showL3 = reveal >= 1
  const slaMet = d.l3.resolvedMins <= d.slaMins

  const notes = [
    showL1 && {
      lvl: 'L1' as const,
      time: plusMin(d.openedAt, 12),
      text:
        d.workNotes[0]?.text ??
        `Triaged: category ${d.category}, priority ${d.l1.priority}. ${d.l1.quickFix} Referenced ${d.l1.kb}. Escalating to L2.`,
    },
    showL2 && {
      lvl: 'L2' as const,
      time: plusMin(d.openedAt, Math.round(d.l3.resolvedMins * 0.45)),
      text:
        d.workNotes[1]?.text ??
        `Root cause: ${d.l2.rootCause}.${d.l2.correlatedWith ? ` Correlated with ${d.l2.correlatedWith}.` : ''} Standard fix: ${d.l2.standardFix} Escalating to L3.`,
    },
    showL3 && {
      lvl: 'L3' as const,
      time: plusMin(d.openedAt, d.l3.resolvedMins),
      text:
        d.workNotes[2]?.text ??
        `Applied: ${d.l3.resolution} Permanent fix: ${d.l3.permanentFix} RCA: ${d.l3.rca} Closed as "${d.l3.closeCode}".`,
    },
  ].filter(Boolean) as { lvl: 'L1' | 'L2' | 'L3'; time: string; text: string }[]

  const pendingLabel = !showL1
    ? 'Awaiting L1 triage'
    : !showL2
      ? 'Awaiting L2 diagnosis'
      : !showL3
        ? 'Awaiting L3 permanent fix'
        : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge-soft px-3 py-2 text-[0.82rem]">
        <span className="font-semibold tracking-wide text-cyan">SPOTLIGHT</span>
        <span className="font-medium text-txt">{d.number}</span>
        <span className="truncate text-dim">· {d.shortDesc}</span>
        <span className="ml-auto flex items-center gap-1.5 text-dim">
          <StatusDot status={active ? 'processing' : 'done'} />
          {STAGE_LABEL[item.stage]}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scroll-thin p-3">
        {/* ServiceNow incident form facsimile */}
        <div className="overflow-hidden rounded-[3px] bg-[#eceff1] text-[#33434f] shadow-[0_6px_20px_rgba(0,0,0,0.45)] ring-1 ring-black/25">
          {/* form header */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-[#22333b] px-3 py-2 text-white">
            <span className="text-[0.9rem] font-semibold lowercase tracking-tight">
              service<span className="text-[#7fd63f]">now</span>
            </span>
            <span className="h-3.5 w-px bg-white/25" />
            <span className="text-[0.8rem] text-white/70">Incident</span>
            <span className="font-mono text-[0.86rem] font-semibold">{d.number}</span>
            <span
              className={cn(
                'ml-auto rounded-[2px] px-2 py-0.5 text-[0.66rem] font-semibold uppercase tracking-wide text-white',
                STATE_PILL[d.state] ?? 'bg-[#8a9aa6]',
              )}
            >
              {d.state}
            </span>
          </div>

          <div className="bg-white p-3">
            <Band>Incident details</Band>
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              <FF label="Number">
                <RO mono>{d.number}</RO>
              </FF>
              <FF label="Priority">
                {showL1 ? (
                  <div
                    className={cn(
                      'rounded-[2px] border px-2 py-1 text-[0.8rem] font-semibold',
                      PRIO_CELL[d.priority],
                    )}
                  >
                    {PRIO_LABEL[d.priority] ?? d.priority}
                  </div>
                ) : (
                  <RO pending>Triaging…</RO>
                )}
              </FF>
              <FF label="Caller">
                <RO>{d.caller}</RO>
              </FF>
              <FF label="State">
                <RO>{d.state}</RO>
              </FF>
              <FF label="Configuration item">
                <RO mono>{d.ci}</RO>
              </FF>
              <FF label="Category">{showL1 ? <RO>{d.category}</RO> : <RO pending>Triaging…</RO>}</FF>
              <FF label="Opened">
                <RO>{dt(d.openedAt)}</RO>
              </FF>
              <FF label="Impact / Urgency">
                {showL1 ? <RO>{`${d.impact} / ${d.urgency}`}</RO> : <RO pending>Triaging…</RO>}
              </FF>
              <FF label="Assignment group">
                <RO>{showL3 ? AGENT.L3.team : showL2 ? AGENT.L2.team : AGENT.L1.team}</RO>
              </FF>
              <FF label="Assigned to">
                <RO>{showL3 ? AGENT.L3.name : showL2 ? AGENT.L2.name : AGENT.L1.name}</RO>
              </FF>
              <FF label="Short description" full>
                <RO>{d.shortDesc}</RO>
              </FF>
              <FF label="Description" full>
                <div className="min-h-[3.2rem] rounded-[2px] border border-[#d3dae0] bg-[#f4f6f7] px-2 py-1.5 text-[0.8rem] leading-snug">
                  {d.description}
                </div>
              </FF>
              <FF label="Knowledge" full>
                {showL1 ? (
                  <span className="text-[0.8rem] font-medium text-[#1f76bd] underline decoration-[#1f76bd]/40 underline-offset-2">
                    {d.l1.kb}
                  </span>
                ) : (
                  <RO pending>No article linked yet</RO>
                )}
              </FF>
            </div>

            <Band className="mt-3">Activity</Band>
            <ol className="space-y-2">
              {notes.map((n) => (
                <li key={n.lvl} className="flex gap-2">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#5b6f7a] text-[0.6rem] font-semibold text-white">
                    {initials(AGENT[n.lvl].name)}
                  </span>
                  <div className="min-w-0 flex-1 border-l-2 border-[#e0b93c] bg-[#fbf7ec] px-2 py-1">
                    <div className="text-[0.66rem] text-[#7a8b99]">
                      <span className="font-semibold text-[#33434f]">{AGENT[n.lvl].name}</span>
                      {' · '}
                      {AGENT[n.lvl].team}
                      {' · Work notes · '}
                      {n.time}
                    </div>
                    <p className="mt-0.5 text-[0.8rem] leading-snug text-[#33434f]">{n.text}</p>
                  </div>
                </li>
              ))}
              {pendingLabel && (
                <li className="flex gap-2">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#c7ced3] text-[0.6rem] font-semibold text-white">
                    …
                  </span>
                  <div className="min-w-0 flex-1 border-l-2 border-[#c7ced3] bg-[#f4f6f7] px-2 py-1.5 text-[0.76rem] italic text-[#8a99a5]">
                    {pendingLabel}
                    {active ? ' — agent working…' : ''}
                  </div>
                </li>
              )}
            </ol>

            {showL3 && (
              <>
                <Band className="mt-3">Resolution information</Band>
                <div
                  className={cn(
                    'rounded-[2px] border px-2.5 py-2 text-[0.8rem]',
                    slaMet ? 'border-[#c3e6cd] bg-[#eef8f1]' : 'border-[#f5d9b0] bg-[#fdf3e6]',
                  )}
                >
                  <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                    <div>
                      <span className="text-[0.62rem] uppercase tracking-wide text-[#7a8b99]">Close code</span>
                      <div className="text-[#33434f]">{d.l3.closeCode}</div>
                    </div>
                    <div>
                      <span className="text-[0.62rem] uppercase tracking-wide text-[#7a8b99]">
                        Resolve time vs SLA
                      </span>
                      <div
                        className={cn(
                          'flex items-center gap-1.5 font-medium',
                          slaMet ? 'text-[#2e7d4f]' : 'text-[#b26a1a]',
                        )}
                      >
                        {slaMet ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                        {d.l3.resolvedMins} min / target {d.slaMins} min ({slaMet ? 'met' : 'breached'})
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[0.62rem] uppercase tracking-wide text-[#7a8b99]">Root cause</span>
                      <div className="text-[#33434f]">{d.l2.rootCause}</div>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[0.62rem] uppercase tracking-wide text-[#7a8b99]">Permanent fix</span>
                      <div className="text-[#33434f]">{d.l3.permanentFix}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-edge-soft bg-bg-2/40 px-3 py-2 text-[0.78rem] text-faint">
          <span className="text-dim">Detect</span>
          <span>→ L1 triage</span>
          <span>→ L2 root cause</span>
          <span>→ L3 permanent fix</span>
          <span>→ close + KB</span>
          <span>→ shift report</span>
          <span className="ml-auto text-dim">
            Resolved this shift: <span className="tabular-nums text-txt">{closed.length}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

function Band({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mb-2 border-b border-[#d3dae0] pb-1 text-[0.64rem] font-bold uppercase tracking-[0.14em] text-[#5c6b7a]',
        className,
      )}
    >
      {children}
    </div>
  )
}

function FF({ label, full, children }: { label: string; full?: boolean; children: ReactNode }) {
  return (
    <div className={cn(full && 'sm:col-span-2')}>
      <div className="mb-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-[#7a8b99]">{label}</div>
      {children}
    </div>
  )
}

function RO({
  children,
  mono,
  pending,
}: {
  children: ReactNode
  mono?: boolean
  pending?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-[2px] border border-[#d3dae0] bg-[#f4f6f7] px-2 py-1 text-[0.8rem]',
        mono && 'font-mono text-[0.76rem]',
        pending && 'italic text-[#8a99a5]',
      )}
    >
      {children}
    </div>
  )
}

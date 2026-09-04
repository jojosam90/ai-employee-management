import { LifeBuoy, ListChecks, Wrench, CheckCircle2, AlertTriangle } from 'lucide-react'
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
const PRIO_TONE: Record<string, string> = {
  P1: 'text-red',
  P2: 'text-amber',
  P3: 'text-cyan',
  P4: 'text-dim',
}

function dt(iso: string) {
  return new Date(iso).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
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
        <div className="grid gap-3 lg:grid-cols-2">
          {/* incident record */}
          <div className="rounded-lg border border-edge-soft bg-bg-2/40 p-2.5">
            <div className="mb-2 flex items-center gap-1.5 text-[0.74rem] uppercase tracking-wide text-dim">
              <LifeBuoy size={12} /> Incident record
            </div>
            <dl className="grid grid-cols-[92px_1fr] gap-x-3 gap-y-1.5 text-[0.82rem]">
              <Field k="Number" v={d.number} />
              <Field k="State" v={d.state} tone={d.state === 'Resolved' ? 'text-teal' : 'text-txt'} />
              <Field k="Caller" v={d.caller} />
              <Field k="Opened" v={dt(d.openedAt)} />
              <Field k="Service" v={d.ci} mono />
              <Field k="Category" v={showL1 ? d.category : '—'} dim={!showL1} />
              <Field
                k="Priority"
                v={showL1 ? `${d.priority} · ${d.impact} impact / ${d.urgency} urgency` : '—'}
                dim={!showL1}
                tone={showL1 ? PRIO_TONE[d.priority] : undefined}
              />
              <div className="col-span-2 mt-1 border-t border-edge-soft pt-1.5 text-[0.6rem] uppercase tracking-wide text-faint">
                Description
              </div>
              <p className="col-span-2 text-[0.82rem] leading-snug text-txt/80">{d.description}</p>
              {showL1 && (
                <>
                  <div className="col-span-2 mt-1 text-[0.6rem] uppercase tracking-wide text-faint">
                    Suggested knowledge
                  </div>
                  <p className="col-span-2 text-[0.8rem] text-cyan">{d.l1.kb}</p>
                </>
              )}
            </dl>
          </div>

          {/* activity / work notes */}
          <div className="rounded-lg border border-edge-soft bg-bg-2/40 p-2.5">
            <div className="mb-2 flex items-center gap-1.5 text-[0.74rem] uppercase tracking-wide text-dim">
              <ListChecks size={12} /> Activity · work notes
            </div>
            <ol className="space-y-2">
              <Note by="L1" tone="text-cyan" show={showL1} text={d.workNotes[0]?.text ?? l1preview(d)} />
              <Note by="L2" tone="text-violet" show={showL2} text={d.workNotes[1]?.text ?? l2preview(d)} />
              <Note by="L3" tone="text-teal" show={showL3} text={d.workNotes[2]?.text ?? l3preview(d)} />
            </ol>
          </div>
        </div>

        {/* resolution */}
        {showL3 ? (
          <div
            className={cn(
              'rounded-lg border px-3 py-2.5',
              d.l3.resolvedMins <= d.slaMins ? 'border-teal/35 bg-teal/[0.06]' : 'border-amber/40 bg-amber/[0.06]',
            )}
          >
            <div className="flex items-center gap-1.5 text-[0.82rem] font-medium text-txt">
              <Wrench size={13} className="text-dim" /> Root cause: {d.l2.rootCause}
            </div>
            <div className="mt-1 text-[0.8rem] text-dim">
              Permanent fix — {d.l3.permanentFix}
            </div>
            <div
              className={cn(
                'mt-1.5 flex items-center gap-2 text-[0.86rem] font-medium',
                d.l3.resolvedMins <= d.slaMins ? 'text-teal' : 'text-amber',
              )}
            >
              {d.l3.resolvedMins <= d.slaMins ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
              Closed as “{d.l3.closeCode}” in {d.l3.resolvedMins} min — SLA target {d.slaMins} min (
              {d.l3.resolvedMins <= d.slaMins ? 'met' : 'breached'}).
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-edge-soft bg-bg-2/40 px-3 py-2.5 text-[0.84rem] text-dim">
            <Wrench size={14} className="text-cyan" /> Diagnosing and applying the fix…
          </div>
        )}

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

function Field({ k, v, tone, dim, mono }: { k: string; v: string; tone?: string; dim?: boolean; mono?: boolean }) {
  return (
    <>
      <dt className="text-[0.6rem] uppercase tracking-wide text-faint">{k}</dt>
      <dd className={cn(mono && 'font-mono text-[0.78rem]', dim ? 'text-faint' : (tone ?? 'text-txt/90'))}>{v}</dd>
    </>
  )
}

function Note({ by, tone, show, text }: { by: string; tone: string; show: boolean; text: string }) {
  return (
    <li className={cn('rounded-md border border-edge-soft bg-white/[0.02] p-2', !show && 'opacity-40')}>
      <div className={cn('text-[0.66rem] font-semibold uppercase tracking-wide', tone)}>{by} support</div>
      <p className={cn('mt-0.5 text-[0.8rem] leading-snug', show ? 'text-txt/85' : 'select-none blur-[2.5px] text-dim')}>
        {text}
      </p>
    </li>
  )
}

const l1preview = (d: IncidentData) => `Triage ${d.category} · priority ${d.l1.priority}. ${d.l1.quickFix}`
const l2preview = (d: IncidentData) => `Root cause: ${d.l2.rootCause}. Standard fix: ${d.l2.standardFix}`
const l3preview = (d: IncidentData) => `${d.l3.resolution} Permanent fix: ${d.l3.permanentFix}`

import { UserRound, ClipboardCheck, Scale, CheckCircle2, MinusCircle } from 'lucide-react'
import { useSim } from '@/engine/store'
import { StatusDot } from '@/components/ui'
import { cn } from '@/lib/cn'
import { stageReveal } from '../rng'
import type { CandidateData } from './data'

const STAGE_IDS = ['screen', 'interview', 'compare']
const STAGE_LABEL: Record<string, string> = {
  screen: 'Screening résumé against the JD',
  interview: 'Structured interview',
  compare: 'Comparing & ranking',
  done: 'Assessed · ranked',
}

export default function CandidateView() {
  const docs = useSim((s) => s.docs)
  const spotlightId = useSim((s) => s.spotlightId)
  const phase = useSim((s) => s.phase)

  const item = docs.find((d) => d.id === spotlightId)
  const assessed = docs.filter((d) => d.stage === 'done')

  if (!item) {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 p-6 text-center">
        <UserRound className="text-cyan" size={26} />
        <p className="text-[0.9rem] text-txt">
          {phase === 'standby'
            ? 'Awaiting an operator instruction before screening starts.'
            : 'Waiting for the first application to reach the screener…'}
        </p>
        <p className="max-w-md text-[0.82rem] text-dim">
          Each candidate is screened against the job description, taken through a structured interview, then
          ranked against everyone else applying for the same role.
        </p>
      </div>
    )
  }

  const d = item.data as unknown as CandidateData
  const reveal = stageReveal(item.stage, item.progress, STAGE_IDS)
  const active = item.assignedTo != null
  const showScreen = reveal > 0.33
  const showInterview = reveal > 0.66
  const showCompare = reveal >= 1

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge-soft px-3 py-2 text-[0.82rem]">
        <span className="font-semibold tracking-wide text-cyan">SPOTLIGHT</span>
        <span className="font-medium text-txt">{d.name}</span>
        <span className="truncate text-dim">· {d.role}</span>
        <span className="ml-auto flex items-center gap-1.5 text-dim">
          <StatusDot status={active ? 'processing' : 'done'} />
          {STAGE_LABEL[item.stage]}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scroll-thin p-3">
        <div className="grid gap-3 lg:grid-cols-2">
          {/* profile */}
          <div className="rounded-lg border border-edge-soft bg-bg-2/40 p-2.5">
            <div className="mb-2 flex items-center gap-1.5 text-[0.74rem] uppercase tracking-wide text-dim">
              <UserRound size={12} /> Candidate profile
            </div>
            <div className="text-[0.95rem] font-semibold text-txt">{d.name}</div>
            <div className="text-[0.8rem] text-dim">
              {d.currentTitle} · {d.years} yrs · {d.location}
            </div>
            <div className="mt-1 text-[0.8rem] text-dim">{d.education}</div>
            <div className="mt-2 text-[0.6rem] uppercase tracking-wide text-faint">Applying for</div>
            <div className="text-[0.84rem] text-txt/90">{d.role}</div>
            <div className="mt-2 text-[0.6rem] uppercase tracking-wide text-faint">Skills</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {d.skills.map((s) => (
                <span
                  key={s}
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[0.72rem] ring-1 ring-inset',
                    showScreen && d.screen.matched.includes(s)
                      ? 'bg-teal/10 text-teal ring-teal/30'
                      : 'bg-white/[0.03] text-dim ring-edge-soft',
                  )}
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-2 text-[0.6rem] uppercase tracking-wide text-faint">Highlights</div>
            <ul className="mt-1 space-y-0.5">
              {d.highlights.map((h) => (
                <li key={h} className="flex gap-1.5 text-[0.8rem] text-txt/80">
                  <span className="mt-[0.45rem] h-1 w-1 shrink-0 rounded-full bg-dim" />
                  {h}
                </li>
              ))}
            </ul>
          </div>

          {/* assessment */}
          <div className="space-y-3">
            <div className={cn('rounded-lg border border-edge-soft bg-bg-2/40 p-2.5', !showScreen && 'opacity-45')}>
              <div className="mb-1.5 flex items-center gap-1.5 text-[0.74rem] uppercase tracking-wide text-dim">
                <ClipboardCheck size={12} /> Screen · JD match
              </div>
              {showScreen ? (
                <>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-semibold tabular-nums text-cyan">{d.screen.jdMatch}%</span>
                    <span className="pb-1 text-[0.8rem] text-dim">{d.screen.verdict}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-bg-2">
                    <div className="h-full rounded-full bg-cyan" style={{ width: `${d.screen.jdMatch}%` }} />
                  </div>
                  {d.screen.missing.length > 0 && (
                    <div className="mt-1.5 text-[0.78rem] text-amber">
                      Missing must-haves: {d.screen.missing.join(', ')}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[0.8rem] text-faint">Parsing the CV and matching against the job description…</p>
              )}
            </div>

            <div className={cn('rounded-lg border border-edge-soft bg-bg-2/40 p-2.5', !showInterview && 'opacity-45')}>
              <div className="mb-1.5 flex items-center gap-1.5 text-[0.74rem] uppercase tracking-wide text-dim">
                <ClipboardCheck size={12} /> Interview scorecard
              </div>
              {showInterview ? (
                <>
                  <div className="space-y-1">
                    {d.interview.scores.map((s) => (
                      <div key={s.area} className="flex items-center gap-2 text-[0.8rem]">
                        <span className="w-28 truncate text-dim">{s.area}</span>
                        <div className="h-1.5 flex-1 rounded-full bg-bg-2">
                          <div
                            className={cn('h-full rounded-full', s.score >= 70 ? 'bg-teal' : s.score >= 55 ? 'bg-cyan' : 'bg-amber')}
                            style={{ width: `${s.score}%` }}
                          />
                        </div>
                        <span className="w-8 text-right tabular-nums text-txt">{s.score}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1.5 text-[0.8rem] text-txt/80">
                    Overall <span className="font-semibold tabular-nums text-txt">{d.interview.overall}</span> —{' '}
                    {d.interview.note}
                  </div>
                </>
              ) : (
                <p className="text-[0.8rem] text-faint">Running the structured interview…</p>
              )}
            </div>
          </div>
        </div>

        {showCompare ? (
          <div
            className={cn(
              'rounded-lg border px-3 py-2.5',
              d.compare.recommendation === 'Advance to offer'
                ? 'border-teal/35 bg-teal/[0.06]'
                : d.compare.recommendation === 'Second-round interview'
                  ? 'border-cyan/30 bg-cyan/[0.05]'
                  : 'border-edge-soft bg-bg-2/40',
            )}
          >
            <div className="flex items-center gap-1.5 font-mono text-[0.82rem] text-txt/90">
              <Scale size={13} className="text-dim" />
              JD match {d.screen.jdMatch} × 0.45 + interview {d.interview.overall} × 0.55 = final{' '}
              {d.compare.finalScore}
            </div>
            <div
              className={cn(
                'mt-1.5 flex items-center gap-2 text-[0.86rem] font-medium',
                d.compare.recommendation.startsWith('Do not') ? 'text-dim' : 'text-teal',
              )}
            >
              {d.compare.recommendation.startsWith('Do not') ? <MinusCircle size={15} /> : <CheckCircle2 size={15} />}
              Rank #{d.compare.rank} of {d.compare.of} for {d.role} ({d.compare.percentile}th percentile) —{' '}
              {d.compare.recommendation}.
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-edge-soft bg-bg-2/40 px-3 py-2.5 text-[0.84rem] text-dim">
            <Scale size={14} className="text-cyan" /> Comparing against the rest of the {d.role} pipeline…
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-edge-soft bg-bg-2/40 px-3 py-2 text-[0.78rem] text-faint">
          <span className="text-dim">Application</span>
          <span>→ résumé screen</span>
          <span>→ structured interview</span>
          <span>→ compare & rank</span>
          <span>→ shortlist</span>
          <span>→ hiring report</span>
          <span className="ml-auto text-dim">
            Assessed: <span className="tabular-nums text-txt">{assessed.length}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

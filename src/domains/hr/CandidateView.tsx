import { UserRound, ClipboardCheck, Scale, CheckCircle2, MinusCircle, Mail, Phone, Globe, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
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

function initialsOf(name: string) {
  const p = name.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p[p.length - 1]?.[0] ?? '')).toUpperCase()
}

function Sec({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h4 className="mb-1 border-b border-[#d8d2c1] pb-0.5 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[#2f7d7d]">
        {title}
      </h4>
      {children}
    </section>
  )
}

/** LinkedIn-style résumé facsimile — the source document the screener reads. */
function ResumeDoc({
  d,
  scanPct,
  matchedActive,
}: {
  d: CandidateData
  scanPct: number | null
  matchedActive: boolean
}) {
  return (
    <div className="overflow-hidden rounded-[3px] bg-[#f6f4ec] text-[#23262d] shadow-[0_6px_20px_rgba(0,0,0,0.45)] ring-1 ring-black/25">
      <div className="relative">
        {scanPct != null && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 h-9"
            style={{
              top: `calc(${Math.min(scanPct, 0.98) * 100}% - 18px)`,
              background:
                'linear-gradient(180deg, rgba(47,125,125,0) 0%, rgba(47,125,125,0.5) 50%, rgba(47,125,125,0) 100%)',
              mixBlendMode: 'multiply',
            }}
          />
        )}

        {/* header band */}
        <div className="flex items-center gap-3 bg-[#2f7d7d] px-4 py-3 text-white">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/15 text-[1.05rem] font-semibold ring-2 ring-white/40">
            {initialsOf(d.name)}
          </div>
          <div className="min-w-0">
            <div className="text-[1.05rem] font-bold leading-tight tracking-tight">{d.name}</div>
            <div className="text-[0.8rem] text-white/85">{d.headline}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.66rem] text-white/75">
              <span className="flex items-center gap-1">
                <Mail size={10} /> {d.contact.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone size={10} /> {d.contact.phone}
              </span>
              <span className="flex items-center gap-1">
                <Globe size={10} /> {d.contact.linkedin}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={10} /> {d.location}
              </span>
            </div>
          </div>
        </div>

        {/* body */}
        <div className="grid gap-4 p-4 sm:grid-cols-[1.6fr_1fr]">
          {/* main column */}
          <div className="space-y-3">
            <Sec title="Profile">
              <p className="text-[0.75rem] leading-relaxed text-[#3a3e47]">{d.summary}</p>
            </Sec>

            <Sec title="Experience">
              {d.experience.map((e, i) => (
                <div key={`${e.company}-${i}`} className="mb-2.5 last:mb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[0.82rem] font-semibold text-[#1c1f26]">{e.title}</span>
                    <span className="shrink-0 text-[0.64rem] tabular-nums text-[#8a8f9c]">
                      {e.start} – {e.end}
                    </span>
                  </div>
                  <div className="text-[0.72rem] font-medium italic text-[#2f7d7d]">{e.company}</div>
                  <ul className="mt-1 space-y-0.5">
                    {e.bullets.map((b) => (
                      <li key={b} className="flex gap-1.5 text-[0.72rem] leading-snug text-[#3a3e47]">
                        <span className="mt-[0.4rem] h-1 w-1 shrink-0 rounded-full bg-[#2f7d7d]" />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </Sec>

            <Sec title="Education">
              <div className="text-[0.8rem] font-semibold text-[#1c1f26]">{d.education}</div>
              <div className="text-[0.7rem] text-[#8a8f9c]">Graduated {d.eduYear}</div>
            </Sec>
          </div>

          {/* sidebar */}
          <div className="space-y-3 sm:border-l sm:border-[#d8d2c1] sm:pl-3">
            <Sec title="Skills">
              {d.skills.map((s) => {
                const lvl = d.skillLevels[s] ?? 60
                const hit = matchedActive && d.screen.matched.includes(s)
                return (
                  <div key={s} className="mb-1 last:mb-0">
                    <div className="flex justify-between text-[0.67rem]">
                      <span className={hit ? 'font-semibold text-[#1c6b52]' : 'text-[#3a3e47]'}>
                        {s}
                        {hit ? ' ✓' : ''}
                      </span>
                    </div>
                    <div className="mt-0.5 h-1.5 rounded-full bg-[#e2ddce]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${lvl}%`, background: hit ? '#3f9e79' : '#2f7d7d' }}
                      />
                    </div>
                  </div>
                )
              })}
            </Sec>

            <Sec title="Languages">
              <div className="space-y-0.5">
                {d.languages.map((l) => (
                  <div key={l.name} className="flex justify-between gap-2 text-[0.7rem]">
                    <span className="text-[#1c1f26]">{l.name}</span>
                    <span className="text-right text-[#8a8f9c]">{l.level}</span>
                  </div>
                ))}
              </div>
            </Sec>

            <Sec title="Interests">
              <div className="flex flex-wrap gap-1">
                {d.interests.map((i) => (
                  <span key={i} className="rounded bg-[#ece7d8] px-1.5 py-0.5 text-[0.65rem] text-[#3a3e47]">
                    {i}
                  </span>
                ))}
              </div>
            </Sec>
          </div>
        </div>
      </div>
    </div>
  )
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
  const scanPct = active && item.stage === 'screen' ? item.progress : null

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
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <ResumeDoc d={d} scanPct={scanPct} matchedActive={showScreen} />

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

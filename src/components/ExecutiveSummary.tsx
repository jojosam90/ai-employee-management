import { ClipboardList } from 'lucide-react'
import { useSim } from '@/engine/store'
import { Panel } from './ui'

export default function ExecutiveSummary() {
  const report = useSim((s) => s.report)
  const phase = useSim((s) => s.phase)
  const docs = useSim((s) => s.docs)
  const reportProgress = useSim((s) => s.reportProgress)

  const validated = docs.filter((d) => d.stage === 'validated').length

  return (
    <Panel
      title="Executive Summary"
      icon={<ClipboardList size={14} />}
      className="xl:min-h-0 xl:flex-[2]"
      bodyClass="p-3 space-y-2.5 overflow-y-auto scroll-thin"
    >
      {!report ? (
        <div className="space-y-2 text-[0.84rem] text-dim">
          <p>
            {phase === 'standby'
              ? 'The team is on standby. Send an instruction to begin — the summary for the boss will appear here.'
              : phase === 'reporting'
                ? `Agent Delta is writing the summary… ${Math.round(reportProgress)}%`
                : `Processing — ${validated} of ${docs.length} documents reconciled. The executive summary follows.`}
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {report.summary.map((s, i) => (
            <li key={i} className="flex gap-2 text-[0.84rem] leading-snug text-txt/90">
              <span className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
              {s}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

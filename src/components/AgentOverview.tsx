import { Users, Pause, Play } from 'lucide-react'
import { useSim } from '@/engine/store'
import { Panel, ProgressBar, StatusDot, Avatar } from './ui'
import { cn } from '@/lib/cn'

export default function AgentOverview() {
  const agents = useSim((s) => s.agents)
  const docs = useSim((s) => s.docs)
  const phase = useSim((s) => s.phase)
  const pauseAgent = useSim((s) => s.pauseAgent)

  return (
    <Panel
      title="Agent Overview"
      icon={<Users size={14} />}
      className="xl:min-h-0 xl:flex-1"
      bodyClass="p-2.5 space-y-2 overflow-y-auto scroll-thin"
    >
      {agents.map((a) => {
        const current = docs.find((d) => d.id === a.currentDocId)
        const queue = docs.filter((d) =>
          a.id === 'alpha'
            ? d.stage === 'queued'
            : a.id === 'beta'
              ? d.stage === 'extracting'
              : a.id === 'gamma'
                ? d.stage === 'validating'
                : false,
        ).length
        return (
          <div
            key={a.id}
            className={cn(
              'rounded-lg border p-2 transition',
              a.status === 'processing'
                ? 'border-teal/40 bg-teal/[0.04]'
                : a.status === 'paused'
                  ? 'border-amber/30 bg-amber/[0.04]'
                  : 'border-edge-soft bg-white/[0.015]',
            )}
          >
            <div className="flex items-start gap-2.5">
              <Avatar id={a.avatar} name={a.name} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[0.82rem] font-semibold text-txt">{a.name}</span>
                  <StatusDot status={a.status} />
                  <button
                    onClick={() => pauseAgent(a.id, a.status !== 'paused')}
                    className="ml-auto text-faint hover:text-txt"
                    title={a.status === 'paused' ? 'Resume' : 'Pause'}
                  >
                    {a.status === 'paused' ? <Play size={12} /> : <Pause size={12} />}
                  </button>
                </div>
                <p className="truncate text-[0.84rem] text-dim">{a.role}</p>
              </div>
            </div>

            <p className="mt-1.5 truncate text-[0.86rem] text-txt/80">
              {a.stage === 'reporting'
                ? a.status === 'processing'
                  ? 'Writing the executive summary…'
                  : phase === 'done'
                    ? 'Summary compiled — ready for review'
                    : 'Awaiting the reconciled ledger'
                : phase === 'standby'
                  ? 'On standby — awaiting instruction'
                  : current
                    ? `${current.ref} · ${current.vendor}`
                    : queue > 0
                      ? `${queue} document${queue > 1 ? 's' : ''} in queue`
                      : 'Idle — queue clear'}
            </p>

            <ProgressBar
              className="mt-1.5"
              value={
                phase === 'standby'
                  ? 0
                  : current
                    ? current.progress
                    : a.stage === 'reporting'
                      ? phase === 'done'
                        ? 100
                        : 0
                      : queue === 0
                        ? 100
                        : 0
              }
              tone={a.status === 'processing' ? 'teal' : 'cyan'}
              showLabel
            />

            <div className="mt-1.5 flex items-center justify-between text-[0.8rem] text-faint">
              <span>
                Processed <span className="text-dim tabular-nums">{a.processed}</span>
              </span>
              <span>
                Accuracy <span className="text-dim tabular-nums">{(a.accuracy * 100).toFixed(1)}%</span>
              </span>
              <span>
                Speed <span className="text-dim tabular-nums">{a.speed.toFixed(2)}×</span>
              </span>
            </div>
          </div>
        )
      })}
    </Panel>
  )
}

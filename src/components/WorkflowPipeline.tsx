import { Workflow } from 'lucide-react'
import { useSim } from '@/engine/store'
import { Panel, Avatar } from './ui'

const SHORT: Record<string, string> = {
  alpha: 'Intake',
  beta: 'Extract',
  gamma: 'Reconcile',
  delta: 'Report',
}

function MiniRing({
  progress,
  active,
  avatar,
  name,
}: {
  progress: number
  active: boolean
  avatar: number
  name: string
}) {
  const r = 18
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-[42px] w-[42px]">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 42 42">
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--color-edge-soft)" strokeWidth="2.5" />
        <circle
          cx="21"
          cy="21"
          r={r}
          fill="none"
          stroke={active ? 'var(--color-teal)' : 'var(--color-cyan)'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress / 100)}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-[5px] rounded-full">
        <Avatar id={avatar} name={name} size={32} />
      </div>
    </div>
  )
}

function Connector({ flowing }: { flowing: boolean }) {
  return (
    <div className="relative mx-1 hidden h-[2px] flex-1 self-start sm:block" style={{ marginTop: 20 }}>
      <div className="absolute inset-0 rounded-full bg-edge-soft" />
      {flowing && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'repeating-linear-gradient(90deg, var(--color-cyan) 0 6px, transparent 6px 18px)',
            animation: 'flow-dash 0.8s linear infinite',
          }}
        />
      )}
    </div>
  )
}

export default function WorkflowPipeline() {
  const agents = useSim((s) => s.agents)
  const docs = useSim((s) => s.docs)
  const phase = useSim((s) => s.phase)
  const reportProgress = useSim((s) => s.reportProgress)

  const count = (fn: (s: string) => boolean) => docs.filter((d) => fn(d.stage)).length
  const queued = count((s) => s === 'queued')
  const inFlight = count((s) => s === 'ingesting' || s === 'extracting' || s === 'validating')
  const validated = count((s) => s === 'validated')
  const totalProcessed = agents.reduce((a, x) => a + x.processed, 0)

  const stageQueue: Record<string, number> = {
    alpha: queued,
    beta: count((s) => s === 'extracting'),
    gamma: count((s) => s === 'validating'),
    delta: validated,
  }

  return (
    <Panel title="Current Workflow Pipeline" icon={<Workflow size={14} />} className="shrink-0" bodyClass="p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        {agents.map((a, i) => {
          const current = docs.find((d) => d.id === a.currentDocId)
          const active = a.status === 'processing'
          const prog =
            a.stage === 'reporting'
              ? phase === 'reporting'
                ? reportProgress
                : phase === 'done'
                  ? 100
                  : 0
              : current?.progress ?? 0
          return (
            <div key={a.id} className="flex flex-1 items-start">
              <div className="flex flex-1 flex-col items-center gap-1 text-center">
                <MiniRing progress={prog} active={active} avatar={a.avatar} name={a.name} />
                <div className="text-[0.82rem] font-semibold leading-none text-txt">{a.name.replace('Agent ', '')}</div>
                <div className="text-[0.66rem] leading-none text-dim">
                  {SHORT[a.id]} ·{' '}
                  <span className={active ? 'text-teal' : ''}>
                    {a.stage === 'reporting' ? `${stageQueue.delta} ready` : `${stageQueue[a.id]} queued`}
                  </span>
                </div>
              </div>
              {i < agents.length - 1 && <Connector flowing={active || agents[i + 1].status === 'processing'} />}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-edge-soft pt-2 text-[0.78rem] text-dim">
        <span>
          Queued <b className="tabular-nums text-txt">{queued}</b>
        </span>
        <span>
          In progress <b className="tabular-nums text-txt">{inFlight}</b>
        </span>
        <span>
          Reconciled <b className="tabular-nums text-teal">{validated}</b>
        </span>
        <span>
          Steps run <b className="tabular-nums text-txt">{totalProcessed}</b>
        </span>
      </div>
    </Panel>
  )
}

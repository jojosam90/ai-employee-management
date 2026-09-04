import { useEffect, useState } from 'react'
import { Workflow, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { useSim } from '@/engine/store'
import { cn } from '@/lib/cn'
import { Panel, Avatar } from './ui'

const COLLAPSE_KEY = 'ade-pipeline-collapsed'

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
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  const allAgents = useSim((s) => s.agents)
  const docs = useSim((s) => s.docs)
  const phase = useSim((s) => s.phase)
  const reportProgress = useSim((s) => s.reportProgress)
  const config = useSim((s) => s.config)

  const flexAgents = allAgents.filter((a) => a.stage === 'flex')
  const agentById = (id: string) => allAgents.find((a) => a.id === id)

  const count = (fn: (s: string) => boolean) => docs.filter((d) => fn(d.stage)).length
  const stageIds = config.pipeline.map((p) => p.id)
  const queued = count((s) => s === stageIds[0])
  const inFlight = count((s) => stageIds.includes(s)) - queued
  const done = count((s) => s === 'done')
  const totalProcessed = allAgents.reduce((a, x) => a + x.processed, 0)

  // one node per pipeline stage, then any floating agents, then the reporting agent
  const nodes = [
    ...config.pipeline.map((p) => ({
      key: p.id,
      short: p.short,
      queue: count((s) => s === p.id),
      agent: agentById(p.agentId),
      reporting: false,
      flex: false,
    })),
    ...flexAgents.map((a) => ({
      key: a.id,
      short: 'Floating',
      queue: 0,
      agent: a,
      reporting: false,
      flex: true,
    })),
    {
      key: 'report',
      short: 'Report',
      queue: done,
      agent: agentById(config.reportAgentId),
      reporting: true,
      flex: false,
    },
  ]

  return (
    <Panel
      title="Current Workflow Pipeline"
      icon={<Workflow size={14} />}
      className="shrink-0"
      bodyClass={cn('p-3 flex flex-col gap-2', collapsed && 'hidden')}
      right={
        <div className="flex items-center gap-2">
          {collapsed && (
            <span className="hidden text-[0.74rem] text-dim sm:inline">
              {config.labels.doneStat} <b className="tabular-nums text-teal">{done}</b> · In progress{' '}
              <b className="tabular-nums text-txt">{inFlight}</b>
            </span>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand workflow pipeline' : 'Minimise workflow pipeline'}
            title={collapsed ? 'Expand' : 'Minimise'}
            className="flex items-center rounded-md px-1.5 py-1 text-dim ring-1 ring-edge-soft transition hover:text-txt hover:ring-cyan/40"
          >
            {collapsed ? <ChevronsUpDown size={13} /> : <ChevronsDownUp size={13} />}
          </button>
        </div>
      }
    >
      <div className="flex items-start justify-between">
        {nodes.map((n, i) => {
          if (!n.agent) return null
          const a = n.agent
          const current = docs.find((d) => d.id === a.currentDocId)
          const active = a.status === 'processing'
          const prog = n.reporting
            ? phase === 'reporting'
              ? reportProgress
              : phase === 'done'
                ? 100
                : 0
            : current?.progress ?? 0
          return (
            <div key={n.key} className="flex flex-1 items-start">
              <div className="flex flex-1 flex-col items-center gap-1 text-center">
                <MiniRing progress={prog} active={active} avatar={a.avatar} name={a.name} />
                <div className="text-[0.82rem] font-semibold leading-none text-txt">{a.name.replace('Agent ', '')}</div>
                <div className="text-[0.66rem] leading-none text-dim">
                  {n.short} ·{' '}
                  <span className={active ? 'text-teal' : ''}>
                    {n.flex
                      ? current
                        ? current.ref
                        : 'any stage'
                      : n.reporting
                        ? `${n.queue} ready`
                        : `${n.queue} queued`}
                  </span>
                </div>
              </div>
              {i < nodes.length - 1 && (
                <Connector flowing={active || nodes[i + 1].agent?.status === 'processing'} />
              )}
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
          {config.labels.doneStat} <b className="tabular-nums text-teal">{done}</b>
        </span>
        <span>
          Steps run <b className="tabular-nums text-txt">{totalProcessed}</b>
        </span>
        {flexAgents.length > 0 && (
          <span className="text-teal">
            +{flexAgents.length} floating agent{flexAgents.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </Panel>
  )
}

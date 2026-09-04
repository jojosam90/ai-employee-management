import { useMemo, useState } from 'react'
import { Radio, Search } from 'lucide-react'
import { useSim } from '@/engine/store'
import { AGENT_NAME } from '@/engine/agents'
import { Panel } from './ui'
import { cn } from '@/lib/cn'

const LEVEL_TONE: Record<string, string> = {
  info: 'text-dim',
  success: 'text-teal',
  warn: 'text-amber',
  error: 'text-red',
}
const AGENT_TONE: Record<string, string> = {
  alpha: 'text-cyan',
  beta: 'text-violet',
  gamma: 'text-teal',
  delta: 'text-blue',
  system: 'text-faint',
  boss: 'text-amber',
}

export default function CommunicationsLog() {
  const logs = useSim((s) => s.logs)
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return logs
    return logs.filter(
      (l) => l.message.toLowerCase().includes(needle) || (AGENT_NAME[l.agent] ?? l.agent).toLowerCase().includes(needle),
    )
  }, [logs, q])

  return (
    <Panel
      title="Agent Communications & Logs"
      icon={<Radio size={14} />}
      bodyClass="p-0 flex flex-col min-h-0"
      className="xl:min-h-0 xl:flex-[3]"
    >
      <div className="flex items-center gap-2 border-b border-edge-soft px-3 py-2">
        <Search size={13} className="text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search log…"
          className="w-full bg-transparent text-[0.88rem] text-txt placeholder:text-faint focus:outline-none"
        />
      </div>
      <div className="min-h-[160px] flex-1 space-y-1 overflow-y-auto scroll-thin p-2.5">
        {filtered.length === 0 && <p className="px-1 py-6 text-center text-[0.86rem] text-faint">No matching entries.</p>}
        {filtered.map((l) => (
          <div key={l.id} className="rounded border border-edge-soft/60 bg-white/[0.015] px-2 py-1.5 text-[0.86rem] leading-snug">
            <div className="flex items-center gap-1.5">
              <span className={cn('font-semibold', AGENT_TONE[l.agent] ?? 'text-dim')}>
                {AGENT_NAME[l.agent] ?? l.agent}
              </span>
              <span className="ml-auto tabular-nums text-[0.76rem] text-faint">
                {new Date(l.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <p className={cn('mt-0.5', LEVEL_TONE[l.level])}>{l.message}</p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

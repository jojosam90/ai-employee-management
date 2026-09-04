import { useEffect, useState } from 'react'
import { useSim } from '@/engine/store'
import { cn } from '@/lib/cn'
import SessionControls from './SessionControls'

export default function Header() {
  const [now, setNow] = useState(() => new Date())
  const phase = useSim((s) => s.phase)
  const brandLine = useSim((s) => s.config.brandLine)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const statusText =
    phase === 'running'
      ? 'PROCESSING'
      : phase === 'reporting'
        ? 'PREPARING SUMMARY'
        : phase === 'done'
          ? 'SUMMARY READY'
          : phase === 'standby'
            ? 'STANDBY · AWAITING INSTRUCTION'
            : 'INITIALISING'
  const statusTone =
    phase === 'done' ? 'text-teal' : phase === 'standby' ? 'text-amber' : phase === 'idle' ? 'text-dim' : 'text-cyan'

  return (
    <header className="panel flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <img src="/logo.svg" alt="" className="h-8 w-8" />
        <div className="leading-tight">
          <h1 className="text-sm font-semibold tracking-[0.14em] text-txt">
            AI EMPLOYEE MANAGEMENT DASHBOARD
          </h1>
          <p className="text-[0.82rem] tracking-[0.22em] text-cyan">{brandLine}</p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-4 text-[0.86rem]">
        <div className="hidden sm:block">
          <span className="text-faint">System time </span>
          <span className="tabular-nums text-txt">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        <div>
          <span className="text-faint">Status </span>
          <span className={cn('font-semibold tracking-wide', statusTone)}>{statusText}</span>
        </div>

        <div className="mx-1 hidden h-5 w-px bg-edge-soft lg:block" />
        <SessionControls />
      </div>
    </header>
  )
}

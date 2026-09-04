import { useEffect, useState } from 'react'
import { Cpu, Pause, Play, RotateCcw, Gauge } from 'lucide-react'
import { useSim } from '@/engine/store'
import { cn } from '@/lib/cn'
import SessionControls from './SessionControls'

const SPEEDS = [1, 2, 4, 8]

export default function Header() {
  const [now, setNow] = useState(() => new Date())
  const phase = useSim((s) => s.phase)
  const running = useSim((s) => s.running)
  const speed = useSim((s) => s.speed)
  const toggleRunning = useSim((s) => s.toggleRunning)
  const setSpeed = useSim((s) => s.setSpeed)
  const reset = useSim((s) => s.reset)
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
        <span className="grid h-8 w-8 place-items-center rounded-md bg-cyan/10 text-cyan ring-1 ring-cyan/30">
          <Cpu size={18} />
        </span>
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

        <div className="flex items-center gap-1 rounded-md bg-bg-2 p-0.5 ring-1 ring-edge-soft">
          <Gauge size={13} className="mx-1 text-faint" />
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                'rounded px-1.5 py-0.5 text-[0.82rem] tabular-nums transition',
                speed === s ? 'bg-cyan/20 text-cyan' : 'text-dim hover:text-txt',
              )}
            >
              {s}×
            </button>
          ))}
        </div>

        <button
          onClick={toggleRunning}
          className="flex items-center gap-1 rounded-md bg-bg-2 px-2 py-1 text-dim ring-1 ring-edge-soft hover:text-txt"
        >
          {running ? <Pause size={13} /> : <Play size={13} />}
          {running ? 'Pause' : 'Resume'}
        </button>
        <button
          onClick={reset}
          className="flex items-center gap-1 rounded-md bg-bg-2 px-2 py-1 text-dim ring-1 ring-edge-soft hover:text-txt"
        >
          <RotateCcw size={13} />
          Reset
        </button>

        <div className="mx-1 hidden h-5 w-px bg-edge-soft lg:block" />
        <SessionControls />
      </div>
    </header>
  )
}

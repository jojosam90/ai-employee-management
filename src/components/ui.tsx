import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Panel({
  title,
  icon,
  right,
  className,
  bodyClass,
  children,
}: {
  title?: string
  icon?: ReactNode
  right?: ReactNode
  className?: string
  bodyClass?: string
  children: ReactNode
}) {
  return (
    <section className={cn('panel flex flex-col overflow-hidden', className)}>
      {title && (
        <header className="flex items-center gap-2 px-3.5 py-2.5 border-b border-edge-soft/70">
          {icon && <span className="text-cyan">{icon}</span>}
          <h2 className="panel-title flex-1">{title}</h2>
          {right}
        </header>
      )}
      <div className={cn('flex-1 min-h-0 p-3.5', bodyClass)}>{children}</div>
    </section>
  )
}

export function ProgressBar({
  value,
  className,
  tone = 'cyan',
  showLabel = false,
}: {
  value: number
  className?: string
  tone?: 'cyan' | 'teal' | 'amber' | 'red' | 'blue'
  showLabel?: boolean
}) {
  const bar =
    tone === 'teal'
      ? 'bg-teal'
      : tone === 'amber'
        ? 'bg-amber'
        : tone === 'red'
          ? 'bg-red'
          : tone === 'blue'
            ? 'bg-blue'
            : 'bg-cyan'
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative h-1.5 flex-1 rounded-full bg-bg-2 overflow-hidden ring-1 ring-inset ring-edge-soft">
        <div
          className={cn('absolute inset-y-0 left-0 rounded-full transition-[width] duration-500', bar)}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-[0.84rem] tabular-nums text-dim w-9 text-right">{Math.round(value)}%</span>
      )}
    </div>
  )
}

export function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    idle: 'bg-faint',
    processing: 'bg-teal',
    active: 'bg-teal',
    paused: 'bg-amber',
    blocked: 'bg-red',
    running: 'bg-teal',
    done: 'bg-cyan',
    reporting: 'bg-violet',
  }
  return (
    <span className="relative flex h-2 w-2">
      {(status === 'processing' || status === 'active' || status === 'running') && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-60" />
      )}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', map[status] ?? 'bg-faint')} />
    </span>
  )
}

export function Avatar({ id, name, size = 40 }: { id: number; name: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(-2)
    .join('')
  if (failed) {
    return (
      <div
        className="grid place-items-center rounded-full bg-panel-2 text-cyan font-semibold ring-1 ring-cyan/40"
        style={{ width: size, height: size, fontSize: size * 0.34 }}
      >
        {initials}
      </div>
    )
  }
  return (
    <img
      src={`https://i.pravatar.cc/128?img=${id}`}
      alt={name}
      onError={() => setFailed(true)}
      className="rounded-full object-cover ring-1 ring-cyan/40"
      style={{ width: size, height: size }}
    />
  )
}

export function Chip({ children, tone = 'cyan' }: { children: ReactNode; tone?: 'cyan' | 'teal' | 'amber' | 'red' | 'dim' }) {
  const map = {
    cyan: 'text-cyan bg-cyan/10 ring-cyan/30',
    teal: 'text-teal bg-teal/10 ring-teal/30',
    amber: 'text-amber bg-amber/10 ring-amber/30',
    red: 'text-red bg-red/10 ring-red/30',
    dim: 'text-dim bg-white/5 ring-edge-soft',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[0.78rem] font-medium uppercase tracking-wide ring-1 ring-inset', map[tone])}>
      {children}
    </span>
  )
}

import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Cpu, ChevronDown, ArrowRight, User } from 'lucide-react'
import { useAuth, TEAMS, initials, type TeamId } from '@/auth/useAuth'

export default function Login() {
  const navigate = useNavigate()
  const session = useAuth((s) => s.session)
  const lastUser = useAuth((s) => s.lastUser)
  const lastTeam = useAuth((s) => s.lastTeam)
  const login = useAuth((s) => s.login)

  const [name, setName] = useState('')
  const [team, setTeam] = useState<TeamId>(lastTeam)

  if (session) return <Navigate to={`/${session.team}`} replace />

  const quickUser = lastUser ?? 'Consap'

  const go = (user: string, t: TeamId) => {
    login(user, t)
    navigate(`/${t}`, { replace: true })
  }

  const continueAs = () => go(quickUser, lastTeam)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    go(name.trim() || 'Guest User', team)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="panel w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-cyan/10 text-cyan ring-1 ring-cyan/30">
            <Cpu size={19} />
          </span>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold tracking-[0.12em] text-txt">AI EMPLOYEE MANAGEMENT</h1>
            <p className="text-[0.8rem] tracking-[0.2em] text-cyan">OPERATIONS CONSOLE</p>
          </div>
        </div>

        <button
          type="button"
          onClick={continueAs}
          className="flex w-full items-center gap-3 rounded-xl border border-violet/40 bg-violet/[0.1] px-3 py-3 text-left transition hover:bg-violet/20"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet text-[0.95rem] font-semibold text-white">
            {initials(quickUser)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.95rem] font-semibold text-txt">{quickUser}</span>
            <span className="block text-[0.72rem] uppercase tracking-wide text-dim">Continue as this user</span>
          </span>
          <ArrowRight size={17} className="shrink-0 text-violet" />
        </button>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-edge-soft" />
          <span className="text-[0.72rem] uppercase tracking-[0.12em] text-faint">or sign in as someone else</span>
          <span className="h-px flex-1 bg-edge-soft" />
        </div>

        <form onSubmit={submit}>
          <label className="mb-1 block text-[0.82rem] uppercase tracking-wide text-dim">Full name</label>
          <div className="relative mb-3">
            <User size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md bg-bg-2 py-2 pl-9 pr-3 text-[0.9rem] text-txt ring-1 ring-edge-soft placeholder:text-faint focus:outline-none focus:ring-cyan/40"
              placeholder="Taylor Smith"
            />
          </div>

          <label className="mb-1 block text-[0.82rem] uppercase tracking-wide text-dim">Operations to view</label>
          <div className="relative mb-4">
            <select
              value={team}
              onChange={(e) => setTeam(e.target.value as TeamId)}
              className="w-full appearance-none rounded-md bg-bg-2 px-3 py-2 pr-8 text-[0.9rem] text-txt ring-1 ring-edge-soft focus:outline-none focus:ring-cyan/40"
            >
              {TEAMS.map((t) => (
                <option key={t.id} value={t.id} className="bg-panel">
                  {t.label}
                  {t.ready ? '' : '  (preview)'}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-faint" />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-cyan/15 px-3 py-2.5 text-[0.95rem] font-semibold text-cyan ring-1 ring-cyan/30 transition hover:bg-cyan/25"
          >
            Enter Dashboard <ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>
  )
}

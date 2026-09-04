import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronDown } from 'lucide-react'
import { useAuth, VISIBLE_TEAMS, type TeamId } from '@/auth/useAuth'

export default function SessionControls() {
  const navigate = useNavigate()
  const session = useAuth((s) => s.session)
  const logout = useAuth((s) => s.logout)
  const switchTeam = useAuth((s) => s.switchTeam)

  if (!session) return null

  const onSwitch = (team: TeamId) => {
    switchTeam(team)
    navigate(`/${team}`)
  }

  return (
    <div className="flex items-center gap-2 text-[0.86rem]">
      <div className="hidden text-right leading-tight sm:block">
        <div className="text-txt">{session.user}</div>
        <div className="text-faint">signed in</div>
      </div>

      <div className="relative">
        <select
          value={session.team}
          onChange={(e) => onSwitch(e.target.value as TeamId)}
          className="appearance-none rounded-md bg-bg-2 py-1 pl-2 pr-6 text-[0.86rem] text-txt ring-1 ring-edge-soft focus:outline-none focus:ring-cyan/40"
          aria-label="Switch team view"
        >
          {VISIBLE_TEAMS.map((t) => (
            <option key={t.id} value={t.id} className="bg-panel">
              {t.label}
            </option>
          ))}
        </select>
        <ChevronDown size={12} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-faint" />
      </div>

      <button
        onClick={() => {
          logout()
          navigate('/login', { replace: true })
        }}
        className="flex items-center gap-1 rounded-md bg-bg-2 px-2 py-1 text-dim ring-1 ring-edge-soft hover:text-red hover:ring-red/40"
      >
        <LogOut size={13} />
        Log out
      </button>
    </div>
  )
}

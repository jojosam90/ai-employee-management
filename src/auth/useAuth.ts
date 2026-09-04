import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TeamId = 'product' | 'finance' | 'sales' | 'engineering'

export interface TeamMeta {
  id: TeamId
  label: string
  tagline: string
  ready: boolean
}

export const TEAMS: TeamMeta[] = [
  { id: 'product', label: 'Product Team', tagline: 'Roadmap, releases & discovery agents', ready: false },
  { id: 'finance', label: 'Finance Team', tagline: 'Document processing, forecast & risk', ready: true },
  { id: 'sales', label: 'Sales Team', tagline: 'Pipeline, quota & deal-desk agents', ready: false },
  { id: 'engineering', label: 'Engineering Team', tagline: 'Delivery, incident & review agents', ready: false },
]

export function teamMeta(id: TeamId): TeamMeta {
  return TEAMS.find((t) => t.id === id) ?? TEAMS[1]
}

interface Session {
  user: string
  team: TeamId
  since: number
}

interface AuthState {
  session: Session | null
  /** The last person to sign in — kept after logout so "Continue as…" can be offered. */
  lastUser: string | null
  lastTeam: TeamId
  login: (user: string, team: TeamId) => void
  logout: () => void
  switchTeam: (team: TeamId) => void
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      lastUser: null,
      lastTeam: 'finance',
      login: (user, team) => {
        const name = user.trim()
        set({ session: { user: name, team, since: Date.now() }, lastUser: name, lastTeam: team })
      },
      logout: () => set({ session: null }),
      switchTeam: (team) =>
        set((s) => (s.session ? { session: { ...s.session, team }, lastTeam: team } : s)),
    }),
    { name: 'ade-session' },
  ),
)

export function initials(name: string) {
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

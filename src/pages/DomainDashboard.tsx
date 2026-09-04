import { useEffect } from 'react'
import { useSim } from '@/engine/store'
import { useAuth, type TeamId } from '@/auth/useAuth'
import type { DomainConfig } from '@/domains/config'
import Header from '@/components/Header'
import AgentOverview from '@/components/AgentOverview'
import WorkflowPipeline from '@/components/WorkflowPipeline'
import CommunicationsLog from '@/components/CommunicationsLog'
import InstructionsPanel from '@/components/InstructionsPanel'
import ExecutiveSummary from '@/components/ExecutiveSummary'
import WorkSurface from '@/components/WorkSurface'

const TICK_MS = 900

export default function DomainDashboard({ config }: { config: DomainConfig }) {
  const loadDomain = useSim((s) => s.loadDomain)
  const tick = useSim((s) => s.tick)
  const activeId = useSim((s) => s.config.id)
  const switchTeam = useAuth((s) => s.switchTeam)
  const sessionTeam = useAuth((s) => s.session?.team)

  useEffect(() => {
    loadDomain(config)
    if (sessionTeam && sessionTeam !== config.id) switchTeam(config.id as TeamId)
  }, [loadDomain, config, sessionTeam, switchTeam])

  useEffect(() => {
    const id = setInterval(tick, TICK_MS)
    return () => clearInterval(id)
  }, [tick])

  if (activeId !== config.id) {
    return <div className="grid min-h-screen place-items-center text-[0.9rem] text-dim">Loading workspace…</div>
  }

  return (
    <div className="min-h-screen xl:h-screen xl:overflow-hidden">
      <div className="mx-auto flex max-w-[1880px] flex-col gap-3 p-3 xl:h-full">
        <Header />

        <div className="grid min-h-0 grid-cols-1 gap-3 xl:flex-1 xl:grid-cols-[350px_minmax(0,1fr)_400px]">
          <div className="flex min-h-0 flex-col gap-3">
            <AgentOverview />
          </div>

          <div className="flex min-h-0 flex-col gap-3">
            <WorkflowPipeline />
            <WorkSurface key={config.id} />
          </div>

          <div className="flex min-h-0 flex-col gap-3">
            <CommunicationsLog />
            <InstructionsPanel />
            <ExecutiveSummary />
          </div>
        </div>

        <footer className="shrink-0 px-1 text-center text-[0.78rem] text-faint">
          {config.footerLine}
        </footer>
      </div>
    </div>
  )
}

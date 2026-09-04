import { useEffect } from 'react'
import { useSim } from '@/engine/store'
import Header from '@/components/Header'
import AgentOverview from '@/components/AgentOverview'
import WorkflowPipeline from '@/components/WorkflowPipeline'
import CommunicationsLog from '@/components/CommunicationsLog'
import InstructionsPanel from '@/components/InstructionsPanel'
import ExecutiveSummary from '@/components/ExecutiveSummary'
import WorkSurface from '@/components/WorkSurface'

const TICK_MS = 900

export default function FinanceDashboard() {
  const init = useSim((s) => s.init)
  const tick = useSim((s) => s.tick)

  useEffect(() => {
    init()
    const id = setInterval(tick, TICK_MS)
    return () => clearInterval(id)
  }, [init, tick])

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
            <WorkSurface />
          </div>

          <div className="flex min-h-0 flex-col gap-3">
            <CommunicationsLog />
            <InstructionsPanel />
            <ExecutiveSummary />
          </div>
        </div>

        <footer className="shrink-0 px-1 text-center text-[0.78rem] text-faint">
          Finance-agent workspace · Local document processing · Zero cloud data leakage
        </footer>
      </div>
    </div>
  )
}

import { Cpu, Hammer, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { teamMeta, type TeamId } from '@/auth/useAuth'
import SessionControls from '@/components/SessionControls'

const PLANNED: Record<TeamId, string[]> = {
  product: ['Discovery & feedback triage agent', 'Release-notes drafting agent', 'Roadmap risk & dependency agent', 'Experiment readout agent'],
  sales: ['Pipeline hygiene agent', 'Quote & deal-desk agent', 'Forecast roll-up agent', 'Churn-risk watch agent'],
  engineering: ['PR review & merge-readiness agent', 'Incident summary agent', 'Delivery / sprint burn agent', 'Dependency & CVE agent'],
  finance: [],
}

export default function TeamPlaceholder({ team }: { team: TeamId }) {
  const meta = teamMeta(team)
  const planned = PLANNED[team]

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1680px] flex-col gap-3 p-3">
        <header className="panel flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-cyan/10 text-cyan ring-1 ring-cyan/30">
              <Cpu size={18} />
            </span>
            <div className="leading-tight">
              <h1 className="text-sm font-semibold tracking-[0.14em] text-txt">
                AI EMPLOYEE MANAGEMENT DASHBOARD
              </h1>
              <p className="text-[0.82rem] tracking-[0.22em] text-cyan">
                {meta.label.toUpperCase()} · TEAM ADVANTECH
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <SessionControls />
          </div>
        </header>

        <section className="panel flex flex-1 flex-col items-center justify-center gap-5 px-6 py-20 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-cyan/10 text-cyan ring-1 ring-cyan/30">
            <Hammer size={26} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-txt">{meta.label} console — in build</h2>
            <p className="mt-1 max-w-md text-[0.8rem] text-dim">{meta.tagline}. This workspace isn't wired up yet.</p>
          </div>

          {planned.length > 0 && (
            <ul className="grid max-w-md gap-1.5 text-left">
              {planned.map((p) => (
                <li key={p} className="flex items-center gap-2 rounded-md border border-edge-soft bg-bg-2/50 px-3 py-1.5 text-[0.9rem] text-txt/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
                  {p}
                </li>
              ))}
            </ul>
          )}

          <Link
            to="/finance"
            className="mt-2 flex items-center gap-1.5 rounded-md bg-cyan/15 px-3 py-2 text-[0.92rem] font-medium text-cyan ring-1 ring-cyan/30 hover:bg-cyan/25"
          >
            Open the Finance console <ArrowRight size={14} />
          </Link>
        </section>
      </div>
    </div>
  )
}

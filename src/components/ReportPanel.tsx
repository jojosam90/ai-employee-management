import { useState } from 'react'
import { TrendingUp, ShoppingCart, Loader2 } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useSim } from '@/engine/store'
import { Chip } from './ui'
import { money, pct } from '@/lib/cn'
import type { Report } from '@/types'

const TABS = ['Summary', 'Spend', 'Forecast', 'Recommendations'] as const
type Tab = (typeof TABS)[number]

// Muted, harmonious categorical palette — matches the app accent hues.
const CAT_COLORS = [
  '#6db4b4',
  '#74bfa8',
  '#7d9dc4',
  '#9c96c0',
  '#d3a56b',
  '#cf8a8a',
  '#89b59b',
  '#a6adb7',
]

export function ReportView() {
  const report = useSim((s) => s.report)
  const phase = useSim((s) => s.phase)
  const reportProgress = useSim((s) => s.reportProgress)
  const [tab, setTab] = useState<Tab>('Summary')

  if (!report) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <Loader2 className="animate-spin text-cyan" size={26} />
        <p className="text-[0.9rem] text-txt">
          {phase === 'reporting'
            ? `Agent Delta is writing the executive summary… ${Math.round(reportProgress)}%`
            : phase === 'standby'
              ? 'Send an instruction to start processing — the summary follows once every document is reconciled.'
              : 'The executive summary is prepared once every document is reconciled.'}
        </p>
        <p className="max-w-md text-[0.84rem] text-dim">
          A plain-language summary for the boss, the spend breakdown, next-month forecast and prioritised
          recommendations will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 overflow-x-auto border-b border-edge-soft px-3 pt-2 scroll-thin">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'whitespace-nowrap rounded-t-md px-3 py-1.5 text-[0.88rem] font-medium transition ' +
              (tab === t ? 'bg-bg-2 text-cyan ring-1 ring-b-0 ring-edge-soft' : 'text-dim hover:text-txt')
            }
          >
            {t}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin p-4">
        {tab === 'Summary' && <Summary report={report} />}
        {tab === 'Spend' && <Spend report={report} />}
        {tab === 'Forecast' && <Forecast report={report} />}
        {tab === 'Recommendations' && <Savings report={report} />}
      </div>
    </div>
  )
}

function Kpi({ label, value, tone = 'txt', sub }: { label: string; value: string; tone?: string; sub?: string }) {
  const c =
    tone === 'teal' ? 'text-teal' : tone === 'amber' ? 'text-amber' : tone === 'red' ? 'text-red' : 'text-txt'
  return (
    <div className="rounded-lg border border-edge-soft bg-bg-2/60 px-3 py-2.5">
      <div className="text-[0.76rem] uppercase tracking-wide text-faint">{label}</div>
      <div className={'mt-1 text-lg font-semibold tabular-nums ' + c}>{value}</div>
      {sub && <div className="text-[0.78rem] text-dim">{sub}</div>}
    </div>
  )
}

function Summary({ report }: { report: Report }) {
  const savingsTotal = report.savings.reduce((a, s) => a + s.estMonthly, 0)
  const trend = report.forecastTotal - report.monthly.at(-1)!.total
  const chart = report.monthly.map((m) => ({ ...m, name: m.month }))
  chart.push({ month: 'Next*', name: 'Next*', total: report.forecastTotal })

  return (
    <div className="space-y-4">
      <ul className="space-y-1.5 rounded-lg border border-edge-soft bg-bg-2/40 p-3">
        {report.summary.map((s, i) => (
          <li key={i} className="flex gap-2 text-[0.88rem] leading-snug text-txt/90">
            <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
            {s}
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Kpi label="Total spend" value={money(report.totalSpend)} />
        <Kpi
          label="Forecast next month"
          value={money(report.forecastTotal)}
          tone={trend > 0 ? 'amber' : 'teal'}
          sub={`${trend > 0 ? '▲' : '▼'} ${money(Math.abs(trend))} vs last month`}
        />
        <Kpi label="Documents analysed" value={String(report.documentsAnalyzed)} />
        <Kpi label="Identified savings / mo" value={money(savingsTotal)} tone="teal" />
      </div>

      <div className="flex h-[230px] flex-col rounded-lg border border-edge-soft bg-bg-2/40 p-3">
        <div className="mb-1 text-[0.82rem] uppercase tracking-wide text-dim">Monthly spend · S$  (Next* = forecast)</div>
        <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} margin={{ top: 6, right: 8, bottom: 4, left: -8 }}>
            <CartesianGrid stroke="var(--color-edge-soft)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--color-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: 'var(--color-faint)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              contentStyle={tipStyle}
              formatter={(v) => money(Number(v))}
            />
            <Bar dataKey="total" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {chart.map((_, i) => (
                <Cell key={i} fill={i === chart.length - 1 ? 'var(--color-amber)' : 'var(--color-teal)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>

      <p className="text-[0.8rem] text-faint">
        * Forecast blends a least-squares trend line with the trailing 3-month average per category.
      </p>
    </div>
  )
}

function Spend({ report }: { report: Report }) {
  const max = report.byCategory[0]?.total ?? 1
  return (
    <div className="space-y-2">
      {report.byCategory.map((c, i) => (
        <div key={c.category} className="rounded-lg border border-edge-soft bg-bg-2/40 px-3 py-2">
          <div className="flex items-center gap-2 text-[0.9rem]">
            <span className="h-2 w-2 rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
            <span className="font-medium text-txt">{c.category}</span>
            <span className="ml-auto tabular-nums text-txt">{money(c.total)}</span>
            <span className="w-12 text-right tabular-nums text-dim">{pct(c.share)}</span>
            <span
              className={
                'w-16 text-right tabular-nums ' +
                (c.momChange > 0.05 ? 'text-red' : c.momChange < -0.05 ? 'text-teal' : 'text-faint')
              }
            >
              {c.momChange >= 0 ? '+' : ''}
              {pct(c.momChange)} MoM
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-bg-2">
            <div
              className="h-full rounded-full"
              style={{ width: `${(c.total / max) * 100}%`, background: CAT_COLORS[i % CAT_COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function Forecast({ report }: { report: Report }) {
  const data = report.forecast.map((f) => ({
    name: f.category.replace(/ &.*/, ''),
    Last: Math.round(f.lastMonth),
    Next: f.nextMonth,
    change: f.change,
  }))
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-[0.88rem] text-dim">Projected total next month</span>
        <span className="text-xl font-semibold tabular-nums text-amber">{money(report.forecastTotal)}</span>
      </div>
      <div className="h-[240px] rounded-lg border border-edge-soft bg-bg-2/40 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 8, bottom: 4, left: -8 }}>
            <CartesianGrid stroke="var(--color-edge-soft)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--color-dim)', fontSize: 9 }} axisLine={false} tickLine={false} interval={0} angle={-18} height={44} textAnchor="end" />
            <YAxis
              tick={{ fill: 'var(--color-faint)', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={tipStyle} formatter={(v) => money(Number(v))} />
            <Bar dataKey="Last" fill="var(--color-faint)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="Next" fill="var(--color-cyan)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {report.forecast
          .filter((f) => Math.abs(f.change) > 0.02)
          .sort((a, b) => b.change - a.change)
          .map((f) => (
            <div key={f.category} className="flex items-center gap-2 rounded-md border border-edge-soft bg-bg-2/40 px-2.5 py-1.5 text-[0.86rem]">
              <span className="flex-1 text-txt">{f.category}</span>
              <span className="tabular-nums text-dim">{money(f.nextMonth)}</span>
              <span className={'tabular-nums ' + (f.change > 0 ? 'text-red' : 'text-teal')}>
                {f.change > 0 ? '+' : ''}
                {pct(f.change)}
              </span>
            </div>
          ))}
      </div>
    </div>
  )
}

function Savings({ report }: { report: Report }) {
  const total = report.savings.reduce((a, s) => a + s.estMonthly, 0)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-teal/30 bg-teal/[0.06] px-3 py-2 text-[0.82rem] text-teal">
        <TrendingUp size={15} />
        Estimated recoverable spend: <span className="font-semibold tabular-nums">{money(total)}/month</span>
        <span className="text-dim">· {money(total * 12)}/year</span>
      </div>

      {report.risks[0] && (
        <div className="rounded-lg border border-amber/30 bg-amber/[0.05] p-3 text-[0.84rem]">
          <div className="font-semibold text-txt">Watch point: {report.risks[0].title}</div>
          <p className="mt-1 leading-snug text-dim">{report.risks[0].detail}</p>
        </div>
      )}

      <div className="space-y-2">
        {report.savings.map((s) => (
          <div key={s.id} className="rounded-lg border border-edge-soft bg-bg-2/40 p-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-teal" />
              <span className="text-[0.8rem] font-semibold text-txt">{s.title}</span>
              <Chip tone="dim">{s.effort} effort</Chip>
              <span className="ml-auto text-[0.9rem] font-semibold tabular-nums text-teal">{money(s.estMonthly)}/mo</span>
            </div>
            <p className="mt-1.5 text-[0.88rem] leading-snug text-dim">{s.detail}</p>
          </div>
        ))}
      </div>

      {report.buys.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-[0.86rem] uppercase tracking-wide text-cyan">
            <ShoppingCart size={13} /> What to buy / pre-purchase
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {report.buys.map((b) => (
              <div key={b.id} className="rounded-lg border border-cyan/25 bg-cyan/[0.04] p-3">
                <div className="flex items-center gap-2">
                  <span className="text-[0.95rem] font-semibold text-txt">{b.item}</span>
                  <span className="ml-auto text-[0.86rem] tabular-nums text-teal">save ≈ {money(b.estSaving)}</span>
                </div>
                <p className="mt-1 text-[0.84rem] text-dim">{b.reason}</p>
                <p className="mt-1 text-[0.84rem] text-txt/80">
                  <span className="text-faint">Action: </span>
                  {b.suggestedQty} · <span className="text-faint">Vendor: </span>
                  {b.vendor}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const tipStyle = {
  background: 'var(--color-panel)',
  border: '1px solid var(--color-edge)',
  borderRadius: 8,
  fontSize: 11,
} as const

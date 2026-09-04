import type {
  BuyRecommendation,
  Category,
  CategoryTotal,
  FinancialDoc,
  ForecastRow,
  MonthTotal,
  Report,
  RiskFlag,
  SavingIdea,
} from '@/types'
import { MONTHS } from './seed'

function monthKey(iso: string) {
  const m = Number(iso.slice(5, 7))
  return ['', '', '', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][m] ?? '?'
}

const ALL_CATEGORIES: Category[] = [
  'Cloud & Software',
  'Hardware',
  'Logistics & Freight',
  'Office & Facilities',
  'Travel & Entertainment',
  'Marketing',
  'Professional Fees',
  'Utilities',
]

/** Least-squares slope + intercept for y over x = 0..n-1 */
function linreg(y: number[]) {
  const n = y.length
  if (n === 0) return { slope: 0, intercept: 0 }
  const xMean = (n - 1) / 2
  const yMean = y.reduce((a, b) => a + b, 0) / n
  let num = 0
  let den = 0
  y.forEach((v, i) => {
    num += (i - xMean) * (v - yMean)
    den += (i - xMean) ** 2
  })
  const slope = den === 0 ? 0 : num / den
  return { slope, intercept: yMean - slope * xMean }
}

export function analyze(docs: FinancialDoc[]): Report {
  const priced = docs.filter((d) => d.amount > 0)

  // ---- Monthly totals ----
  const monthly: MonthTotal[] = MONTHS.map((month) => ({
    month,
    total: priced
      .filter((d) => monthKey(d.date) === month)
      .reduce((a, d) => a + d.amount, 0),
  }))
  const totalSpend = monthly.reduce((a, m) => a + m.total, 0)

  // ---- Category breakdown ----
  const lastM = MONTHS[MONTHS.length - 1]
  const prevM = MONTHS[MONTHS.length - 2]
  const byCategory: CategoryTotal[] = ALL_CATEGORIES.map((category) => {
    const rows = priced.filter((d) => d.category === category)
    const total = rows.reduce((a, d) => a + d.amount, 0)
    const last = rows.filter((d) => monthKey(d.date) === lastM).reduce((a, d) => a + d.amount, 0)
    const prev = rows.filter((d) => monthKey(d.date) === prevM).reduce((a, d) => a + d.amount, 0)
    return {
      category,
      total,
      share: totalSpend ? total / totalSpend : 0,
      momChange: prev ? (last - prev) / prev : 0,
    }
  })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)

  // ---- Forecast (per category, linear on monthly series) ----
  const forecast: ForecastRow[] = byCategory.map((c) => {
    const series = MONTHS.map((m) =>
      priced
        .filter((d) => d.category === c.category && monthKey(d.date) === m)
        .reduce((a, d) => a + d.amount, 0),
    )
    const { slope, intercept } = linreg(series)
    const raw = intercept + slope * MONTHS.length
    const recentAvg = (series.at(-1)! + series.at(-2)! + series.at(-3)!) / 3
    // blend trend line with recent average to avoid wild extrapolation
    const nextMonth = Math.max(0, Math.round(raw * 0.6 + recentAvg * 0.4))
    const lastMonth = series.at(-1)!
    return {
      category: c.category,
      lastMonth,
      nextMonth,
      change: lastMonth ? (nextMonth - lastMonth) / lastMonth : 0,
    }
  })
  const forecastTotal = forecast.reduce((a, r) => a + r.nextMonth, 0)

  // ---- Risks ----
  const risks: RiskFlag[] = []
  byCategory.forEach((c) => {
    const series = MONTHS.map((m) =>
      priced
        .filter((d) => d.category === c.category && monthKey(d.date) === m)
        .reduce((a, d) => a + d.amount, 0),
    )
    const last = series.at(-1)!
    const trailingAvg = (series.at(-2)! + series.at(-3)! + series.at(-4)!) / 3
    if (trailingAvg > 0 && last > trailingAvg * 1.35) {
      risks.push({
        id: `risk-${c.category}`,
        level: last > trailingAvg * 1.9 ? 'high' : 'medium',
        category: c.category,
        title: `${c.category} spend is spiking`,
        detail: `${lastM} spend of S$${Math.round(last).toLocaleString()} is ${Math.round(
          (last / trailingAvg - 1) * 100,
        )}% above the prior 3-month average of S$${Math.round(trailingAvg).toLocaleString()}.`,
        impact: Math.round(last - trailingAvg),
      })
    }
  })

  // Vendor concentration
  const byVendor = new Map<string, number>()
  priced.forEach((d) => byVendor.set(d.vendor, (byVendor.get(d.vendor) ?? 0) + d.amount))
  const topVendor = [...byVendor.entries()].sort((a, b) => b[1] - a[1])[0]
  if (topVendor && totalSpend && topVendor[1] / totalSpend > 0.14) {
    risks.push({
      id: 'risk-vendor-concentration',
      level: 'medium',
      category: 'Overall',
      title: `Vendor concentration: ${topVendor[0]}`,
      detail: `${topVendor[0]} accounts for ${Math.round(
        (topVendor[1] / totalSpend) * 100,
      )}% of total spend. Single-supplier dependency raises price and continuity risk.`,
      impact: Math.round(topVendor[1] * 0.1),
    })
  }

  // Overall trajectory
  const { slope } = linreg(monthly.map((m) => m.total))
  if (slope > 0 && monthly[0].total > 0 && slope / (totalSpend / MONTHS.length) > 0.04) {
    risks.push({
      id: 'risk-overall-trend',
      level: 'medium',
      category: 'Overall',
      title: 'Total spend trending up',
      detail: `Monthly spend is rising by roughly S$${Math.round(slope).toLocaleString()} per month. Projected next month: S$${Math.round(
        forecastTotal,
      ).toLocaleString()}.`,
      impact: Math.round(slope * 3),
    })
  }

  // Duplicate payments
  const dupKey = new Map<string, FinancialDoc[]>()
  priced.forEach((d) => {
    const key = `${d.vendor}|${d.amount}|${d.date.slice(0, 7)}`
    const list = dupKey.get(key) ?? []
    list.push(d)
    dupKey.set(key, list)
  })
  const dups = [...dupKey.values()].filter((l) => l.length > 1)
  if (dups.length) {
    const wasted = dups.reduce((a, l) => a + l[0].amount * (l.length - 1), 0)
    risks.push({
      id: 'risk-duplicate-payment',
      level: 'high',
      category: 'Overall',
      title: `${dups.length} likely duplicate payment${dups.length > 1 ? 's' : ''}`,
      detail: `Matching vendor, amount and month on ${dups
        .map((l) => l[0].vendor)
        .join(', ')}. Potential recoverable amount S$${Math.round(wasted).toLocaleString()}.`,
      impact: Math.round(wasted),
    })
  }

  risks.sort((a, b) => b.impact - a.impact)

  // ---- Savings ideas ----
  const savings: SavingIdea[] = []
  const cloud = byCategory.find((c) => c.category === 'Cloud & Software')
  if (cloud) {
    savings.push({
      id: 'save-saas-audit',
      title: 'Consolidate overlapping SaaS subscriptions',
      detail:
        'Multiple monthly software invoices with similar scope (analytics, monitoring, suites). An annual-commit + license reclaim typically returns 12–18%.',
      estMonthly: Math.round((cloud.total / MONTHS.length) * 0.15),
      effort: 'Medium',
    })
  }
  if (dups.length) {
    savings.push({
      id: 'save-duplicate',
      title: 'Recover duplicate payments & add a 3-way match',
      detail:
        'Block re-payment on identical vendor/amount/month and require PO ↔ goods-receipt ↔ invoice match before release.',
      estMonthly: Math.round(dups.reduce((a, l) => a + l[0].amount * (l.length - 1), 0) / MONTHS.length),
      effort: 'Low',
    })
  }
  const travel = byCategory.find((c) => c.category === 'Travel & Entertainment')
  if (travel && travel.momChange > 0.1) {
    savings.push({
      id: 'save-travel-policy',
      title: 'Tighten travel booking window',
      detail:
        'Claims show a rising share of <7-day bookings. A 14-day advance-purchase rule plus preferred-hotel rates cuts trip cost ~20%.',
      estMonthly: Math.round((travel.total / MONTHS.length) * 0.2),
      effort: 'Low',
    })
  }
  const freight = byCategory.find((c) => c.category === 'Logistics & Freight')
  if (freight) {
    savings.push({
      id: 'save-freight',
      title: 'Shift express freight to consolidated weekly shipments',
      detail:
        'A large portion of courier/last-mile receipts are ad-hoc. Batching to one scheduled lane removes premium express fees.',
      estMonthly: Math.round((freight.total / MONTHS.length) * 0.12),
      effort: 'Medium',
    })
  }
  savings.push({
    id: 'save-early-pay',
    title: 'Capture early-payment discounts',
    detail:
      'Several invoices are paid near their due date. Paying within 10 days on 2/10 net-30 terms yields an effective ~36% annualised return on cash.',
    estMonthly: Math.round((totalSpend / MONTHS.length) * 0.008),
    effort: 'Low',
  })
  savings.sort((a, b) => b.estMonthly - a.estMonthly)

  // ---- What to buy / pre-purchase ----
  const buys: BuyRecommendation[] = []
  forecast
    .filter((f) => f.change > 0.08 && f.nextMonth > 800)
    .slice(0, 4)
    .forEach((f) => {
      const map: Partial<Record<Category, { item: string; qty: string }>> = {
        Hardware: { item: 'Server & rack hardware', qty: 'Lock Q4 volume now at current price' },
        'Cloud & Software': { item: 'Annual cloud/software commit', qty: 'Switch to 1-yr reserved capacity' },
        Marketing: { item: 'Media & ad inventory', qty: 'Pre-buy Q4 placements before rate rises' },
        'Logistics & Freight': { item: 'Freight capacity contract', qty: 'Fix a 6-month lane rate' },
        'Travel & Entertainment': { item: 'Corporate travel credits', qty: 'Bulk-buy airline/hotel credits' },
        Utilities: { item: 'Energy hedge', qty: 'Fix unit rate for 12 months' },
      }
      const spec = map[f.category as Category] ?? { item: `${f.category} commitment`, qty: 'Negotiate a fixed-price term' }
      const topV = [...byVendor.entries()]
        .filter(([v]) => priced.some((d) => d.vendor === v && d.category === f.category))
        .sort((a, b) => b[1] - a[1])[0]
      buys.push({
        id: `buy-${f.category}`,
        item: spec.item,
        vendor: topV?.[0] ?? '—',
        reason: `Forecast +${Math.round(f.change * 100)}% next month (${f.category}). Buying ahead locks today's rate.`,
        suggestedQty: spec.qty,
        estSaving: Math.round((f.nextMonth - f.lastMonth) * 0.4),
      })
    })

  // ---- Executive summary (plain-language, for the boss) ----
  const sgd = (n: number) => `S$${Math.round(n).toLocaleString()}`
  const monthsWithData = monthly.filter((m) => m.total > 0).length || MONTHS.length
  const avgMonth = totalSpend / monthsWithData
  const lastTotal = monthly.at(-1)!.total
  const dir = forecastTotal > lastTotal ? 'rising' : forecastTotal < lastTotal * 0.95 ? 'easing' : 'holding steady'
  const topCat = byCategory[0]
  const savingsTotal = savings.reduce((a, s) => a + s.estMonthly, 0)
  const topSaving = savings[0]
  const summary: string[] = [
    `Across ${docs.length} documents the team recorded ${sgd(totalSpend)} of spend, averaging ${sgd(avgMonth)} a month.`,
    topCat
      ? `${topCat.category} is the largest category at ${sgd(topCat.total)} (${Math.round(topCat.share * 100)}% of the total)${
          topCat.momChange > 0.05 ? `, and up ${Math.round(topCat.momChange * 100)}% month-on-month` : ''
        }.`
      : '',
    `Next month is forecast at ${sgd(forecastTotal)} — spend is ${dir}.`,
    risks[0]
      ? `Main watch point: ${risks[0].title.toLowerCase()} (${sgd(risks[0].impact)} exposure).`
      : 'No unusual spend patterns were detected this period.',
    topSaving
      ? `The clearest opportunity is to ${topSaving.title.toLowerCase()} — about ${sgd(topSaving.estMonthly)}/month; total identified savings come to ${sgd(
          savingsTotal,
        )}/month.`
      : '',
  ].filter(Boolean)

  return {
    generatedAt: Date.now(),
    documentsAnalyzed: docs.length,
    totalSpend,
    monthly,
    byCategory,
    forecastTotal,
    forecast,
    risks,
    savings,
    buys,
    summary,
  }
}

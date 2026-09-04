import type { Category, DocKind, FinancialDoc } from '@/types'

// Deterministic PRNG so every reload processes the same "books".
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface VendorSpec {
  name: string
  category: Category
  kind: DocKind
  base: number // typical monthly-ish amount
  jitter: number
  cadence: number // approx docs per month
  trend?: number // monthly growth applied to base
  spikeMonth?: number // index into MONTHS where cost jumps
  spikeX?: number
  consumer?: boolean // real-world receipt (café, cab, cinema, …) — favoured in the sample
}

export const MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']
const YEAR = 2026
const MONTH_NUM: Record<string, number> = { Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8 }

const VENDORS: VendorSpec[] = [
  { name: 'Nimbus Cloud Services', category: 'Cloud & Software', kind: 'invoice', base: 4200, jitter: 300, cadence: 1, trend: 0.06 },
  { name: 'DataForge Analytics', category: 'Cloud & Software', kind: 'invoice', base: 1800, jitter: 150, cadence: 1, trend: 0.03 },
  { name: 'PagerLoop Monitoring', category: 'Cloud & Software', kind: 'invoice', base: 640, jitter: 60, cadence: 1 },
  { name: 'InkFlow SaaS Suite', category: 'Cloud & Software', kind: 'invoice', base: 950, jitter: 80, cadence: 1, spikeMonth: 5, spikeX: 2.4 },
  { name: 'Helios Components Ltd', category: 'Hardware', kind: 'invoice', base: 5200, jitter: 1400, cadence: 2 },
  { name: 'RackMount Direct', category: 'Hardware', kind: 'invoice', base: 3100, jitter: 900, cadence: 1, spikeMonth: 5, spikeX: 3.1 },
  { name: 'PeriphMart', category: 'Hardware', kind: 'receipt', base: 480, jitter: 220, cadence: 3 },
  { name: 'BlueLane Freight', category: 'Logistics & Freight', kind: 'invoice', base: 2600, jitter: 700, cadence: 2, trend: 0.04 },
  { name: 'PortSide Customs', category: 'Logistics & Freight', kind: 'invoice', base: 1400, jitter: 400, cadence: 1 },
  { name: 'LastMile Couriers', category: 'Logistics & Freight', kind: 'receipt', base: 320, jitter: 120, cadence: 4 },
  { name: 'Meridian Office Park', category: 'Office & Facilities', kind: 'invoice', base: 6800, jitter: 100, cadence: 1 },
  { name: 'BrightClean Facilities', category: 'Office & Facilities', kind: 'invoice', base: 1100, jitter: 90, cadence: 1 },
  { name: 'DeskDepot', category: 'Office & Facilities', kind: 'receipt', base: 260, jitter: 160, cadence: 2 },
  { name: 'SkyReach Airlines', category: 'Travel & Entertainment', kind: 'claim', base: 900, jitter: 500, cadence: 3, trend: 0.05 },
  { name: 'CityStay Hotels', category: 'Travel & Entertainment', kind: 'claim', base: 620, jitter: 300, cadence: 3 },
  { name: 'Grid Rideshare', category: 'Travel & Entertainment', kind: 'claim', base: 140, jitter: 90, cadence: 5 },
  { name: 'Loudspeaker Media', category: 'Marketing', kind: 'invoice', base: 3400, jitter: 800, cadence: 1, trend: 0.08 },
  { name: 'SearchRank Agency', category: 'Marketing', kind: 'invoice', base: 2100, jitter: 300, cadence: 1, trend: 0.04 },
  { name: 'PrintHouse Co', category: 'Marketing', kind: 'receipt', base: 540, jitter: 260, cadence: 2 },
  { name: 'Lockhart & Vane LLP', category: 'Professional Fees', kind: 'invoice', base: 4800, jitter: 1200, cadence: 1 },
  { name: 'Abacus Bookkeeping', category: 'Professional Fees', kind: 'invoice', base: 1600, jitter: 100, cadence: 1 },
  { name: 'PowerGrid Utilities', category: 'Utilities', kind: 'invoice', base: 1900, jitter: 260, cadence: 1, trend: 0.03 },
  { name: 'AquaFlow Water', category: 'Utilities', kind: 'invoice', base: 240, jitter: 40, cadence: 1 },
  { name: 'FibreNet Telecom', category: 'Utilities', kind: 'invoice', base: 780, jitter: 60, cadence: 1 },

  // Consumer-style receipts — team meals, pantry runs, client entertainment, cabs
  { name: 'Brew & Bite Café', category: 'Travel & Entertainment', kind: 'receipt', base: 52, jitter: 26, cadence: 3, consumer: true },
  { name: 'MetroMart Grocer', category: 'Office & Facilities', kind: 'receipt', base: 128, jitter: 55, cadence: 2, consumer: true },
  { name: 'Lumière Cinema', category: 'Travel & Entertainment', kind: 'receipt', base: 86, jitter: 34, cadence: 2, consumer: true },
  { name: 'CityCab', category: 'Travel & Entertainment', kind: 'receipt', base: 27, jitter: 14, cadence: 4, consumer: true },
  { name: 'GadgetHub Store', category: 'Hardware', kind: 'receipt', base: 74, jitter: 38, cadence: 2, consumer: true },
]

const KIND_PREFIX: Record<DocKind, string> = {
  invoice: 'INV',
  receipt: 'RCT',
  claim: 'CLM',
  accounts: 'ACC',
  ledger: 'LDG',
  pdf: 'DOC',
}

const TARGET = 13

export function buildDocuments(seed = 20260903): FinancialDoc[] {
  const rand = mulberry32(seed)
  let counter = 1

  const makeDoc = (v: VendorSpec, mon: string, mi: number): FinancialDoc => {
    let amount = v.base * (1 + (v.trend ?? 0) * mi)
    amount += (rand() - 0.5) * 2 * v.jitter
    if (v.spikeMonth === mi) amount *= v.spikeX ?? 1
    amount = Math.max(40, Math.round(amount))
    const day = 2 + Math.floor(rand() * 25)
    const mm = String(MONTH_NUM[mon]).padStart(2, '0')
    const date = `${YEAR}-${mm}-${String(day).padStart(2, '0')}`
    return {
      id: `d${counter}`,
      ref: `${KIND_PREFIX[v.kind]}-${YEAR % 100}${mm}-${String(counter++).padStart(3, '0')}`,
      kind: v.kind,
      vendor: v.name,
      title: v.name,
      category: v.category,
      amount,
      date,
      createdAt: date,
      data: {},
      stage: 'ingesting',
      progress: 0,
      issues: [],
      priority: v.kind === 'invoice' ? 2 : v.kind === 'claim' ? 1 : 0,
    }
  }

  // Generate a candidate pool, then trim to a small, watchable book.
  const raw: FinancialDoc[] = []
  VENDORS.forEach((v) => {
    const signal = v.trend != null || v.spikeMonth != null
    MONTHS.forEach((mon, mi) => {
      let p = signal ? 0.3 : v.consumer ? 0.4 : 0.12
      if (v.trend != null && mi >= 3) p = 0.55
      if (v.spikeMonth != null && mi >= 3) p = 0.8
      if (v.spikeMonth === mi) p = 1
      if (rand() > p) return
      raw.push(makeDoc(v, mon, mi))
    })
  })

  const spikeNames = new Set(VENDORS.filter((v) => v.spikeMonth != null).map((v) => v.name))
  // must-keep: spike vendors across the last three months → drives the overspend risk
  const must = raw.filter((d) => spikeNames.has(d.vendor) && d.date >= `${YEAR}-06`)
  const pool = shuffle(
    raw.filter((d) => !must.includes(d)),
    rand,
  )

  const pick = new Set<FinancialDoc>(must)
  const add = (d?: FinancialDoc) => {
    if (d && pick.size < TARGET) pick.add(d)
  }
  // guarantee a varied spread of receipts — the consumer ones (café, cab, cinema,
  // grocer, gadget store) come first — plus a claim
  const consumerNames = new Set(VENDORS.filter((v) => v.consumer).map((v) => v.name))
  const receiptPool = [
    ...pool.filter((d) => d.kind === 'receipt' && consumerNames.has(d.vendor)),
    ...pool.filter((d) => d.kind === 'receipt' && !consumerNames.has(d.vendor)),
  ]
  const seenReceiptVendor = new Set<string>()
  for (const d of receiptPool) {
    if (seenReceiptVendor.has(d.vendor)) continue
    seenReceiptVendor.add(d.vendor)
    add(d)
    if (seenReceiptVendor.size >= 4) break
  }
  add(pool.find((d) => d.kind === 'claim'))
  for (const d of pool) {
    if (pick.size >= TARGET) break
    pick.add(d)
  }

  const docs = [...pick].sort((a, b) => a.date.localeCompare(b.date))

  // one duplicate payment so the risk / savings engine has something concrete
  const dupSrc = docs.find((d) => d.kind === 'invoice' && d.amount > 500) ?? docs[0]
  if (dupSrc) {
    docs.push({ ...dupSrc, id: `d${counter++}`, ref: `${dupSrc.ref}-A`, issues: [], stage: 'ingesting', progress: 0 })
  }

  return shuffle(docs, rand)
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

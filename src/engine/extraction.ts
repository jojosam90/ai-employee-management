import type { FinancialDoc } from '@/types'

/** Stable 32-bit hash of a string → used to make per-document details deterministic. */
export function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** ~1 in 8 documents has an OCR misread on a line — the reconciliation catches it. */
export function hasOcrError(doc: FinancialDoc): boolean {
  return doc.amount > 200 && hashStr(doc.id) % 100 < 12
}

const DESCRIPTIONS: Record<string, string[]> = {
  'Cloud & Software': ['Platform subscription', 'Additional user seats', 'API usage overage', 'Premium support plan'],
  Hardware: ['Rack server chassis', '10GbE NIC card', 'SSD array 3.84TB', 'Redundant PSU unit', 'Cat6a cabling run'],
  'Logistics & Freight': ['Ocean freight FCL', 'Customs clearance fee', 'Last-mile delivery', 'Fuel surcharge'],
  'Office & Facilities': ['Monthly office rent', 'Cleaning services', 'Desk & chair set', 'Meeting-room AV kit'],
  'Travel & Entertainment': ['Return airfare', 'Hotel — 3 nights', 'Ground transport', 'Client dinner'],
  Marketing: ['Paid media placement', 'Creative production', 'Print run — brochures', 'Event sponsorship'],
  'Professional Fees': ['Advisory retainer', 'Contract review', 'Bookkeeping — monthly', 'Statutory filing fees'],
  Utilities: ['Electricity usage', 'Water & sewerage', 'Business broadband', 'Mobile fleet plan'],
}

/** Real-world receipt line items, keyed by vendor (overrides the category pool). */
const VENDOR_LINES: Record<string, string[]> = {
  'Brew & Bite Café': ['Flat white', 'Iced latte', 'Cappuccino', 'Butter croissant', 'Avocado toast', 'Club sandwich', 'Blueberry muffin', 'Fresh orange juice'],
  'MetroMart Grocer': ['Ground coffee 1kg', 'Assorted tea box', 'Long-life milk x6', 'Paper towels x12', 'Dish soap', 'Snack assortment', 'Sparkling water x24', 'Hand wash refill'],
  'Lumière Cinema': ['Standard admission', 'Premium recliner seat', 'Large popcorn', 'Soft drink combo', 'Choc-top ice cream', 'Nachos & salsa'],
  CityCab: ['Metered fare', 'Booking fee', 'Peak-hour surcharge', 'ERP / road toll', 'Airport levy'],
  'GadgetHub Store': ['USB-C cable 2m', 'HDMI adapter', 'Wireless mouse', 'Laptop sleeve 14"', '65W USB-C charger', 'Screen cleaning wipes', 'Cable ties pack'],
}

const KIND_LABEL: Record<string, string> = {
  invoice: 'INVOICE',
  receipt: 'RECEIPT',
  claim: 'EXPENSE CLAIM',
  accounts: 'MONTH-END ACCOUNTS',
  ledger: 'LEDGER EXTRACT',
  pdf: 'DOCUMENT',
}

const STREETS = [
  'Robinson Road',
  'Tanjong Pagar Road',
  'Raffles Quay',
  'Orchard Boulevard',
  'North Bridge Road',
  'Jurong Gateway Road',
  'Serangoon Central',
  'Marina Boulevard',
  'Bukit Timah Road',
  'Kallang Avenue',
]
const CITIES = [
  'Singapore 049483',
  'Singapore 018956',
  'Singapore 238859',
  'Singapore 068805',
  'Singapore 188024',
  'Singapore 608532',
  'Singapore 307683',
  'Singapore 179103',
]

export interface VendorMeta {
  line1: string
  line2: string
  reg: string
}

export function vendorMeta(vendor: string): VendorMeta {
  const h = hashStr(vendor)
  const suffix = ['A', 'B', 'C', 'E', 'H', 'J', 'K'][(h >>> 4) % 7]
  return {
    line1: `${(h % 180) + 1} ${STREETS[h % STREETS.length]}`,
    line2: CITIES[(h >>> 5) % CITIES.length],
    reg: `GST Reg. ${200000000 + ((h >>> 2) % 89999999)}${suffix}`,
  }
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function dmy(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export interface ExtractLine {
  desc: string
  qty: number
  unit: number
  printed: number // amount as printed on the document
  ocr: number // amount as read by OCR (differs on a misread)
  misread: boolean
}

export interface Extraction {
  vendor: string
  ref: string
  date: string
  kind: string
  kindLabel: string
  dueDate: string
  poNumber: string
  cardLast: string
  taxRate: number
  lines: ExtractLine[]
  /** From the document as printed */
  subtotalPrinted: number
  taxPrinted: number
  totalPrinted: number
  /** Re-computed from the OCR-extracted line items */
  subtotalOcr: number
  taxOcr: number
  totalOcr: number
  variance: number // totalOcr - totalPrinted (0 when clean)
  clean: boolean
}

export function extractDoc(doc: FinancialDoc): Extraction {
  const h = hashStr(doc.id)
  const bits = (shift: number, mask: number) => (h >> shift) & mask

  const pool = VENDOR_LINES[doc.vendor] ?? DESCRIPTIONS[doc.category] ?? ['Line item']
  const consumer = doc.vendor in VENDOR_LINES
  const n = consumer
    ? 2 + (bits(3, 7) % Math.min(4, pool.length - 1))
    : 1 + (bits(3, 3) % Math.min(4, pool.length))
  // Singapore GST is a flat 9%; some supplies are zero-rated.
  const taxRate = doc.kind === 'claim' ? 0 : [0.09, 0.09, 0][bits(6, 3) % 3]

  const totalPrinted = Math.max(1, Math.round(doc.amount))
  const subtotalPrinted = Math.round(totalPrinted / (1 + taxRate))
  const taxPrinted = totalPrinted - subtotalPrinted

  const weights = Array.from({ length: n }, (_, i) => 1 + (bits(i * 3, 3) % 4))
  const wsum = weights.reduce((a, b) => a + b, 0)
  const descStart = bits(17, 7) % pool.length

  const misread = hasOcrError(doc)
  const errIdx = misread ? bits(11, 3) % n : -1
  const variance = misread ? 30 + (bits(14, 127) % 220) : 0

  let acc = 0
  const lines: ExtractLine[] = weights.map((w, i) => {
    const printed = i === n - 1 ? subtotalPrinted - acc : Math.round((subtotalPrinted * w) / wsum)
    acc += printed
    const qty =
      doc.vendor === 'CityCab'
        ? 1
        : consumer
          ? 1 + (bits(i * 2, 1) & 1)
          : 1 + (bits(i * 2, 1) ? bits(i + 1, 3) % 3 : 0)
    const usedDesc = pool[(descStart + i) % pool.length]
    const isErr = i === errIdx
    return {
      desc: usedDesc,
      qty: Math.max(1, qty),
      unit: Math.round((printed / Math.max(1, qty)) * 100) / 100,
      printed,
      ocr: isErr ? printed + variance : printed,
      misread: isErr,
    }
  })

  const subtotalOcr = lines.reduce((a, l) => a + l.ocr, 0)
  const taxOcr = taxPrinted // tax line is read straight off the doc
  const totalOcr = subtotalOcr + taxOcr

  return {
    vendor: doc.vendor,
    ref: doc.ref,
    date: doc.date,
    kind: doc.kind,
    kindLabel: KIND_LABEL[doc.kind] ?? 'DOCUMENT',
    dueDate: addDays(doc.date, 30),
    poNumber: `PO-${String(1000 + (h % 8999))}`,
    cardLast: String(1000 + ((h >>> 7) % 8999)).slice(-4),
    taxRate,
    lines,
    subtotalPrinted,
    taxPrinted,
    totalPrinted,
    subtotalOcr,
    taxOcr,
    totalOcr,
    variance: totalOcr - totalPrinted,
    clean: !misread,
  }
}

/** How far through the on-screen extraction animation the spotlight document is (0..1). */
export function revealFraction(stage: string, progress: number): number {
  const base: Record<string, number> = {
    ingesting: 0.1,
    extracting: 0.32,
    validating: 0.82,
    done: 1,
  }
  const span: Record<string, number> = {
    ingesting: 0.22,
    extracting: 0.5,
    validating: 0.18,
    done: 0,
  }
  const b = base[stage] ?? 0
  const s = span[stage] ?? 0
  return Math.min(1, b + s * (progress / 100))
}

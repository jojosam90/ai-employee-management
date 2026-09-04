import { useEffect, useRef, type ReactNode } from 'react'
import { FileScan, ScanLine, TableProperties, Calculator, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useSim } from '@/engine/store'
import { extractDoc, revealFraction, vendorMeta, dmy, type Extraction, type VendorMeta } from '@/engine/extraction'
import { cn, money, money2 } from '@/lib/cn'
import { StatusDot } from './ui'
import type { FinancialDoc } from '@/types'

interface Caps {
  vendor: boolean
  meta: boolean
  line: (i: number) => boolean
  subtotal: boolean
  tax: boolean
  total: boolean
  /** highlight-box class for line-item row `i` while OCR reads it */
  box: (i: number) => string
}

const CAP_BOX = 'bg-[#5ea3a3]/14'
const READ_BOX = 'bg-[#5ea3a3]/30 [outline:1.5px_solid_#3f8080] [outline-offset:-1px]'
const totalBox = (show: boolean) => (show ? CAP_BOX + ' rounded-[2px]' : '')

const STAGE_LABEL: Record<string, string> = {
  ingesting: 'Scanning & OCR',
  extracting: 'Extracting fields',
  validating: 'Reconciling totals',
  done: 'Reconciled · posted to ledger',
}

export default function ExtractionView() {
  const docs = useSim((s) => s.docs) as FinancialDoc[]
  const spotlightId = useSim((s) => s.spotlightId)
  const phase = useSim((s) => s.phase)

  const doc = docs.find((d) => d.id === spotlightId)
  const posted = docs.filter((d) => d.stage === 'done')
  const postedTotal = posted.reduce((a, d) => a + d.amount, 0)

  if (!doc) {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 p-6 text-center">
        <FileScan className="text-cyan" size={26} />
        <p className="text-[0.9rem] text-txt">
          {phase === 'standby'
            ? 'Awaiting an operator instruction before processing begins.'
            : 'Waiting for the first document to reach the extraction agent…'}
        </p>
        <p className="max-w-md text-[0.82rem] text-dim">
          Each document is scanned, its fields are captured into a ledger sheet, the totals are recomputed and
          reconciled, then the row is posted to the ledger.
        </p>
      </div>
    )
  }

  const ex = extractDoc(doc)
  const reveal = revealFraction(doc.stage, doc.progress)
  const active = doc.assignedTo != null

  const n = ex.lines.length
  const lineFn = (i: number) => reveal > 0.34 + (i / Math.max(1, n)) * 0.4
  let readingLine = -1
  for (let i = 0; i < n; i++) if (lineFn(i)) readingLine = i
  if (readingLine === -1 && reveal > 0.3) readingLine = 0

  const c: Caps = {
    vendor: reveal > 0.14,
    meta: reveal > 0.2,
    line: lineFn,
    subtotal: reveal > 0.78,
    tax: reveal > 0.84,
    total: reveal > 0.9,
    box: (i) => (active && i === readingLine && reveal < 0.82 ? READ_BOX : lineFn(i) ? CAP_BOX : ''),
  }
  const capVerdict = reveal >= 1

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge-soft px-3 py-2 text-[0.82rem]">
        <span className="font-semibold tracking-wide text-cyan">SPOTLIGHT</span>
        <span className="font-medium text-txt">{doc.ref}</span>
        <span className="truncate text-dim">· {doc.vendor}</span>
        <span className="ml-auto flex items-center gap-1.5 text-dim">
          <StatusDot status={active ? 'processing' : 'done'} />
          {STAGE_LABEL[doc.stage]}
        </span>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto scroll-thin p-3">
        <div className="grid gap-3 lg:grid-cols-2">
          <Facsimile ex={ex} active={active} reveal={reveal} c={c} />
          <Sheet ex={ex} c={c} />
        </div>

        <Reconciliation ex={ex} show={capVerdict} />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-edge-soft bg-bg-2/40 px-3 py-2 text-[0.78rem] text-faint">
          <span className="flex items-center gap-1.5 text-dim">
            <ScanLine size={12} /> OCR
          </span>
          <span>→ keyword capture</span>
          <span>→ ledger sheet</span>
          <span>→ reconcile</span>
          <span>→ post to ledger</span>
          <span>→ executive summary</span>
          <span className="ml-auto text-dim">
            Ledger this session: <span className="tabular-nums text-txt">{posted.length}</span> rows ·{' '}
            <span className="tabular-nums text-txt">{money(postedTotal)}</span> posted
          </span>
        </div>
      </div>
    </div>
  )
}

/** Un-captured fields render blurred, as if OCR hasn't read them yet. */
function R({ show, children, className = '' }: { show: boolean; children: ReactNode; className?: string }) {
  return <span className={(show ? '' : 'select-none blur-[2.5px] opacity-45 ') + className}>{children}</span>
}

const PCT = (r: number) => `${Math.round(r * 100)}%`

function Facsimile({
  ex,
  active,
  reveal,
  c,
}: {
  ex: Extraction
  active: boolean
  reveal: number
  c: Caps
}) {
  const meta = vendorMeta(ex.vendor)
  const vp = useRef<HTMLDivElement>(null)
  const prev = useRef(0)

  useEffect(() => {
    const el = vp.current
    if (!el) return
    const max = Math.max(0, el.scrollHeight - el.clientHeight)
    el.scrollTo({ top: max * Math.min(1, reveal), behavior: reveal >= prev.current ? 'smooth' : 'auto' })
    prev.current = reveal
  }, [reveal])

  return (
    <div className="rounded-lg border border-edge-soft bg-bg-2/40 p-2.5">
      <div className="mb-2 flex items-center gap-1.5 text-[0.74rem] uppercase tracking-wide text-dim">
        <FileScan size={12} /> Source document
      </div>
      <div
        ref={vp}
        className="relative h-[380px] overflow-hidden rounded-[3px] bg-[#f6f4ec] text-[#23262d] shadow-[0_6px_20px_rgba(0,0,0,0.45)] ring-1 ring-black/25"
      >
        <div
          className="relative min-h-full"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.025) 0 1px, transparent 1px 3px)' }}
        >
          {active && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10 h-9"
              style={{
                top: `calc(${Math.min(reveal, 0.98) * 100}% - 18px)`,
                background: 'linear-gradient(180deg, rgba(94,163,163,0) 0%, rgba(94,163,163,0.5) 50%, rgba(94,163,163,0) 100%)',
                mixBlendMode: 'multiply',
              }}
            />
          )}
          <div className="p-4">
            {ex.kind === 'receipt' ? (
              <ReceiptDoc ex={ex} meta={meta} c={c} />
            ) : ex.kind === 'claim' ? (
              <ClaimDoc ex={ex} meta={meta} c={c} />
            ) : (
              <InvoiceDoc ex={ex} meta={meta} c={c} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InvoiceDoc({ ex, meta, c }: { ex: Extraction; meta: VendorMeta; c: Caps }) {
  return (
    <div className="text-[0.74rem] leading-relaxed">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[0.98rem] font-bold tracking-tight text-[#1c1f26]">
            <R show={c.vendor}>{ex.vendor}</R>
          </div>
          <div className="mt-0.5 text-[0.68rem] leading-tight text-[#6b7180]">
            <R show={c.vendor}>
              {meta.line1}
              <br />
              {meta.line2}
              <br />
              {meta.reg}
            </R>
          </div>
        </div>
        <div className="text-[1.05rem] font-bold tracking-[0.22em] text-[#9a6212]">INVOICE</div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-[2px] border border-[#d8d2c1] bg-[#efece0] px-2.5 py-1.5 text-[0.7rem]">
        <div>
          <span className="text-[#9a9fac]">Invoice no. </span>
          <R show={c.meta}>{ex.ref}</R>
        </div>
        <div>
          <span className="text-[#9a9fac]">Issued </span>
          <R show={c.meta}>{dmy(ex.date)}</R>
        </div>
        <div>
          <span className="text-[#9a9fac]">PO ref </span>
          <R show={c.meta}>{ex.poNumber}</R>
        </div>
        <div>
          <span className="text-[#9a9fac]">Due </span>
          <R show={c.meta}>{dmy(ex.dueDate)}</R>
        </div>
      </div>

      <div className="mt-3 text-[0.7rem]">
        <div className="text-[0.6rem] font-semibold uppercase tracking-wide text-[#9a9fac]">Bill to</div>
        <div className="text-[#3a3e47]">Advantech Operations Ltd · Finance Department</div>
      </div>

      <table className="mt-2 w-full border-collapse">
        <thead>
          <tr className="border-y border-[#c7c0ad] text-[0.58rem] uppercase tracking-wide text-[#9a9fac]">
            <th className="py-1 text-left font-semibold">Description</th>
            <th className="py-1 text-center font-semibold">Qty</th>
            <th className="py-1 text-right font-semibold">Unit</th>
            <th className="py-1 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {ex.lines.map((l, i) => (
            <tr key={i} className={cn('border-b border-[#e3ddcc]', c.box(i))}>
              <td className="py-1 pl-1 pr-2">
                <R show={c.line(i)}>{l.desc}</R>
              </td>
              <td className="py-1 text-center font-mono">
                <R show={c.line(i)}>{l.qty}</R>
              </td>
              <td className="py-1 text-right font-mono">
                <R show={c.line(i)}>{money2(l.unit)}</R>
              </td>
              <td className="py-1 pr-1 text-right font-mono">
                <R show={c.line(i)}>{money2(l.printed)}</R>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 ml-auto w-1/2 font-mono text-[0.72rem]">
        <TotalRow label="Subtotal" value={money2(ex.subtotalPrinted)} show={c.subtotal} />
        <TotalRow label={`GST ${PCT(ex.taxRate)}`} value={money2(ex.taxPrinted)} show={c.tax} />
        <div className={cn('mt-0.5 flex justify-between border-t border-[#c7c0ad] px-1 pt-0.5 font-bold text-[#1c1f26]', totalBox(c.total))}>
          <span>
            <R show={c.total}>TOTAL SGD</R>
          </span>
          <span>
            <R show={c.total}>{money2(ex.totalPrinted)}</R>
          </span>
        </div>
      </div>

      <div className="mt-3 border-t border-dashed border-[#c7c0ad] pt-1.5 text-[0.62rem] text-[#9a9fac]">
        Payment by bank transfer within 30 days · quote reference {ex.ref}
      </div>
    </div>
  )
}

function TotalRow({ label, value, show }: { label: string; value: string; show: boolean }) {
  return (
    <div className={cn('flex justify-between px-1 text-[#3a3e47]', totalBox(show))}>
      <span>
        <R show={show}>{label}</R>
      </span>
      <span>
        <R show={show}>{value}</R>
      </span>
    </div>
  )
}

function Dashes() {
  return <div className="my-1 text-[#8a8f9c]">{'- '.repeat(18)}</div>
}

function ReceiptDoc({ ex, meta, c }: { ex: Extraction; meta: VendorMeta; c: Caps }) {
  return (
    <div className="mx-auto max-w-[280px] text-center font-mono text-[0.72rem] leading-snug text-[#23262d]">
      <div className="text-[0.84rem] font-bold tracking-wide">
        <R show={c.vendor}>{ex.vendor.toUpperCase()}</R>
      </div>
      <div className="text-[0.64rem] text-[#6b7180]">
        <R show={c.vendor}>
          {meta.line1} · {meta.line2}
        </R>
      </div>
      <div className="text-[0.64rem] text-[#6b7180]">
        <R show={c.vendor}>{meta.reg}</R>
      </div>
      <Dashes />
      <div className="flex justify-between text-[0.66rem]">
        <span>
          <R show={c.meta}>{dmy(ex.date)}</R>
        </span>
        <span>
          <R show={c.meta}>{ex.ref}</R>
        </span>
      </div>
      <Dashes />
      {ex.lines.map((l, i) => (
        <div key={i} className={cn('flex justify-between gap-2 px-1', c.box(i))}>
          <span className="truncate text-left">
            <R show={c.line(i)}>
              {l.qty > 1 ? `${l.qty}x ` : ''}
              {l.desc}
            </R>
          </span>
          <span>
            <R show={c.line(i)}>{money2(l.printed)}</R>
          </span>
        </div>
      ))}
      <Dashes />
      <div className={cn('flex justify-between px-1', totalBox(c.subtotal))}>
        <span>
          <R show={c.subtotal}>SUBTOTAL</R>
        </span>
        <span>
          <R show={c.subtotal}>{money2(ex.subtotalPrinted)}</R>
        </span>
      </div>
      <div className={cn('flex justify-between px-1', totalBox(c.tax))}>
        <span>
          <R show={c.tax}>GST {PCT(ex.taxRate)}</R>
        </span>
        <span>
          <R show={c.tax}>{money2(ex.taxPrinted)}</R>
        </span>
      </div>
      <div className={cn('flex justify-between px-1 font-bold', totalBox(c.total))}>
        <span>
          <R show={c.total}>TOTAL SGD</R>
        </span>
        <span>
          <R show={c.total}>{money2(ex.totalPrinted)}</R>
        </span>
      </div>
      <Dashes />
      <div className="text-[0.64rem]">VISA •••• {ex.cardLast} — APPROVED</div>
      <div className="mt-1 text-[0.68rem] font-semibold">THANK YOU FOR YOUR BUSINESS</div>
      <div className="mt-1 select-none text-[0.8rem] tracking-[-2px] text-[#23262d]">▏█▐▕▎█▏▐▍█▕▏█▎▐▍▏█▐▕▎█▏</div>
    </div>
  )
}

function ClaimDoc({ ex, meta, c }: { ex: Extraction; meta: VendorMeta; c: Caps }) {
  return (
    <div className="text-[0.74rem] leading-relaxed">
      <div className="text-center text-[0.92rem] font-bold tracking-[0.16em] text-[#1c1f26]">EXPENSE CLAIM</div>
      <div className="text-center text-[0.64rem] text-[#6b7180]">Advantech Operations Ltd · Finance Department</div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-y border-[#c7c0ad] py-1.5 text-[0.7rem]">
        <div>
          <span className="text-[#9a9fac]">Claim ref </span>
          <R show={c.meta}>{ex.ref}</R>
        </div>
        <div>
          <span className="text-[#9a9fac]">Date </span>
          <R show={c.meta}>{dmy(ex.date)}</R>
        </div>
        <div className="col-span-2">
          <span className="text-[#9a9fac]">Merchant </span>
          <R show={c.vendor}>
            {ex.vendor} — {meta.line2}
          </R>
        </div>
        <div className="col-span-2">
          <span className="text-[#9a9fac]">Purpose </span>
          <R show={c.meta}>Client engagement — approved trip</R>
        </div>
      </div>

      <table className="mt-2 w-full border-collapse">
        <thead>
          <tr className="border-b border-[#c7c0ad] text-[0.58rem] uppercase tracking-wide text-[#9a9fac]">
            <th className="py-1 text-left font-semibold">Item</th>
            <th className="py-1 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {ex.lines.map((l, i) => (
            <tr key={i} className={cn('border-b border-[#e3ddcc]', c.box(i))}>
              <td className="py-1 pl-1 pr-2">
                <R show={c.line(i)}>{l.desc}</R>
              </td>
              <td className="py-1 pr-1 text-right font-mono">
                <R show={c.line(i)}>{money2(l.printed)}</R>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={cn('mt-2 flex justify-between border-t border-[#c7c0ad] px-1 pt-1 font-mono text-[0.76rem] font-bold text-[#1c1f26]', totalBox(c.total))}>
        <span>
          <R show={c.total}>AMOUNT CLAIMED SGD</R>
        </span>
        <span>
          <R show={c.total}>{money2(ex.totalPrinted)}</R>
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between border-t border-dashed border-[#c7c0ad] pt-2 text-[0.62rem] text-[#9a9fac]">
        <span>Claimant signature</span>
        <span className="italic text-[#3a3e47]">approved · line manager</span>
      </div>
    </div>
  )
}

function Sheet({ ex, c }: { ex: Extraction; c: Caps }) {
  const cell = 'px-2 py-1 tabular-nums'
  return (
    <div className="rounded-lg border border-edge-soft bg-bg-2/40 p-2.5">
      <div className="mb-2 flex items-center gap-1.5 text-[0.74rem] uppercase tracking-wide text-dim">
        <TableProperties size={12} /> Extracted → ledger sheet
      </div>
      <div className="overflow-hidden rounded-md ring-1 ring-edge-soft">
        <table className="w-full font-mono text-[0.78rem]">
          <tbody className="divide-y divide-edge-soft">
            <SheetKV k="Vendor" v={ex.vendor} show={c.vendor} />
            <SheetKV k="Reference" v={ex.ref} show={c.meta} />
            <SheetKV k="Date" v={ex.date} show={c.meta} />
            <tr className="bg-white/[0.03] text-[0.68rem] uppercase tracking-wide text-faint">
              <td className="px-2 py-1">Line item</td>
              <td className="px-2 py-1 text-center">Qty</td>
              <td className="px-2 py-1 text-right">Unit S$</td>
              <td className="px-2 py-1 text-right">Amount S$</td>
            </tr>
            {ex.lines.map((l, i) => (
              <tr key={i} className={c.line(i) ? '' : 'opacity-30'}>
                <td className="truncate px-2 py-1 text-txt/90">{c.line(i) ? l.desc : '—'}</td>
                <td className="px-2 py-1 text-center text-dim">{c.line(i) ? l.qty : ''}</td>
                <td className={cell + ' text-right text-dim'}>{c.line(i) ? money2(l.unit) : ''}</td>
                <td className={cell + ' text-right ' + (l.misread ? 'text-amber' : 'text-txt')}>
                  {c.line(i) ? (
                    <>
                      {money2(l.ocr)}
                      {l.misread && <span title="OCR misread — differs from printed amount"> ⚠</span>}
                    </>
                  ) : (
                    ''
                  )}
                </td>
              </tr>
            ))}
            <SheetTotal k="Subtotal (extracted)" v={money2(ex.subtotalOcr)} show={c.subtotal} />
            <SheetTotal k={`GST ${Math.round(ex.taxRate * 100)}%`} v={money2(ex.taxOcr)} show={c.tax} />
            <SheetTotal k="Total (extracted)" v={money2(ex.totalOcr)} show={c.total} bold />
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SheetKV({ k, v, show }: { k: string; v: string; show: boolean }) {
  return (
    <tr className={show ? '' : 'opacity-30'}>
      <td className="px-2 py-1 text-[0.68rem] uppercase tracking-wide text-faint" colSpan={2}>
        {k}
      </td>
      <td className="px-2 py-1 text-txt/90" colSpan={2}>
        {show ? v : '—'}
      </td>
    </tr>
  )
}

function SheetTotal({ k, v, show, bold }: { k: string; v: string; show: boolean; bold?: boolean }) {
  return (
    <tr className={(show ? '' : 'opacity-30 ') + (bold ? 'bg-cyan/[0.06]' : '')}>
      <td className={'px-2 py-1 ' + (bold ? 'font-semibold text-txt' : 'text-dim')} colSpan={3}>
        {k}
      </td>
      <td className={'px-2 py-1 text-right tabular-nums ' + (bold ? 'font-semibold text-txt' : 'text-txt/90')}>
        {show ? v : ''}
      </td>
    </tr>
  )
}

function Reconciliation({ ex, show }: { ex: Extraction; show: boolean }) {
  if (!show) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-edge-soft bg-bg-2/40 px-3 py-2.5 text-[0.84rem] text-dim">
        <Calculator size={14} className="text-cyan" /> Reconciling extracted totals against the document…
      </div>
    )
  }
  const badLine = ex.lines.find((l) => l.misread)
  return (
    <div className="rounded-lg border border-teal/35 bg-teal/[0.06] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-1.5 font-mono text-[0.82rem] text-txt/90">
        <Calculator size={13} className="text-dim" />
        Σ lines {money2(ex.subtotalPrinted)} + tax {money2(ex.taxPrinted)} = {money2(ex.totalPrinted)}
        <span className="text-faint">vs</span>
        document total {money2(ex.totalPrinted)}
      </div>
      {badLine && (
        <div className="mt-1.5 flex items-start gap-2 text-[0.82rem] text-amber">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          Low-confidence read on “{badLine.desc}” ({money2(badLine.ocr)}) — auto-corrected to {money2(badLine.printed)}{' '}
          against the printed total.
        </div>
      )}
      <div className="mt-1.5 flex items-center gap-2 text-[0.86rem] font-medium text-teal">
        <CheckCircle2 size={15} /> Reconciled — totals match. Row posted to the finance ledger.
      </div>
    </div>
  )
}

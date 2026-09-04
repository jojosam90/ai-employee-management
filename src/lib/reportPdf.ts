import type { Report } from '@/types'

const sgd = (n: number) => `SGD ${Math.round(n).toLocaleString()}`

export async function exportPdf(report: Report) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF()
  const L = 14
  let y = 18
  const line = (t: string, size = 10, gap = 6) => {
    doc.setFontSize(size)
    doc.text(t, L, y)
    y += gap
  }
  const wrapped = (t: string, size = 9, gap = 4.6, indent = 6) => {
    doc.setFontSize(size)
    for (const w of doc.splitTextToSize(t, 182 - indent)) {
      doc.text(w, L + indent, y)
      y += gap
    }
  }

  doc.setFont('helvetica', 'bold')
  line('AI Employee Management Dashboard — Executive Summary', 14, 9)
  doc.setFont('helvetica', 'normal')
  line(`Generated ${new Date(report.generatedAt).toLocaleString()}`, 9, 8)
  line(`Documents analysed: ${report.documentsAnalyzed}`, 10)
  line(`Total spend: ${sgd(report.totalSpend)}`, 10)
  line(`Forecast next month: ${sgd(report.forecastTotal)}`, 10, 10)

  doc.setFont('helvetica', 'bold')
  line('Summary', 11, 7)
  doc.setFont('helvetica', 'normal')
  report.summary.forEach((s) => wrapped(`•  ${s}`))
  y += 4

  doc.setFont('helvetica', 'bold')
  line('Spend by category', 11, 7)
  doc.setFont('helvetica', 'normal')
  report.byCategory.forEach((c) =>
    line(
      `  ${c.category}: ${sgd(c.total)}  (${(c.share * 100).toFixed(0)}%, ${(c.momChange * 100).toFixed(0)}% MoM)`,
      9,
      5.5,
    ),
  )
  y += 4

  if (y > 235) {
    doc.addPage()
    y = 18
  }
  doc.setFont('helvetica', 'bold')
  line('Recommendations', 11, 7)
  doc.setFont('helvetica', 'normal')
  report.savings.forEach((s) => {
    line(`  ${s.title} — ${sgd(s.estMonthly)}/mo (${s.effort} effort)`, 9, 5)
    wrapped(s.detail, 8, 4.4, 8)
  })
  y += 2
  if (report.buys.length) {
    doc.setFont('helvetica', 'bold')
    line('What to buy / pre-purchase', 11, 7)
    doc.setFont('helvetica', 'normal')
    report.buys.forEach((b) => line(`  ${b.item} — ${b.suggestedQty} (${b.vendor})`, 9, 5))
  }

  doc.save('executive-summary.pdf')
}

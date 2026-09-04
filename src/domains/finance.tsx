import { INITIAL_AGENTS } from '@/engine/agents'
import { buildDocuments } from '@/engine/seed'
import { analyze } from '@/engine/analysis'
import type { FinancialDoc, Report } from '@/types'
import ExtractionView from '@/components/ExtractionView'
import { ReportView } from '@/components/ReportPanel'
import type { DomainConfig } from './config'

export const financeConfig: DomainConfig = {
  id: 'finance',
  brandLine: 'FINANCE OPERATIONS · TEAM ADVANTECH',
  agents: INITIAL_AGENTS,
  reportAgentId: 'delta',
  spotlightStageId: 'extracting',
  pipeline: [
    { id: 'ingesting', agentId: 'alpha', verb: 'Ingesting', short: 'Intake' },
    { id: 'extracting', agentId: 'beta', verb: 'Extracting fields from', short: 'Extract' },
    {
      id: 'validating',
      agentId: 'gamma',
      verb: 'Reconciling',
      short: 'Reconcile',
      completeLog: (i) => `${i.ref} reconciled and posted to the ledger.`,
    },
  ],
  generateItems: () => buildDocuments(),
  buildReport: (items) => {
    const r = analyze(items as FinancialDoc[])
    return { generatedAt: r.generatedAt, itemsAnalyzed: r.documentsAnalyzed, summary: r.summary, data: r }
  },
  chips: ['Prioritise all invoices', 'Prioritise receipts', 'Pause Agent Beta'],
  itemKinds: ['invoice', 'receipt', 'claim', 'ledger', 'account', 'pdf'],
  labels: {
    item: 'document',
    items: 'documents',
    detailTab: 'Live Extraction',
    reportTab: 'Executive Report',
    doneStat: 'Reconciled',
    allDone: 'All documents reconciled. Preparing the executive summary and recommendations…',
    summaryReady: (rep) =>
      `Executive summary ready — S$${Math.round((rep.data as Report).totalSpend).toLocaleString()} of spend analysed.`,
  },
  DetailView: ExtractionView,
  ReportView,
}

import type { ComponentType } from 'react'
import type { Agent } from '@/types'

/** A generic unit of work moving through a domain pipeline (a document, an incident, a candidate…). */
export interface WorkItem {
  id: string
  ref: string
  /** Short human label — vendor / incident short description / candidate name */
  title: string
  /** Sub-type used by "prioritise <kind>" instructions */
  kind: string
  priority: number
  /** Current pipeline stage id, or 'done' */
  stage: string
  progress: number
  assignedTo?: string
  /** ISO date the item entered the queue */
  createdAt: string
  /** Domain-specific payload, filled in by the pipeline stages */
  data: Record<string, unknown>
}

export interface PipelineStage {
  id: string
  /** Which agent services this stage */
  agentId: string
  /** Present-tense verb for the activity log, e.g. "Triaging" */
  verb: string
  /** Short label under the pipeline node, e.g. "Triage" */
  short: string
  /** Mutate item.data when this stage completes */
  onComplete?: (item: WorkItem) => void
  /** Activity-log line when this stage completes (defaults to a generic line) */
  completeLog?: (item: WorkItem, isLast: boolean) => string
}

export interface DomainReport {
  generatedAt: number
  itemsAnalyzed: number
  /** Plain-language bullets for the Executive Summary panel */
  summary: string[]
  /** Domain-specific payload for the report view */
  data: unknown
}

export interface DomainConfig {
  id: string
  /** Header sub-line, e.g. "FINANCE OPERATIONS · TEAM ADVANTECH" */
  brandLine: string
  /** Page footer strapline */
  footerLine: string
  /** Pipeline agents plus the reporting agent */
  agents: Agent[]
  reportAgentId: string
  pipeline: PipelineStage[]
  /** Which stage the "spotlight" detail view follows */
  spotlightStageId: string
  generateItems: () => WorkItem[]
  buildReport: (items: WorkItem[]) => DomainReport
  /** Instruction prompt chips */
  chips: string[]
  /** Kind tokens for "prioritise <kind>" matching */
  itemKinds: string[]
  labels: {
    item: string
    items: string
    detailTab: string
    reportTab: string
    /** the "done" pipeline stat, e.g. "Reconciled" / "Resolved" / "Assessed" */
    doneStat: string
    /** log line once every item is through the pipeline */
    allDone: string
    /** log line when the report is ready */
    summaryReady: (r: DomainReport) => string
  }
  DetailView: ComponentType
  ReportView: ComponentType
}

export type DocKind =
  | 'invoice'
  | 'receipt'
  | 'claim'
  | 'accounts'
  | 'ledger'
  | 'pdf'

export type Category =
  | 'Cloud & Software'
  | 'Hardware'
  | 'Logistics & Freight'
  | 'Office & Facilities'
  | 'Travel & Entertainment'
  | 'Marketing'
  | 'Professional Fees'
  | 'Utilities'

export type DocStage = 'queued' | 'ingesting' | 'extracting' | 'validating' | 'validated'

export interface FinancialDoc {
  id: string
  ref: string
  kind: DocKind
  vendor: string
  category: Category
  amount: number
  date: string // ISO yyyy-mm-dd
  stage: DocStage
  progress: number // 0..100 within current stage
  assignedTo?: string // agent id
  confidence?: number // 0..1 after extraction
  issues: string[]
  priority: number // higher = processed sooner
}

export type AgentStatus = 'idle' | 'processing' | 'paused'

export interface Agent {
  id: string
  name: string
  role: string
  stage: Exclude<DocStage, 'queued' | 'validated'> | 'reporting'
  avatar: number
  status: AgentStatus
  currentDocId?: string
  processed: number
  accuracy: number // 0..1
  speed: number // 0..1 throughput multiplier
}

export type LogLevel = 'info' | 'warn' | 'success' | 'error'

export interface LogEntry {
  id: string
  ts: number
  agent: string
  level: LogLevel
  message: string
}

export type IssueSeverity = 'high' | 'medium' | 'low'

export interface HealthPoint {
  t: number
  label: string
  throughput: number
  queueDepth: number
  accuracy: number
}

export interface CategoryTotal {
  category: Category
  total: number
  share: number
  momChange: number // fractional change vs previous month
}

export interface MonthTotal {
  month: string // 'Mar', 'Apr' ...
  total: number
}

export interface RiskFlag {
  id: string
  level: IssueSeverity
  category: Category | 'Overall'
  title: string
  detail: string
  impact: number
}

export interface SavingIdea {
  id: string
  title: string
  detail: string
  estMonthly: number
  effort: 'Low' | 'Medium' | 'High'
}

export interface ForecastRow {
  category: Category
  lastMonth: number
  nextMonth: number
  change: number
}

export interface BuyRecommendation {
  id: string
  item: string
  vendor: string
  reason: string
  suggestedQty: string
  estSaving: number
}

export interface Report {
  generatedAt: number
  documentsAnalyzed: number
  totalSpend: number
  monthly: MonthTotal[]
  byCategory: CategoryTotal[]
  forecastTotal: number
  forecast: ForecastRow[]
  risks: RiskFlag[]
  savings: SavingIdea[]
  buys: BuyRecommendation[]
  summary: string[]
}

/** 'standby' → docs loaded, agents waiting for the first operator instruction. */
export type SimPhase = 'idle' | 'standby' | 'running' | 'reporting' | 'done'

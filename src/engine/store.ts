import { create } from 'zustand'
import type { Agent, FinancialDoc, HealthPoint, LogEntry, LogLevel, Report, SimPhase } from '@/types'
import { INITIAL_AGENTS, EXTRA_AGENTS, AGENT_NAME } from './agents'
import { buildDocuments } from './seed'
import { analyze } from './analysis'

let uid = 0
const nid = (p: string) => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`

interface SimState {
  phase: SimPhase
  running: boolean
  speed: number
  tickCount: number
  startedAt: number
  reportProgress: number
  /** The one document currently under the microscope in the extraction view. */
  spotlightId: string

  docs: FinancialDoc[]
  agents: Agent[]
  logs: LogEntry[]
  health: HealthPoint[]
  report: Report | null

  init: () => void
  reset: () => void
  tick: () => void
  toggleRunning: () => void
  setSpeed: (s: number) => void
  pauseAgent: (id: string, paused: boolean) => void
  setAllPaused: (paused: boolean) => void
  addAgent: () => void
  sendInstruction: (text: string) => void
}

function log(list: LogEntry[], agent: string, level: LogLevel, message: string): LogEntry[] {
  const entry: LogEntry = { id: nid('l'), ts: Date.now(), agent, level, message }
  return [entry, ...list].slice(0, 160)
}

function pickDoc(docs: FinancialDoc[], predicate: (d: FinancialDoc) => boolean) {
  return docs
    .filter(predicate)
    .sort((a, b) => b.priority - a.priority || a.date.localeCompare(b.date))[0]
}

const AVAILABLE: Record<string, (d: FinancialDoc) => boolean> = {
  alpha: (d) => d.stage === 'queued',
  beta: (d) => d.stage === 'extracting' && !d.assignedTo,
  gamma: (d) => d.stage === 'validating' && !d.assignedTo,
  // floating helpers pick up work at any pipeline stage
  flex: (d) =>
    d.stage === 'queued' || ((d.stage === 'extracting' || d.stage === 'validating') && !d.assignedTo),
}

function availableFor(agent: Agent) {
  return AVAILABLE[agent.id] ?? (agent.stage === 'flex' ? AVAILABLE.flex : undefined)
}

export const useSim = create<SimState>((set, get) => ({
  phase: 'idle',
  running: true,
  speed: 1,
  tickCount: 0,
  startedAt: 0,
  reportProgress: 0,
  spotlightId: '',

  docs: [],
  agents: INITIAL_AGENTS.map((a) => ({ ...a })),
  logs: [],
  health: [],
  report: null,

  init: () => {
    if (get().phase !== 'idle') return
    const docs = buildDocuments()
    set({
      docs,
      agents: INITIAL_AGENTS.map((a) => ({ ...a })),
      phase: 'standby',
      startedAt: 0,
      tickCount: 0,
      report: null,
      reportProgress: 0,
      spotlightId: '',
      health: [],
      logs: log(
        [],
        'system',
        'info',
        `${docs.length} documents loaded. The team is on standby — send an instruction to begin.`,
      ),
    })
  },

  reset: () => {
    set({ phase: 'idle' })
    get().init()
    set((s) => ({ logs: log(s.logs, 'system', 'warn', 'Pipeline reset — awaiting a new instruction.') }))
  },

  toggleRunning: () => set((s) => ({ running: !s.running })),
  setSpeed: (speed) => set({ speed }),

  pauseAgent: (id, paused) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, status: paused ? 'paused' : 'idle' } : a)),
      logs: log(s.logs, 'system', 'warn', `${AGENT_NAME[id] ?? id} ${paused ? 'paused' : 'resumed'}.`),
    })),

  setAllPaused: (paused) =>
    set((s) => ({
      agents: s.agents.map((a) => ({ ...a, status: paused ? 'paused' : 'idle' })),
      phase: !paused && s.phase === 'standby' ? 'running' : s.phase,
      startedAt: !paused && s.phase === 'standby' ? Date.now() : s.startedAt,
      logs: log(
        s.logs,
        'system',
        'warn',
        paused ? 'All agents paused by the operator.' : 'All agents resumed — processing continues.',
      ),
    })),

  addAgent: () => {
    const s = get()
    const next = EXTRA_AGENTS.find((e) => !s.agents.some((a) => a.id === e.id))
    if (!next) {
      set({ logs: log(s.logs, 'system', 'info', 'All floating agents are already on the team.') })
      return
    }
    const rest = s.agents.filter((a) => a.id !== 'delta')
    const delta = s.agents.filter((a) => a.id === 'delta')
    set({
      agents: [...rest, { ...next }, ...delta],
      phase: s.phase === 'standby' ? 'running' : s.phase,
      startedAt: s.phase === 'standby' ? Date.now() : s.startedAt,
      logs: log(s.logs, 'system', 'success', `${next.name} added — picking up work across the pipeline.`),
    })
  },

  sendInstruction: (text) => {
    const t = text.trim()
    if (!t) return
    const lower = t.toLowerCase()
    set((s) => ({ logs: log(s.logs, 'boss', 'info', t) }))

    const start = () => {
      const s = get()
      if (s.phase === 'standby') {
        set({
          phase: 'running',
          startedAt: Date.now(),
          logs: log(get().logs, 'delta', 'success', 'Instruction received — processing has started.'),
        })
      }
    }

    const agentMatch = lower.match(/\b(alpha|beta|gamma|delta|epsilon|zeta|all)\b/)
    if (/\b(pause|hold|stop)\b/.test(lower) && agentMatch) {
      if (agentMatch[1] === 'all') get().setAllPaused(true)
      else get().pauseAgent(agentMatch[1], true)
      return
    }
    if (/\b(resume|continue|unpause)\b/.test(lower) && agentMatch) {
      if (agentMatch[1] === 'all') get().setAllPaused(false)
      else get().pauseAgent(agentMatch[1], false)
      start()
      return
    }

    const kindMatch = lower.match(/\b(invoice|receipt|claim|ledger|account|pdf)s?\b/)
    if (/\b(priorit|expedite|rush|first)/.test(lower) && kindMatch) {
      const kind = kindMatch[1].replace(/s$/, '')
      set((s) => ({
        docs: s.docs.map((d) => (d.kind.startsWith(kind) ? { ...d, priority: d.priority + 6 } : d)),
        logs: log(s.logs, 'delta', 'success', `Acknowledged — ${kind} documents moved to the front of the queue.`),
      }))
      start()
      return
    }

    const vendorMatch = t.match(/(?:vendor|supplier|focus on|for)\s+([A-Za-z][\w& ]{2,})/i)
    if (vendorMatch) {
      const v = vendorMatch[1].trim().toLowerCase()
      const hit = get().docs.some((d) => d.vendor.toLowerCase().includes(v))
      set((s) => ({
        docs: s.docs.map((d) => (d.vendor.toLowerCase().includes(v) ? { ...d, priority: d.priority + 6 } : d)),
        logs: log(
          s.logs,
          'delta',
          hit ? 'success' : 'warn',
          hit
            ? `Prioritising documents from "${vendorMatch[1].trim()}".`
            : `No documents match "${vendorMatch[1].trim()}".`,
        ),
      }))
      if (hit) start()
      return
    }

    if (/\breallocat|rebalance|spread load|add (an )?agent|more agent/.test(lower)) {
      get().addAgent()
      start()
      return
    }

    if (/\b(reset|restart)\b/.test(lower)) {
      get().reset()
      return
    }

    if (/\b(report|forecast|summary|save money|savings)\b/.test(lower)) {
      const s = get()
      if (s.phase === 'done') {
        set({ logs: log(get().logs, 'delta', 'success', 'The executive summary and recommendations are ready below.') })
      } else {
        set({ logs: log(get().logs, 'delta', 'info', 'Understood — the summary will be ready once every document is processed.') })
        start()
      }
      return
    }

    if (/\b(start|begin|go|process|run)\b/.test(lower)) {
      start()
      return
    }

    set((s) => ({ logs: log(s.logs, 'delta', 'info', 'Instruction logged.') }))
    start()
  },

  tick: () => {
    const s = get()
    if (s.phase !== 'running' && s.phase !== 'reporting') return
    if (!s.running) return

    const docs = s.docs.map((d) => ({ ...d }))
    let agents = s.agents.map((a) => ({ ...a }))
    let logs = s.logs
    let spotlightId = s.spotlightId
    const speed = s.speed

    const spotlightDone = () => {
      const sp = docs.find((d) => d.id === spotlightId)
      return !sp || sp.stage === 'validated'
    }

    // 0. self-heal any agent/document desync (pause/resume, edge cases)
    for (const agent of agents) {
      if (!agent.currentDocId) continue
      const cd = docs.find((d) => d.id === agent.currentDocId)
      const finished = !cd || cd.stage === 'validated'
      const mismatch = cd && cd.assignedTo !== agent.id
      const stalled = agent.status !== 'processing' && agent.status !== 'paused'
      if (finished || mismatch || stalled) {
        agent.currentDocId = undefined
        if (agent.status === 'processing') agent.status = 'idle'
      }
    }
    for (const d of docs) {
      if (d.assignedTo && !agents.some((a) => a.currentDocId === d.id)) d.assignedTo = undefined
    }

    // 1. assignment
    for (const agent of agents) {
      if (agent.status === 'paused' || agent.stage === 'reporting') continue
      if (agent.currentDocId) continue
      const avail = availableFor(agent)
      if (!avail) continue
      const doc = pickDoc(docs, avail)
      if (!doc) {
        agent.status = 'idle'
        continue
      }
      doc.assignedTo = agent.id
      doc.progress = 0
      if (doc.stage === 'queued') doc.stage = 'ingesting'
      const isExtract = doc.stage === 'extracting'
      if (isExtract && doc.kind !== 'accounts' && spotlightDone()) spotlightId = doc.id
      agent.currentDocId = doc.id
      agent.status = 'processing'
      logs = log(logs, agent.id, 'info', `${verbFor(doc.stage)} ${doc.ref} — ${doc.vendor}`)
    }

    // 2. progress current work
    for (const agent of agents) {
      if (!agent.currentDocId || agent.status !== 'processing') continue
      const doc = docs.find((d) => d.id === agent.currentDocId)
      if (!doc) {
        agent.currentDocId = undefined
        continue
      }
      const step = (19 + Math.random() * 15) * agent.speed * speed
      doc.progress = Math.min(100, doc.progress + step)
      if (doc.progress < 100) continue

      doc.progress = 0
      doc.assignedTo = undefined
      agent.currentDocId = undefined
      agent.status = 'idle'
      agent.processed += 1

      // the stage a document is in tells us which job just finished (works for
      // the named stage agents and the floating helpers alike)
      if (doc.stage === 'ingesting') {
        doc.confidence = 0.85 + Math.random() * 0.15
        doc.stage = 'extracting'
      } else if (doc.stage === 'extracting') {
        doc.confidence = 0.9 + Math.random() * 0.09
        doc.stage = 'validating'
      } else if (doc.stage === 'validating') {
        doc.stage = 'validated'
        agent.accuracy = Math.min(0.995, agent.accuracy + 0.001)
        logs = log(logs, agent.id, 'success', `${doc.ref} reconciled and posted to the ledger.`)
      }
    }

    // 3. health snapshot
    const processedTotal = agents.reduce((a, x) => a + x.processed, 0)
    const prev = s.health.at(-1)
    const throughput = prev ? Math.max(0, processedTotal - (prev as HealthPoint & { _p?: number })._p!) : 0
    const queueDepth = docs.filter((d) => d.stage !== 'validated').length
    const accuracy = agents.reduce((a, x) => a + x.accuracy, 0) / agents.length
    const point = {
      t: s.tickCount,
      label: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      throughput,
      queueDepth,
      accuracy: Math.round(accuracy * 1000) / 10,
      _p: processedTotal,
    } as HealthPoint & { _p: number }
    const health = [...s.health, point].slice(-45)

    // 4. phase transitions
    let phase: SimPhase = s.phase
    let report = s.report
    let reportProgress = s.reportProgress
    const done = docs.every((d) => d.stage === 'validated')

    if (done && phase === 'running') {
      phase = 'reporting'
      agents = agents.map((a) => (a.id === 'delta' ? { ...a, status: 'processing' } : { ...a, status: 'idle' }))
      logs = log(logs, 'delta', 'info', 'All documents reconciled. Preparing the executive summary and recommendations…')
    }
    if (phase === 'reporting') {
      reportProgress = Math.min(100, reportProgress + (18 + Math.random() * 14) * speed)
      if (reportProgress >= 100) {
        report = analyze(docs)
        phase = 'done'
        agents = agents.map((a) =>
          a.id === 'delta' ? { ...a, status: 'idle', processed: a.processed + 1 } : { ...a, status: 'idle' },
        )
        logs = log(
          logs,
          'delta',
          'success',
          `Executive summary ready — S$${Math.round(report.totalSpend).toLocaleString()} of spend analysed.`,
        )
      }
    }

    set({
      docs,
      agents,
      logs,
      health,
      phase,
      report,
      reportProgress,
      spotlightId,
      tickCount: s.tickCount + 1,
    })
  },
}))

function verbFor(stage: string) {
  return stage === 'ingesting' || stage === 'queued'
    ? 'Ingesting'
    : stage === 'extracting'
      ? 'Extracting fields from'
      : 'Reconciling'
}

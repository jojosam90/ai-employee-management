import { create } from 'zustand'
import type { Agent, HealthPoint, LogEntry, LogLevel, SimPhase } from '@/types'
import type { DomainConfig, DomainReport, WorkItem } from '@/domains/config'
import { EXTRA_AGENTS } from './agents'

let uid = 0
const nid = (p: string) => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`

const EMPTY_CONFIG: DomainConfig = {
  id: '',
  brandLine: '',
  footerLine: 'AI agent workspace',
  agents: [],
  reportAgentId: '',
  pipeline: [],
  spotlightStageId: '',
  generateItems: () => [],
  buildReport: () => ({ generatedAt: 0, itemsAnalyzed: 0, summary: [], data: null }),
  chips: [],
  itemKinds: [],
  labels: {
    item: 'item',
    items: 'items',
    detailTab: 'Live View',
    reportTab: 'Report',
    doneStat: 'Done',
    allDone: 'All items processed.',
    summaryReady: () => 'Summary ready.',
  },
  DetailView: () => null,
  ReportView: () => null,
}

/** Everything that makes up one domain's running simulation. */
interface DomainSession {
  config: DomainConfig
  phase: SimPhase
  running: boolean
  speed: number
  tickCount: number
  startedAt: number
  reportProgress: number
  /** The one work item under the microscope in the detail view */
  spotlightId: string
  docs: WorkItem[]
  agents: Agent[]
  logs: LogEntry[]
  health: HealthPoint[]
  report: DomainReport | null
}

interface SimState extends DomainSession {
  /** id of the domain currently mirrored into the flat fields above */
  activeId: string
  /** snapshots of every domain that has been started but isn't active right now */
  sessions: Record<string, DomainSession>

  loadDomain: (config: DomainConfig) => void
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

function pick(docs: WorkItem[], predicate: (d: WorkItem) => boolean) {
  return docs.filter(predicate).sort((a, b) => b.priority - a.priority || a.createdAt.localeCompare(b.createdAt))[0]
}

/** Copy just the simulation slice out of the (possibly flat) state. */
function toSession(s: DomainSession): DomainSession {
  return {
    config: s.config,
    phase: s.phase,
    running: s.running,
    speed: s.speed,
    tickCount: s.tickCount,
    startedAt: s.startedAt,
    reportProgress: s.reportProgress,
    spotlightId: s.spotlightId,
    docs: s.docs,
    agents: s.agents,
    logs: s.logs,
    health: s.health,
    report: s.report,
  }
}

function freshSession(config: DomainConfig): DomainSession {
  const docs = config.generateItems()
  return {
    config,
    docs,
    agents: config.agents.map((a) => ({ ...a })),
    phase: 'standby',
    running: true,
    speed: 1,
    tickCount: 0,
    startedAt: 0,
    reportProgress: 0,
    spotlightId: '',
    health: [],
    report: null,
    logs: log(
      [],
      'system',
      'info',
      `${docs.length} ${docs.length === 1 ? config.labels.item : config.labels.items} loaded. The team is on standby — send an instruction to begin.`,
    ),
  }
}

export const useSim = create<SimState>((set, get) => ({
  config: EMPTY_CONFIG,
  phase: 'idle',
  running: true,
  speed: 1,
  tickCount: 0,
  startedAt: 0,
  reportProgress: 0,
  spotlightId: '',
  docs: [],
  agents: [],
  logs: [],
  health: [],
  report: null,

  activeId: '',
  sessions: {},

  loadDomain: (config) => {
    const st = get()
    if (st.activeId === config.id) return

    const sessions = { ...st.sessions }
    // park the domain we're leaving so it keeps its progress (and keeps ticking)
    if (st.activeId) sessions[st.activeId] = toSession(st)

    // resume the target if it was started before, otherwise start it fresh
    const next = sessions[config.id] ?? freshSession(config)
    delete sessions[config.id]

    set({ activeId: config.id, sessions, ...next })
  },

  reset: () => {
    set({ ...freshSession(get().config) })
    set((s) => ({ logs: log(s.logs, 'system', 'warn', 'Pipeline reset — awaiting a new instruction.') }))
  },

  toggleRunning: () => set((s) => ({ running: !s.running })),
  setSpeed: (speed) => set({ speed }),

  pauseAgent: (id, paused) =>
    set((s) => ({
      agents: s.agents.map((a) => (a.id === id ? { ...a, status: paused ? 'paused' : 'idle' } : a)),
      logs: log(s.logs, 'system', 'warn', `${agentName(s, id)} ${paused ? 'paused' : 'resumed'}.`),
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
    const rpt = s.config.reportAgentId
    const rest = s.agents.filter((a) => a.id !== rpt)
    const reporter = s.agents.filter((a) => a.id === rpt)
    set({
      agents: [...rest, { ...next }, ...reporter],
      phase: s.phase === 'standby' ? 'running' : s.phase,
      startedAt: s.phase === 'standby' ? Date.now() : s.startedAt,
      logs: log(s.logs, 'system', 'success', `${next.name} added — picking up work across the pipeline.`),
    })
  },

  sendInstruction: (text) => {
    const t = text.trim()
    if (!t) return
    const lower = t.toLowerCase()
    const cfg = get().config
    const rpt = cfg.reportAgentId
    set((s) => ({ logs: log(s.logs, 'boss', 'info', t) }))

    const start = () => {
      const s = get()
      if (s.phase === 'standby') {
        set({
          phase: 'running',
          startedAt: Date.now(),
          logs: log(get().logs, rpt, 'success', 'Instruction received — processing has started.'),
        })
      }
    }

    const agentIds = [...cfg.agents.map((a) => a.id), 'epsilon', 'zeta', 'all']
    const agentMatch = lower.match(new RegExp(`\\b(${agentIds.join('|')})\\b`))
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

    if (cfg.itemKinds.length) {
      const kindMatch = lower.match(new RegExp(`\\b(${cfg.itemKinds.join('|')})s?\\b`))
      if (/\b(priorit|expedite|rush|first)/.test(lower) && kindMatch) {
        const kind = kindMatch[1]
        set((s) => ({
          docs: s.docs.map((d) => (d.kind.startsWith(kind) ? { ...d, priority: d.priority + 6 } : d)),
          logs: log(s.logs, rpt, 'success', `Acknowledged — ${kind} items moved to the front of the queue.`),
        }))
        start()
        return
      }
    }

    const focusMatch = t.match(/(?:vendor|supplier|focus on|for|about)\s+([A-Za-z][\w& -]{2,})/i)
    if (focusMatch) {
      const v = focusMatch[1].trim().toLowerCase()
      const hit = get().docs.some((d) => d.title.toLowerCase().includes(v))
      set((s) => ({
        docs: s.docs.map((d) => (d.title.toLowerCase().includes(v) ? { ...d, priority: d.priority + 6 } : d)),
        logs: log(
          s.logs,
          rpt,
          hit ? 'success' : 'warn',
          hit ? `Prioritising items matching "${focusMatch[1].trim()}".` : `Nothing matches "${focusMatch[1].trim()}".`,
        ),
      }))
      if (hit) start()
      return
    }

    if (/\breallocat|rebalance|spread load|add (an )?agent|more agent|more capacity/.test(lower)) {
      get().addAgent()
      start()
      return
    }

    if (/\b(reset|restart)\b/.test(lower)) {
      get().reset()
      return
    }

    if (/\b(report|summary|forecast|result|outcome)\b/.test(lower)) {
      const s = get()
      if (s.phase === 'done') set({ logs: log(get().logs, rpt, 'success', 'The summary is ready below.') })
      else {
        set({ logs: log(get().logs, rpt, 'info', 'Understood — the summary follows once every item is processed.') })
        start()
      }
      return
    }

    if (/\b(start|begin|go|process|run)\b/.test(lower)) {
      start()
      return
    }

    set((s) => ({ logs: log(s.logs, rpt, 'info', 'Instruction logged.') }))
    start()
  },

  tick: () => {
    const st = get()

    // advance the domain on screen
    const active = toSession(st)
    const nextActive = stepSim(active)

    // advance every other started domain in the background
    let nextSessions: Record<string, DomainSession> | null = null
    for (const id of Object.keys(st.sessions)) {
      const cur = st.sessions[id]
      const n = stepSim(cur)
      if (n !== cur) {
        if (!nextSessions) nextSessions = { ...st.sessions }
        nextSessions[id] = n
      }
    }

    const patch: Partial<SimState> = {}
    if (nextActive !== active) Object.assign(patch, nextActive)
    if (nextSessions) patch.sessions = nextSessions
    if (Object.keys(patch).length) set(patch)
  },
}))

/** One simulation step for a single domain. Returns the same object unchanged when idle. */
function stepSim(s: DomainSession): DomainSession {
  if (s.phase !== 'running' && s.phase !== 'reporting') return s
  if (!s.running) return s

  const cfg = s.config
  const pipeline = cfg.pipeline
  const stageIds = pipeline.map((p) => p.id)
  const stageOf = (id: string) => pipeline.find((p) => p.id === id)
  const nextStageId = (id: string) => {
    const i = stageIds.indexOf(id)
    return i >= 0 && i < stageIds.length - 1 ? stageIds[i + 1] : 'done'
  }

  const docs = s.docs.map((d) => ({ ...d }))
  let agents = s.agents.map((a) => ({ ...a }))
  let logs = s.logs
  let spotlightId = s.spotlightId
  const speed = s.speed

  const spotlightDone = () => {
    const sp = docs.find((d) => d.id === spotlightId)
    return !sp || sp.stage === 'done'
  }

  const stagesForAgent = (agent: Agent) => {
    if (agent.stage === 'flex') return stageIds
    return pipeline.filter((p) => p.agentId === agent.id).map((p) => p.id)
  }
  const availableFor = (agent: Agent) => {
    if (agent.stage === 'reporting') return undefined
    const mine = stagesForAgent(agent)
    if (!mine.length) return undefined
    return (d: WorkItem) => mine.includes(d.stage) && !d.assignedTo
  }

  // 0. self-heal any agent/item desync (pause/resume, edge cases)
  for (const agent of agents) {
    if (!agent.currentDocId) continue
    const cd = docs.find((d) => d.id === agent.currentDocId)
    const finished = !cd || cd.stage === 'done'
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
    const doc = pick(docs, avail)
    if (!doc) {
      agent.status = 'idle'
      continue
    }
    doc.assignedTo = agent.id
    doc.progress = 0
    if (doc.stage === cfg.spotlightStageId && spotlightDone()) spotlightId = doc.id
    agent.currentDocId = doc.id
    agent.status = 'processing'
    logs = log(logs, agent.id, 'info', `${stageOf(doc.stage)?.verb ?? 'Processing'} ${doc.ref} — ${doc.title}`)
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

    const stage = stageOf(doc.stage)
    doc.progress = 0
    doc.assignedTo = undefined
    agent.currentDocId = undefined
    agent.status = 'idle'
    agent.processed += 1
    agent.accuracy = Math.min(0.995, agent.accuracy + 0.001)

    if (stage) {
      stage.onComplete?.(doc)
      const done = nextStageId(doc.stage) === 'done'
      const line = stage.completeLog ? stage.completeLog(doc, done) : `${doc.ref} ${done ? 'completed' : 'moved on'}.`
      logs = log(logs, agent.id, done ? 'success' : 'info', line)
      doc.stage = nextStageId(doc.stage)
    }
  }

  // 3. health snapshot
  const processedTotal = agents.reduce((a, x) => a + x.processed, 0)
  const prev = s.health.at(-1)
  const throughput = prev ? Math.max(0, processedTotal - (prev as HealthPoint & { _p?: number })._p!) : 0
  const queueDepth = docs.filter((d) => d.stage !== 'done').length
  const accuracy = agents.reduce((a, x) => a + x.accuracy, 0) / Math.max(1, agents.length)
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
  const allDone = docs.length > 0 && docs.every((d) => d.stage === 'done')

  if (allDone && phase === 'running') {
    phase = 'reporting'
    agents = agents.map((a) => (a.id === cfg.reportAgentId ? { ...a, status: 'processing' } : { ...a, status: 'idle' }))
    logs = log(logs, cfg.reportAgentId, 'info', cfg.labels.allDone)
  }
  if (phase === 'reporting') {
    reportProgress = Math.min(100, reportProgress + (18 + Math.random() * 14) * speed)
    if (reportProgress >= 100) {
      report = cfg.buildReport(docs)
      phase = 'done'
      agents = agents.map((a) =>
        a.id === cfg.reportAgentId ? { ...a, status: 'idle', processed: a.processed + 1 } : { ...a, status: 'idle' },
      )
      logs = log(logs, cfg.reportAgentId, 'success', cfg.labels.summaryReady(report))
    }
  }

  return {
    ...s,
    docs,
    agents,
    logs,
    health,
    phase,
    report,
    reportProgress,
    spotlightId,
    tickCount: s.tickCount + 1,
  }
}

function agentName(s: SimState, id: string) {
  return s.config.agents.find((a) => a.id === id)?.name ?? EXTRA_AGENTS.find((a) => a.id === id)?.name ?? id
}

import type { Agent } from '@/types'
import type { DomainConfig } from '../config'
import { buildIncidents, buildITReport, itOnComplete } from './data'
import IncidentView from './IncidentView'
import { ITReport } from './ITReport'

const AGENTS: Agent[] = [
  { id: 'l1', name: 'Agent Alex (L1)', role: 'Triage & first response', stage: 'l1triage', avatar: 15, status: 'idle', processed: 0, accuracy: 0.94, speed: 1 },
  { id: 'l2', name: 'Agent Bianca (L2)', role: 'Diagnosis & root cause', stage: 'l2diagnose', avatar: 45, status: 'idle', processed: 0, accuracy: 0.95, speed: 1 },
  { id: 'l3', name: 'Agent Carlos (L3)', role: 'Permanent fix & closure', stage: 'l3resolve', avatar: 51, status: 'idle', processed: 0, accuracy: 0.96, speed: 1 },
  { id: 'ir', name: 'Agent Dana', role: 'Incident reporting & problems', stage: 'reporting', avatar: 9, status: 'idle', processed: 0, accuracy: 0.96, speed: 1 },
]

export const itSupportConfig: DomainConfig = {
  id: 'itsupport',
  brandLine: 'IT SERVICE OPERATIONS · TEAM ADVANTECH',
  agents: AGENTS,
  reportAgentId: 'ir',
  spotlightStageId: 'l2diagnose',
  pipeline: [
    { id: 'l1triage', agentId: 'l1', verb: 'Triaging', short: 'L1 Triage', onComplete: itOnComplete.l1 },
    { id: 'l2diagnose', agentId: 'l2', verb: 'Diagnosing', short: 'L2 Diagnose', onComplete: itOnComplete.l2 },
    {
      id: 'l3resolve',
      agentId: 'l3',
      verb: 'Resolving',
      short: 'L3 Resolve',
      onComplete: itOnComplete.l3,
      completeLog: (i) => `${i.ref} resolved and closed.`,
    },
  ],
  generateItems: () => buildIncidents(),
  buildReport: buildITReport,
  chips: ['Prioritise P1 incidents', 'Pause Agent Bianca', 'Focus on api-gateway', 'Add more capacity'],
  itemKinds: ['p1', 'p2', 'p3', 'p4'],
  labels: {
    item: 'incident',
    items: 'incidents',
    detailTab: 'Live Triage',
    reportTab: 'Shift Report',
    doneStat: 'Resolved',
    allDone: 'All incidents resolved. Compiling the shift report and problem candidates…',
    summaryReady: () => 'Shift report ready — MTTR, SLA attainment and recurring problems below.',
  },
  DetailView: IncidentView,
  ReportView: ITReport,
}

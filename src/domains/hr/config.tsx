import type { Agent } from '@/types'
import type { DomainConfig } from '../config'
import { buildCandidates, buildHRReport } from './data'
import CandidateView from './CandidateView'
import { HRReport } from './HRReport'

const AGENTS: Agent[] = [
  { id: 'screener', name: 'Agent Rhea', role: 'Résumé screening & JD match', stage: 'screen', avatar: 20, status: 'idle', processed: 0, accuracy: 0.95, speed: 1 },
  { id: 'interviewer', name: 'Agent Ivan', role: 'Structured interview & scoring', stage: 'interview', avatar: 33, status: 'idle', processed: 0, accuracy: 0.94, speed: 1 },
  { id: 'analyst', name: 'Agent Sana', role: 'Candidate comparison & ranking', stage: 'compare', avatar: 26, status: 'idle', processed: 0, accuracy: 0.96, speed: 1 },
  { id: 'lead', name: 'Agent Hana', role: 'Hiring report & recommendations', stage: 'reporting', avatar: 47, status: 'idle', processed: 0, accuracy: 0.96, speed: 1 },
]

export const hrConfig: DomainConfig = {
  id: 'hr',
  brandLine: 'TALENT ACQUISITION · TEAM ADVANTECH',
  agents: AGENTS,
  reportAgentId: 'lead',
  spotlightStageId: 'interview',
  pipeline: [
    { id: 'screen', agentId: 'screener', verb: 'Screening', short: 'Screen' },
    { id: 'interview', agentId: 'interviewer', verb: 'Interviewing', short: 'Interview' },
    {
      id: 'compare',
      agentId: 'analyst',
      verb: 'Comparing',
      short: 'Compare',
      completeLog: (i) => `${i.ref} assessed and ranked.`,
    },
  ],
  generateItems: () => buildCandidates(),
  buildReport: buildHRReport,
  chips: ['Prioritise senior candidates', 'Pause Agent Ivan', 'Focus on Data Analyst', 'Add more capacity'],
  itemKinds: ['senior', 'mid', 'junior'],
  labels: {
    item: 'candidate',
    items: 'candidates',
    detailTab: 'Live Assessment',
    reportTab: 'Hiring Report',
    doneStat: 'Assessed',
    allDone: 'Every candidate assessed. Compiling the hiring report and shortlists…',
    summaryReady: () => 'Hiring report ready — funnel, ranked shortlists and recommendations below.',
  },
  DetailView: CandidateView,
  ReportView: HRReport,
}

import type { Agent } from '@/types'

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'alpha',
    name: 'Agent Alpha',
    role: 'Intake & OCR',
    stage: 'ingesting',
    avatar: 47,
    status: 'idle',
    processed: 0,
    accuracy: 0.97,
    speed: 1,
  },
  {
    id: 'beta',
    name: 'Agent Beta',
    role: 'Field Extraction & Coding',
    stage: 'extracting',
    avatar: 32,
    status: 'idle',
    processed: 0,
    accuracy: 0.94,
    speed: 1,
  },
  {
    id: 'gamma',
    name: 'Agent Gamma',
    role: 'Validation & Reconciliation',
    stage: 'validating',
    avatar: 12,
    status: 'idle',
    processed: 0,
    accuracy: 0.95,
    speed: 1,
  },
  {
    id: 'delta',
    name: 'Agent Delta',
    role: 'Reporting & Forecast',
    stage: 'reporting',
    avatar: 5,
    status: 'idle',
    processed: 0,
    accuracy: 0.96,
    speed: 1,
  },
]

export const AGENT_NAME: Record<string, string> = {
  alpha: 'Agent Alpha',
  beta: 'Agent Beta',
  gamma: 'Agent Gamma',
  delta: 'Agent Delta',
  system: 'System',
  boss: 'You',
}

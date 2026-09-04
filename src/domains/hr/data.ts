import type { WorkItem, DomainReport } from '../config'
import { mulberry32, pickOne } from '../rng'

export interface CandidateData {
  ref: string
  name: string
  role: string
  seniority: string
  years: number
  currentTitle: string
  location: string
  education: string
  skills: string[]
  highlights: string[]
  appliedAt: string
  screen: { jdMatch: number; matched: string[]; missing: string[]; verdict: string }
  interview: { scores: { area: string; score: number }[]; overall: number; note: string }
  compare: { rank: number; of: number; percentile: number; recommendation: string; finalScore: number }
}

interface RoleDef {
  title: string
  seniority: string
  mustHave: string[]
  niceToHave: string[]
}

const ROLES: RoleDef[] = [
  {
    title: 'Senior Backend Engineer',
    seniority: 'senior',
    mustHave: ['TypeScript', 'Node.js', 'PostgreSQL', 'System design', 'AWS'],
    niceToHave: ['Kafka', 'Kubernetes', 'GraphQL', 'Go'],
  },
  {
    title: 'Product Designer',
    seniority: 'mid',
    mustHave: ['Figma', 'Design systems', 'User research', 'Prototyping', 'Accessibility'],
    niceToHave: ['Motion design', 'Front-end basics', 'Design ops'],
  },
  {
    title: 'Data Analyst',
    seniority: 'mid',
    mustHave: ['SQL', 'Python', 'Dashboarding', 'Statistics', 'Stakeholder comms'],
    niceToHave: ['dbt', 'Experimentation', 'Looker', 'Forecasting'],
  },
]

const FIRST = ['Amara', 'Wei', 'Lucas', 'Nadia', 'Kenji', 'Isabel', 'Omar', 'Freya', 'Rahul', 'Chloe', 'Mateo', 'Yuki', 'Hannah', 'Diego']
const LAST = ['Okonkwo', 'Zhang', 'Muller', 'Haddad', 'Tanaka', 'Costa', 'Farah', 'Lindqvist', 'Iyer', 'Byrne', 'Rivera', 'Sato', 'Novak', 'Mensah']
const CITIES = ['Singapore', 'Remote (SGT)', 'Kuala Lumpur', 'Jakarta', 'Sydney', 'Bengaluru']
const EDU = [
  'BSc Computer Science',
  'MSc Human–Computer Interaction',
  'BEng Software Engineering',
  'BA Design',
  'BSc Statistics',
  'MSc Data Science',
  'Bootcamp + 4y industry',
]
const TITLES: Record<string, string[]> = {
  senior: ['Senior Engineer', 'Staff Engineer', 'Tech Lead', 'Backend Engineer II'],
  mid: ['Product Designer', 'Data Analyst', 'UX Designer', 'Analytics Engineer', 'Engineer'],
}
const HL_POOL = [
  'Led a migration that cut infra cost 28%',
  'Shipped a redesign that lifted activation 14%',
  'Built the team’s experimentation framework',
  'Mentored 3 juniors to mid-level',
  'Owned an on-call rotation for a tier-1 service',
  'Ran a research study with 40+ participants',
  'Cut a nightly pipeline from 3h to 25m',
  'Introduced a design-system component library',
  'Presented quarterly metrics to the exec team',
  'Reduced p95 latency by 40% on the core API',
]

function scoreFromMatch(match: number, r: () => number) {
  // interview score correlates with JD match, with noise
  const s = Math.round(Math.max(35, Math.min(96, match * 0.7 + 25 + (r() - 0.5) * 26)))
  return s
}

export function buildCandidates(seed = 73): WorkItem[] {
  const rand = mulberry32(seed)
  const day0 = new Date('2026-08-24T09:00:00Z').getTime()
  const perRole = [5, 4, 4] // Senior BE, Designer, Analyst
  const items: (WorkItem & { _role: string })[] = []
  let n = 0

  ROLES.forEach((role, ri) => {
    for (let k = 0; k < perRole[ri]; k++) {
      const jd = [...role.mustHave, ...role.niceToHave]
      // give the candidate a subset of JD skills + a couple of extras
      const have = jd.filter(() => rand() < (k === 0 ? 0.85 : 0.5 + rand() * 0.4))
      const extras = ['Communication', 'Leadership', 'Docs', 'Testing'].filter(() => rand() < 0.4)
      const skills = [...new Set([...have, ...extras])]
      const matched = role.mustHave.filter((s) => skills.includes(s))
      const missing = role.mustHave.filter((s) => !skills.includes(s))
      const jdMatch = Math.round(
        (matched.length / role.mustHave.length) * 78 +
          (skills.filter((s) => role.niceToHave.includes(s)).length / Math.max(1, role.niceToHave.length)) * 22,
      )
      const years =
        role.seniority === 'senior' ? 6 + Math.floor(rand() * 7) : 2 + Math.floor(rand() * 5)
      const areas =
        role.title === 'Product Designer'
          ? ['Craft', 'Research', 'Collaboration', 'Systems thinking']
          : role.title === 'Data Analyst'
            ? ['SQL / modelling', 'Statistics', 'Storytelling', 'Business sense']
            : ['Coding', 'System design', 'Problem solving', 'Communication']
      const scores = areas.map((area) => ({ area, score: scoreFromMatch(jdMatch, rand) }))
      const overall = Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length)
      const name = `${pickOne(rand, FIRST)} ${pickOne(rand, LAST)}`
      const applied = new Date(day0 + n * 7 * 3600_000 + Math.floor(rand() * 4 * 3600_000))

      const data: CandidateData = {
        ref: `CAND-00${42 + n}`,
        name,
        role: role.title,
        seniority: role.seniority,
        years,
        currentTitle: pickOne(rand, TITLES[role.seniority] ?? TITLES.mid),
        location: pickOne(rand, CITIES),
        education: pickOne(rand, EDU),
        skills,
        highlights: [...HL_POOL].sort(() => rand() - 0.5).slice(0, 2 + Math.floor(rand() * 2)),
        appliedAt: applied.toISOString(),
        screen: {
          jdMatch,
          matched,
          missing,
          verdict: jdMatch >= 62 ? 'Advance to interview' : jdMatch >= 48 ? 'Borderline — panel to decide' : 'Hold',
        },
        interview: {
          scores,
          overall,
          note:
            overall >= 78
              ? 'Strong across the board; concrete examples, thoughtful trade-offs.'
              : overall >= 62
                ? 'Solid; some gaps to probe in a follow-up.'
                : 'Below the bar on core areas for this role.',
        },
        compare: { rank: 0, of: 0, percentile: 0, recommendation: '', finalScore: 0 },
      }
      items.push({
        id: `hr${n}`,
        ref: data.ref,
        title: name,
        kind: role.seniority,
        priority: jdMatch >= 70 ? 2 : jdMatch >= 55 ? 1 : 0,
        stage: 'screen',
        progress: 0,
        createdAt: applied.toISOString(),
        data: data as unknown as Record<string, unknown>,
        _role: role.title,
      })
      n++
    }
  })

  // final score + rank within role (deterministic — all inputs already fixed)
  ROLES.forEach((role) => {
    const group = items.filter((it) => it._role === role.title)
    group.forEach((it) => {
      const d = it.data as unknown as CandidateData
      d.compare.finalScore = Math.round(d.screen.jdMatch * 0.45 + d.interview.overall * 0.55)
    })
    group
      .sort((a, b) => (b.data as unknown as CandidateData).compare.finalScore - (a.data as unknown as CandidateData).compare.finalScore)
      .forEach((it, idx) => {
        const d = it.data as unknown as CandidateData
        d.compare.rank = idx + 1
        d.compare.of = group.length
        d.compare.percentile = Math.round((1 - idx / Math.max(1, group.length)) * 100)
        d.compare.recommendation =
          idx === 0 && d.compare.finalScore >= 68
            ? 'Advance to offer'
            : idx <= 1 && d.compare.finalScore >= 60
              ? 'Second-round interview'
              : d.compare.finalScore >= 55
                ? 'Keep warm — backup'
                : 'Do not proceed'
      })
  })

  return items
}

// ---------- Report ----------

export interface HRReportData {
  applied: number
  screenedPass: number
  interviewed: number
  shortlisted: number
  avgJdMatch: number
  avgInterview: number
  roles: {
    role: string
    applicants: number
    qualified: number
    shortlist: { name: string; ref: string; score: number; rank: number; strength: string; recommendation: string }[]
  }[]
  recommendations: { title: string; detail: string }[]
}

export function buildHRReport(items: WorkItem[]): DomainReport {
  const rows = items.map((i) => ({ d: i.data as unknown as CandidateData }))
  const applied = rows.length
  const screenedPass = rows.filter((r) => r.d.screen.jdMatch >= 48).length
  const interviewed = applied // every candidate is interviewed in this sim
  const avgJdMatch = Math.round(rows.reduce((a, r) => a + r.d.screen.jdMatch, 0) / Math.max(1, applied))
  const avgInterview = Math.round(rows.reduce((a, r) => a + r.d.interview.overall, 0) / Math.max(1, applied))

  const roleNames = [...new Set(rows.map((r) => r.d.role))]
  const roles = roleNames.map((role) => {
    const group = rows.filter((r) => r.d.role === role).map((r) => r.d)
    const ranked = [...group].sort((a, b) => a.compare.rank - b.compare.rank)
    const shortlist = ranked
      .filter((d) => d.compare.recommendation === 'Advance to offer' || d.compare.recommendation === 'Second-round interview')
      .map((d) => ({
        name: d.name,
        ref: d.ref,
        score: d.compare.finalScore,
        rank: d.compare.rank,
        strength: [...d.interview.scores].sort((a, b) => b.score - a.score)[0]?.area ?? '—',
        recommendation: d.compare.recommendation,
      }))
    return {
      role,
      applicants: group.length,
      qualified: group.filter((d) => d.screen.jdMatch >= 62).length,
      shortlist,
    }
  })

  const shortlisted = roles.reduce((a, r) => a + r.shortlist.length, 0)
  const thin = roles.filter((r) => r.qualified < 2)

  const recommendations = [
    ...roles
      .filter((r) => r.shortlist[0]?.recommendation === 'Advance to offer')
      .map((r) => ({
        title: `Extend an offer: ${r.shortlist[0].name} — ${r.role}`,
        detail: `Ranked #1 of ${r.applicants} (score ${r.shortlist[0].score}). Strongest on ${r.shortlist[0].strength}. Move to offer while engaged.`,
      })),
    ...roles
      .filter((r) => r.shortlist.some((s) => s.recommendation === 'Second-round interview'))
      .map((r) => ({
        title: `Second round: ${r.shortlist
          .filter((s) => s.recommendation === 'Second-round interview')
          .map((s) => s.name)
          .join(' & ')} — ${r.role}`,
        detail: 'Close on the specific gaps flagged in screening before committing.',
      })),
    ...thin.map((r) => ({
      title: `Widen sourcing for ${r.role}`,
      detail: `Only ${r.qualified} of ${r.applicants} applicants clear the bar. Re-open sourcing and revisit the JD's must-haves.`,
    })),
    {
      title: 'Standardise the interview scorecard',
      detail: `Spread between screen match and interview score is wide (avg ${avgJdMatch}% vs ${avgInterview}). Lock the rubric and calibrate panels.`,
    },
  ]

  const summary = [
    `${applied} candidates across ${roleNames.length} roles — ${screenedPass} cleared screening, ${shortlisted} shortlisted.`,
    `Average JD match ${avgJdMatch}%, average interview score ${avgInterview}.`,
    roles
      .filter((r) => r.shortlist[0])
      .map((r) => `${r.role}: ${r.shortlist[0].name} leads (score ${r.shortlist[0].score})`)
      .join('; ') + '.',
    thin.length
      ? `Pipeline is thin for ${thin.map((r) => r.role).join(', ')} — widen sourcing.`
      : 'Every role has at least two viable candidates.',
  ]

  const data: HRReportData = {
    applied,
    screenedPass,
    interviewed,
    shortlisted,
    avgJdMatch,
    avgInterview,
    roles,
    recommendations,
  }
  return { generatedAt: Date.now(), itemsAnalyzed: applied, summary, data }
}

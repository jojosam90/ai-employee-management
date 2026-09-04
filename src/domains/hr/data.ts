import type { WorkItem, DomainReport } from '../config'
import { mulberry32, pickOne } from '../rng'

export interface ExperienceEntry {
  company: string
  title: string
  start: string
  end: string
  bullets: string[]
}

export interface CandidateData {
  ref: string
  name: string
  role: string
  seniority: string
  years: number
  currentTitle: string
  company: string
  headline: string
  summary: string
  location: string
  education: string
  eduYear: string
  skills: string[]
  skillLevels: Record<string, number>
  highlights: string[]
  experience: ExperienceEntry[]
  languages: { name: string; level: string }[]
  interests: string[]
  contact: { email: string; phone: string; linkedin: string }
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
const EDU_BY_ROLE: Record<string, string[]> = {
  'Senior Backend Engineer': ['BSc Computer Science', 'BEng Software Engineering', 'MSc Distributed Systems'],
  'Product Designer': ['BA Design', 'BFA Interaction Design', 'MSc Human–Computer Interaction'],
  'Data Analyst': ['BSc Statistics', 'BSc Economics', 'MSc Data Science'],
}
const CURRENT_TITLE_BY_ROLE: Record<string, string[]> = {
  'Senior Backend Engineer': ['Senior Backend Engineer', 'Staff Engineer', 'Backend Engineer II', 'Tech Lead'],
  'Product Designer': ['Product Designer', 'Senior Product Designer', 'UX Designer'],
  'Data Analyst': ['Data Analyst', 'Senior Data Analyst', 'Analytics Engineer'],
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

const COMPANIES = [
  'Northwind Labs', 'Meridian Systems', 'BluePeak', 'Cadence Retail', 'Harbor Analytics',
  'Volta Payments', 'Kirin Media', 'Evergreen Health', 'Aster Mobility', 'Lumen Cloud',
  'Foundry Digital', 'Beacon Financial', 'Tessellate', 'Parallel Works',
]

const LANG_POOL = [
  { name: 'Mandarin', level: 'Professional' },
  { name: 'Malay', level: 'Professional' },
  { name: 'Japanese', level: 'Conversational' },
  { name: 'Spanish', level: 'Conversational' },
  { name: 'Hindi', level: 'Professional' },
  { name: 'German', level: 'Elementary' },
  { name: 'French', level: 'Elementary' },
]

const INTEREST_POOL = [
  'Trail running', 'Chess', 'Photography', 'Open-source', 'Cooking', 'Cycling',
  'Board games', 'Live music', 'Hiking', 'Ceramics', 'Football', 'Bouldering',
]

const EXP_TITLES: Record<string, string[]> = {
  'Senior Backend Engineer': ['Senior Backend Engineer', 'Software Engineer', 'Junior Developer'],
  'Product Designer': ['Product Designer', 'UX Designer', 'Design Intern'],
  'Data Analyst': ['Data Analyst', 'Junior Data Analyst', 'Data Intern'],
}

const EXP_BULLETS: Record<string, string[]> = {
  'Senior Backend Engineer': [
    'Designed and shipped event-driven services handling 4k req/s',
    'Cut p95 latency 40% by reworking the query layer',
    'Introduced contract tests, dropping integration incidents by half',
    'Owned the on-call rota and the incident review process',
    'Migrated the monolith’s billing module to a standalone service',
  ],
  'Product Designer': [
    'Owned the end-to-end redesign of the onboarding flow (+14% activation)',
    'Built and documented the component library used across 3 squads',
    'Ran 12 moderated research sessions and synthesised the findings',
    'Partnered with engineering to ship an accessibility pass to WCAG AA',
    'Established the team’s weekly design critique',
  ],
  'Data Analyst': [
    'Built the self-serve dashboard suite in Looker used by 60+ staff',
    'Modelled the core metrics layer in dbt, cutting ad-hoc SQL requests 35%',
    'Ran the pricing experiment that informed the Q3 packaging change',
    'Automated the weekly exec report, saving ~6 analyst-hours a week',
    'Set up anomaly alerts on the revenue pipeline',
  ],
}

const SUMMARY_BY_ROLE: Record<string, string> = {
  'Senior Backend Engineer':
    'Backend engineer focused on reliable, well-tested distributed systems. Comfortable owning a service from design through on-call, and bringing the rest of the team along.',
  'Product Designer':
    'Product designer working end-to-end from research to shipped UI. Care about design systems, accessibility, and keeping the feedback loop with engineering tight.',
  'Data Analyst':
    'Analyst who turns messy data into decisions leaders actually use. Strong on SQL and modelling, and on telling the story the numbers support.',
}

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
      const first = pickOne(rand, FIRST)
      const last = pickOne(rand, LAST)
      const name = `${first} ${last}`
      const applied = new Date(day0 + n * 7 * 3600_000 + Math.floor(rand() * 4 * 3600_000))

      const currentTitle = pickOne(rand, CURRENT_TITLE_BY_ROLE[role.title] ?? [role.title])
      const location = pickOne(rand, CITIES)

      // skill proficiency bars — must-haves the candidate has read higher
      const skillLevels: Record<string, number> = {}
      for (const s of skills) {
        const base = matched.includes(s) ? 68 + rand() * 27 : 52 + rand() * 32
        skillLevels[s] = Math.round(base / 5) * 5
      }

      // work history — 2–3 stints spanning `years`, most recent first
      const companyBag = [...COMPANIES].sort(() => rand() - 0.5)
      const currentCompany = companyBag[0]
      const titles = EXP_TITLES[role.title] ?? [currentTitle, 'Associate', 'Intern']
      const bulletBag = [...(EXP_BULLETS[role.title] ?? HL_POOL)].sort(() => rand() - 0.5)
      const stints = years >= 8 ? 3 : 2
      const experience: ExperienceEntry[] = []
      let endY = 2026
      let remaining = years
      let bi = 0
      for (let s = 0; s < stints; s++) {
        const slotsLeft = stints - s
        const avg = remaining / slotsLeft
        const len =
          s === stints - 1
            ? Math.max(1, remaining)
            : Math.max(1, Math.min(remaining - (slotsLeft - 1), Math.round(avg + (rand() - 0.5))))
        const startY = endY - len
        experience.push({
          company: s === 0 ? currentCompany : companyBag[s % companyBag.length],
          title: titles[Math.min(s, titles.length - 1)],
          start: String(startY),
          end: s === 0 ? 'Present' : String(endY),
          bullets: bulletBag.slice(bi, bi + (s === 0 ? 3 : 2)),
        })
        bi += s === 0 ? 3 : 2
        endY = startY
        remaining -= len
      }

      const languages = [
        { name: 'English', level: 'Native / bilingual' },
        ...[...LANG_POOL].sort(() => rand() - 0.5).slice(0, 1 + Math.floor(rand() * 2)),
      ]
      const interests = [...INTEREST_POOL].sort(() => rand() - 0.5).slice(0, 3)
      const handleFirst = first.toLowerCase().replace(/[^a-z]/g, '')
      const handleLast = last.toLowerCase().replace(/[^a-z]/g, '')
      const contact = {
        email: `${handleFirst}.${handleLast}@gmail.com`,
        phone: `+65 ${pickOne(rand, ['8', '9'])}${Math.floor(100 + rand() * 900)} ${Math.floor(1000 + rand() * 9000)}`,
        linkedin: `linkedin.com/in/${handleFirst}-${handleLast}`,
      }

      const data: CandidateData = {
        ref: `CAND-00${42 + n}`,
        name,
        role: role.title,
        seniority: role.seniority,
        years,
        currentTitle,
        company: currentCompany,
        headline: `${currentTitle} at ${currentCompany}`,
        summary: SUMMARY_BY_ROLE[role.title] ?? '',
        location,
        education: pickOne(rand, EDU_BY_ROLE[role.title] ?? ['BSc Computer Science']),
        eduYear: String(2026 - years - 1 - Math.floor(rand() * 2)),
        skills,
        skillLevels,
        highlights: [...HL_POOL].sort(() => rand() - 0.5).slice(0, 2 + Math.floor(rand() * 2)),
        experience,
        languages,
        interests,
        contact,
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

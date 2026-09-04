import type { WorkItem, DomainReport } from '../config'
import { mulberry32 } from '../rng'

export interface WorkNote {
  by: string
  text: string
}

export interface IncidentData {
  number: string
  caller: string
  category: string
  ci: string
  shortDesc: string
  description: string
  impact: string
  urgency: string
  priority: string
  openedAt: string
  slaMins: number
  state: string
  workNotes: WorkNote[]
  l1: { priority: string; kb: string; quickFix: string }
  l2: { rootCause: string; correlatedWith?: string; standardFix: string }
  l3: { resolution: string; rca: string; permanentFix: string; closeCode: string; resolvedMins: number }
}

interface Template {
  category: string
  ci: string
  short: string
  desc: string
  impact: 'High' | 'Medium' | 'Low'
  kb: string
  quickFix: string
  rootCause: string
  standardFix: string
  permanentFix: string
  rca: string
  cluster?: string // incidents sharing a cluster form a "problem candidate"
}

const TEMPLATES: Template[] = [
  {
    category: 'Network',
    ci: 'api-gateway-prod',
    short: 'Payments API returning 5xx errors',
    desc: 'Checkout failing for ~30% of customers. External monitoring alerting on 502s from the payments endpoint.',
    impact: 'High',
    kb: 'KB0041 — Gateway 5xx triage',
    quickFix: 'Confirmed not a client-side issue; failed a canary request against the gateway.',
    rootCause: 'Expired TLS certificate on api-gateway upstream',
    standardFix: 'Rotate the upstream certificate and reload the gateway config.',
    permanentFix: 'Move gateway certs to automated ACME renewal with 30-day pre-expiry alerting.',
    rca: 'Certificate auto-renewal job silently failed 3 weeks ago; no alert fired.',
    cluster: 'cert-expiry',
  },
  {
    category: 'Network',
    ci: 'internal-proxy',
    short: 'Staff cannot reach the analytics portal',
    desc: 'Analytics portal times out from the office network; works fine over VPN.',
    impact: 'Medium',
    kb: 'KB0041 — Gateway 5xx triage',
    quickFix: 'Reproduced from a second office subnet.',
    rootCause: 'Expired TLS certificate on api-gateway upstream',
    standardFix: 'Rotate the upstream certificate and reload the gateway config.',
    permanentFix: 'Move gateway certs to automated ACME renewal with 30-day pre-expiry alerting.',
    rca: 'Same expired certificate as the payments incident.',
    cluster: 'cert-expiry',
  },
  {
    category: 'Email / M365',
    ci: 'exchange-online',
    short: 'Outbound email delayed by 20+ minutes',
    desc: 'Multiple users report sent mail sitting in the outbox / delayed delivery reports.',
    impact: 'Medium',
    kb: 'KB0088 — Mail flow delays',
    quickFix: 'Checked service health dashboard — no Microsoft-side advisory.',
    rootCause: 'Connector throttling after a marketing blast exceeded the tenant send rate',
    standardFix: 'Raise a rate-limit exception and stagger the campaign send.',
    permanentFix: 'Route bulk mail through a dedicated marketing sub-domain and IP pool.',
    rca: 'Campaign tool sent 40k messages in 10 minutes, tripping tenant throttling.',
  },
  {
    category: 'Access / IAM',
    ci: 'okta',
    short: 'New joiners missing access to the CRM',
    desc: 'Three new sales hires cannot sign in to the CRM on day one.',
    impact: 'Medium',
    kb: 'KB0102 — Joiner access provisioning',
    quickFix: 'Confirmed accounts exist in the directory but lack the CRM group.',
    rootCause: 'Joiner automation did not map the "Sales" job code to the CRM group',
    standardFix: 'Add the users to the CRM access group manually and re-run the sync.',
    permanentFix: 'Add the missing role mapping to the joiner workflow and add a provisioning check.',
    rca: 'HR added a new "Sales — Field" job code that was not in the IAM mapping table.',
    cluster: 'joiner-mapping',
  },
  {
    category: 'Access / IAM',
    ci: 'okta',
    short: 'Contractor locked out after MFA reset',
    desc: 'Contractor cannot complete MFA enrolment; loops back to the setup screen.',
    impact: 'Low',
    kb: 'KB0110 — MFA enrolment loop',
    quickFix: 'Cleared the stale factor and sent a fresh enrolment link.',
    rootCause: 'Orphaned MFA factor from a previous device blocking re-enrolment',
    standardFix: 'Remove the orphaned factor and re-issue enrolment.',
    permanentFix: 'Enable automatic cleanup of unverified factors older than 24h.',
    rca: 'Device was wiped without de-registering the authenticator.',
  },
  {
    category: 'Endpoint',
    ci: 'laptop-fleet',
    short: 'Laptops very slow after the latest update',
    desc: 'Several users report high fan noise and sluggish performance since Tuesday.',
    impact: 'Medium',
    kb: 'KB0055 — Post-patch performance',
    quickFix: 'Confirmed a background process pegging CPU on affected machines.',
    rootCause: 'EDR agent stuck in a re-scan loop after a definition update',
    standardFix: 'Push the EDR hotfix and restart the agent service.',
    permanentFix: 'Add EDR definition updates to the staged-ring rollout instead of pushing fleet-wide.',
    rca: 'Vendor definition update shipped with a regression in the scan scheduler.',
  },
  {
    category: 'Application',
    ci: 'hr-portal',
    short: 'HR portal shows blank page on login',
    desc: 'Employees see a white screen after authenticating to the HR self-service portal.',
    impact: 'Low',
    kb: 'KB0071 — Portal blank page',
    quickFix: 'Reproduced in an incognito window; ruled out a caching issue.',
    rootCause: 'Front-end build referencing an asset removed in the last deploy',
    standardFix: 'Redeploy the previous known-good front-end build.',
    permanentFix: 'Add a smoke test to the deploy pipeline that loads the authenticated home page.',
    rca: 'A shared component was renamed without updating one import path; bundler did not fail the build.',
  },
  {
    category: 'Database',
    ci: 'orders-db-primary',
    short: 'Order search timing out in the admin console',
    desc: 'Support staff report the order lookup spinning and eventually erroring.',
    impact: 'High',
    kb: 'KB0093 — Slow query triage',
    quickFix: 'Captured the slow query and its execution plan.',
    rootCause: 'Missing index after a schema migration dropped it',
    standardFix: 'Recreate the index concurrently on the orders table.',
    permanentFix: 'Add an index-drift check to the migration review checklist.',
    rca: 'Migration rebuilt the table and did not restore a non-primary index.',
  },
  {
    category: 'Infra / Compute',
    ci: 'k8s-cluster-prod',
    short: 'Background jobs not running overnight',
    desc: 'Nightly reconciliation and export jobs did not run; morning reports missing.',
    impact: 'Medium',
    kb: 'KB0120 — Cron / job scheduler',
    quickFix: 'Confirmed the scheduler pod was in CrashLoopBackOff.',
    rootCause: 'Scheduler pod evicted — node ran out of disk from unrotated logs',
    standardFix: 'Free disk on the node and reschedule the pod; re-run missed jobs.',
    permanentFix: 'Add log rotation + a disk-pressure alert at 80%.',
    rca: 'A verbose debug flag left on in one service filled the node disk over two weeks.',
  },
  {
    category: 'Application',
    ci: 'file-share',
    short: 'Cannot open shared drive from Finance folder',
    desc: 'Finance team gets "access denied" on a folder they used yesterday.',
    impact: 'Low',
    kb: 'KB0102 — Joiner access provisioning',
    quickFix: 'Checked effective permissions — the Finance group was removed from the ACL.',
    rootCause: 'Bulk permission cleanup script removed a group it should have kept',
    standardFix: 'Restore the Finance group on the folder ACL from backup.',
    permanentFix: 'Require a dry-run + approval for the permission cleanup script.',
    rca: 'The cleanup allow-list was out of date.',
    cluster: 'joiner-mapping',
  },
  {
    category: 'Network',
    ci: 'wifi-hq',
    short: 'Wi-Fi dropping in the east meeting rooms',
    desc: 'Calls drop when moving between rooms 4–7 on the second floor.',
    impact: 'Low',
    kb: 'KB0130 — Wireless roaming',
    quickFix: 'Walked the floor with a survey tool; found a coverage hole.',
    rootCause: 'One access point offline after a PoE switch port failed',
    standardFix: 'Move the AP to a working port; replace the failed switch line card.',
    permanentFix: 'Add PoE port monitoring to the network alerting.',
    rca: 'Switch line card degraded over time; no alert on the individual port.',
  },
  {
    category: 'Email / M365',
    ci: 'sharepoint-online',
    short: 'Shared mailbox not receiving external mail',
    desc: 'The support@ shared mailbox stopped getting messages from outside the company.',
    impact: 'Medium',
    kb: 'KB0088 — Mail flow delays',
    quickFix: 'Ran a message trace — external senders getting a 550 rejection.',
    rootCause: 'A transport rule change quarantined mail to the shared mailbox',
    standardFix: 'Exempt the shared mailbox from the new transport rule and release quarantined mail.',
    permanentFix: 'Test transport-rule changes against a shared-mailbox test address before enabling.',
    rca: 'A new anti-spoofing rule matched the shared mailbox address pattern.',
  },
]

const CALLERS = [
  'Priya Nair',
  'Marcus Lee',
  'Elena Rossi',
  'Tomás Alvarez',
  'Grace Chen',
  'Daniel Okafor',
  'Sofia Haruki',
  'James Whitfield',
  'Aisha Rahman',
  'Ben Carter',
]

const SLA_MINS: Record<string, number> = { P1: 60, P2: 240, P3: 480, P4: 1440 }
const CLOSE_CODES = ['Solved (Permanently)', 'Solved (Work Around)', 'Solved (Configuration)']

function priorityFor(impact: string, r: number): string {
  if (impact === 'High') return r < 0.4 ? 'P1' : 'P2'
  if (impact === 'Medium') return r < 0.5 ? 'P2' : 'P3'
  return r < 0.4 ? 'P3' : 'P4'
}

export function buildIncidents(seed = 41): WorkItem[] {
  const rand = mulberry32(seed)
  const chosen = [...TEMPLATES].sort(() => rand() - 0.5).slice(0, 12)
  const day0 = new Date('2026-09-01T08:00:00Z').getTime()

  return chosen.map((t, i): WorkItem => {
    const opened = new Date(day0 + i * 5.5 * 3600_000 + Math.floor(rand() * 3 * 3600_000))
    const priority = priorityFor(t.impact, rand())
    const urgency = t.impact === 'High' ? 'High' : rand() < 0.5 ? 'Medium' : 'Low'
    const num = `INC00${41200 + i}`
    const base = SLA_MINS[priority]
    const resolvedMins = Math.round(base * (0.55 + rand() * (priority === 'P1' ? 0.9 : 0.7)))
    const data: IncidentData = {
      number: num,
      caller: CALLERS[i % CALLERS.length],
      category: t.category,
      ci: t.ci,
      shortDesc: t.short,
      description: t.desc,
      impact: t.impact,
      urgency,
      priority,
      openedAt: opened.toISOString(),
      slaMins: base,
      state: 'New',
      workNotes: [],
      l1: { priority, kb: t.kb, quickFix: t.quickFix },
      l2: {
        rootCause: t.rootCause,
        correlatedWith: t.cluster ? 'a related open incident (same signature)' : undefined,
        standardFix: t.standardFix,
      },
      l3: {
        resolution: t.standardFix,
        rca: t.rca,
        permanentFix: t.permanentFix,
        closeCode: CLOSE_CODES[Math.floor(rand() * CLOSE_CODES.length)],
        resolvedMins,
      },
    }
    const item: WorkItem & { _cluster?: string } = {
      id: `it${i}`,
      ref: num,
      title: t.short,
      kind: priority.toLowerCase(),
      priority: priority === 'P1' ? 4 : priority === 'P2' ? 3 : priority === 'P3' ? 1 : 0,
      stage: 'l1triage',
      progress: 0,
      createdAt: opened.toISOString(),
      data: data as unknown as Record<string, unknown>,
      _cluster: t.cluster, // stashed for the recurring-problem report
    }
    return item
  })
}

const noteAt = (by: string, text: string): WorkNote => ({ by, text })

export const itOnComplete = {
  l1: (item: WorkItem) => {
    const d = item.data as unknown as IncidentData
    d.state = 'In Progress'
    d.workNotes.push(
      noteAt(
        'L1',
        `Triaged: category ${d.category}, priority ${d.l1.priority}. ${d.l1.quickFix} Referenced ${d.l1.kb}. Escalating to L2.`,
      ),
    )
  },
  l2: (item: WorkItem) => {
    const d = item.data as unknown as IncidentData
    d.workNotes.push(
      noteAt(
        'L2',
        `Root cause: ${d.l2.rootCause}.${d.l2.correlatedWith ? ` Correlated with ${d.l2.correlatedWith}.` : ''} Standard fix: ${d.l2.standardFix} Escalating to L3 for permanent fix.`,
      ),
    )
  },
  l3: (item: WorkItem) => {
    const d = item.data as unknown as IncidentData
    d.state = 'Resolved'
    d.workNotes.push(
      noteAt(
        'L3',
        `Applied: ${d.l3.resolution} Permanent fix: ${d.l3.permanentFix} RCA: ${d.l3.rca} Closed as "${d.l3.closeCode}" in ${d.l3.resolvedMins} min.`,
      ),
    )
  },
}

// ---------- Report ----------

export interface ITReportData {
  total: number
  mttrMins: number
  bySla: { met: number; breached: number }
  byPriority: { p: string; count: number; mttr: number }[]
  byCategory: { category: string; count: number }[]
  problems: { rootCause: string; count: number; refs: string[] }[]
  recommendations: { title: string; detail: string }[]
}

function fmtMttr(m: number) {
  return m >= 60 ? `${(m / 60).toFixed(1)} h` : `${Math.round(m)} min`
}

export function buildITReport(items: WorkItem[]): DomainReport {
  const rows = items.map((i) => ({
    d: i.data as unknown as IncidentData,
    cluster: (i as unknown as { _cluster?: string })._cluster,
    ref: i.ref,
  }))
  const total = rows.length
  const mttrMins = Math.round(rows.reduce((a, r) => a + r.d.l3.resolvedMins, 0) / Math.max(1, total))
  const met = rows.filter((r) => r.d.l3.resolvedMins <= r.d.slaMins).length

  const prio = ['P1', 'P2', 'P3', 'P4']
    .map((p) => {
      const rs = rows.filter((r) => r.d.priority === p)
      return {
        p,
        count: rs.length,
        mttr: rs.length ? Math.round(rs.reduce((a, r) => a + r.d.l3.resolvedMins, 0) / rs.length) : 0,
      }
    })
    .filter((x) => x.count > 0)

  const catMap = new Map<string, number>()
  rows.forEach((r) => catMap.set(r.d.category, (catMap.get(r.d.category) ?? 0) + 1))
  const byCategory = [...catMap.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  const rcMap = new Map<string, string[]>()
  rows.forEach((r) => {
    const list = rcMap.get(r.d.l2.rootCause) ?? []
    list.push(r.ref)
    rcMap.set(r.d.l2.rootCause, list)
  })
  const problems = [...rcMap.entries()]
    .filter(([, refs]) => refs.length > 1)
    .map(([rootCause, refs]) => ({ rootCause, count: refs.length, refs }))
    .sort((a, b) => b.count - a.count)

  const p1 = rows.filter((r) => r.d.priority === 'P1')
  const recommendations = [
    ...problems.map((p) => ({
      title: `Raise a Problem record: ${p.rootCause}`,
      detail: `${p.count} incidents this period (${p.refs.join(', ')}) share this root cause. Track a permanent fix under one Problem and link the incidents.`,
    })),
    {
      title: 'Automate the highest-volume category',
      detail: `${byCategory[0]?.category} accounts for ${byCategory[0]?.count} of ${total} incidents. Build a self-service runbook / bot flow for the common request.`,
    },
    p1.length
      ? {
          title: 'Tighten the P1 response path',
          detail: `${p1.length} P1 incident${p1.length > 1 ? 's' : ''} this period, MTTR ${fmtMttr(
            Math.round(p1.reduce((a, r) => a + r.d.l3.resolvedMins, 0) / p1.length),
          )}. Add proactive monitoring + a paging runbook for ${p1[0].d.ci}.`,
        }
      : {
          title: 'Keep monitoring coverage current',
          detail: 'No P1s this period. Review alert thresholds so early signals still page the on-call.',
        },
    {
      title: 'Publish / refresh knowledge-base articles',
      detail: 'Close each incident with a KB link so L1 can resolve repeat cases at first contact.',
    },
  ]

  const summary = [
    `${total} incidents worked this period — mean time to resolve ${fmtMttr(mttrMins)}, ${Math.round(
      (met / total) * 100,
    )}% within SLA.`,
    `${byCategory[0]?.category} is the largest category (${byCategory[0]?.count}); ${
      prio.find((x) => x.p === 'P1')?.count ?? 0
    } P1 and ${prio.find((x) => x.p === 'P2')?.count ?? 0} P2.`,
    problems.length
      ? `${problems.length} recurring root cause${problems.length > 1 ? 's' : ''} detected — "${problems[0].rootCause}" hit ${problems[0].count} times. Worth a Problem record.`
      : 'No recurring root causes this period.',
    `Biggest lever: a self-service runbook for ${byCategory[0]?.category} plus a Problem record for the top recurring issue.`,
  ]

  const data: ITReportData = {
    total,
    mttrMins,
    bySla: { met, breached: total - met },
    byPriority: prio,
    byCategory,
    problems,
    recommendations,
  }
  return { generatedAt: Date.now(), itemsAnalyzed: total, summary, data }
}

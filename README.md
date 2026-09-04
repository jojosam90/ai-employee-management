# AI Employee Management Dashboard

A web dashboard for supervising teams of AI "employees" that move work items
through a pipeline of specialist agents and deliver an executive summary for the
boss. One config-driven engine powers three domains:

| Domain | Work item | Agents | Deliverable |
|---|---|---|---|
| **Finance** | invoice / till receipt / expense claim | Intake+OCR → Extraction → Reconciliation → Reporting | spend breakdown, forecast, cost-savings (S$) |
| **IT Support** | incident (ServiceNow-style) | L1 triage → L2 root cause → L3 permanent fix → Reporting | MTTR, SLA attainment, recurring problems, runbook/automation recs |
| **HR** | candidate application | Résumé screen → Structured interview → Compare & rank → Reporting | pipeline funnel, per-role ranked shortlist, offer / second-round recs |

Each domain has a **live detail view** that follows one item through the line
(the source document / incident record / candidate profile filling in stage by
stage) and a **report** with tabs.

The team starts on **standby** — nothing runs until the operator sends an
instruction (e.g. "prioritise all invoices" / "prioritise P1 incidents" /
"prioritise senior candidates").

> The agents are **simulated** — everything is generated and "processed" in the
> browser, no API key. Each domain is a `DomainConfig` (`src/domains/*`); the
> generic engine (`src/engine/store.ts`) runs any config, so a real
> LLM backend can be dropped into one stage at a time.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · React Router · Zustand · Recharts · jsPDF

## Login & navigation

`/login` — mock auth, no password. Either **Continue as** the remembered user
(defaults to "Consap", then whoever last signed in) or enter a **full name**.
Pick which operations to view:

| Team | Route | State |
|---|---|---|
| Finance | `/finance` | Working dashboard |
| IT Support | `/itsupport` | Working dashboard |
| HR | `/hr` | Working dashboard |
| Product / Sales / Engineering | `/product` … | Placeholder (planned agents listed) |

After sign-in you're redirected to that team's page. Every page has a header
with the signed-in user, a **team switcher** dropdown, and a **Log out** button.
The session (and the last user / last team, kept across logout for the
"Continue as" card) is stored in `localStorage` (`ade-session`); unauthenticated
routes redirect to `/login`. Auth store: `src/auth/useAuth.ts`.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run lint
```

## How it works

| Piece | File |
|---|---|
| Routing + auth guard | `src/App.tsx`, `src/auth/useAuth.ts` |
| Login page / team placeholder pages | `src/pages/*` |
| Sample document generator (~10 docs, seeded, deterministic) | `src/engine/seed.ts` |
| The four agents and their pipeline stages | `src/engine/agents.ts` |
| Simulation loop, instruction parser, issue engine (Zustand store) | `src/engine/store.ts` |
| Per-document OCR / line-item / reconciliation model | `src/engine/extraction.ts` |
| Financial analysis — totals, forecast, risks, savings, buy list | `src/engine/analysis.ts` |
| Agent Workspace (Live Extraction + Financial Report tabs) | `src/components/WorkSurface.tsx`, `ExtractionView.tsx`, `ReportPanel.tsx` |
| Dashboard panels | `src/components/*` |

### The agents

1. **Agent Alpha** — Intake & OCR
2. **Agent Beta** — Field extraction & coding
3. **Agent Gamma** — Validation & reconciliation
4. **Agent Delta** — Reporting & forecast

Documents flow Alpha → Beta → Gamma; every document reconciles and is posted to
the ledger (there is no "flagged" outcome). Once the queue is clear, Delta writes
the executive summary.

### Agent Workspace

Two tabs (`WorkSurface.tsx`):

- **Live Extraction** — one document at a time going through the line (the
  "spotlight"): the **source document** is rendered as a real-looking invoice,
  till receipt or expense-claim form. Receipts include everyday ones — a café
  bill, a grocery run, a cinema ticket, a taxi fare, an electronics-store
  purchase — with their actual line items. The document sits in a fixed viewport
  that **auto-scrolls as the OCR sweep moves down it**, and each line-item /
  totals row is **boxed** as it is read (a stronger outline on the row being read
  right now). The captured
  fields land in an **Excel-style ledger sheet**; the totals are **re-computed
  and reconciled**; the row is **posted to the ledger**. About 1 in 8 documents
  carries a simulated low-confidence line read — the reconciliation shows it
  being **auto-corrected** against the printed total.
- **Executive Report** — appears once the summary is ready: a plain-language
  **Summary**, then **Spend**, **Forecast** and **Recommendations** tabs, with
  PDF export.

The right column also carries a compact **Executive Summary** panel (the same
narrative + top 3 recommendations).

### Giving instructions

The team is on **standby** until the first instruction. The **Give Instructions**
panel has a free-text box (prompt chips fill it, they don't send) plus two
one-click actions:

- **Pause all agents** — freezes every agent; the button becomes **Resume all
  agents**, which continues the run
- **Reallocate resources** — adds a floating helper agent (Epsilon, then Zeta)
  that picks up work at any pipeline stage, raising throughput

Recognised free-text intents:

- `prioritise all invoices` (or receipts, claims, …) — also starts processing
- `pause Agent Beta` / `resume all` / `pause all`
- `focus on vendor <name>`
- `reallocate resources` / `add an agent`
- `reset`

Anything else is logged and, on standby, still starts the run.

## Swapping in real extraction

`src/engine/store.ts` `tick()` advances each document's `progress` and, on
completion, sets `confidence` and the next stage. Replace the per-stage
completion blocks with calls to a real backend (e.g. send the PDF to Claude for
structured extraction) and keep the rest of the dashboard unchanged.

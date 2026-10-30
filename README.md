# Wholesale Command Center

**All in one platform for wholesaling real estate.** (Dajon's description for this repo, kept from its initial commit.)

Dajon's own XLeads-class wholesaling app — everything XLeads has, easier
to use like the Lead Inbox, with agents built inside, on ground he owns:
his GitHub, free hosting, and Supabase as the database hub.

**This is Phase 1:** a real, building Vite + React + TypeScript codebase
running on real seed data (the virtual lead bucket + the Oct 2026
Craigslist buyer file). It sends nothing, calls nobody, and connects to
no paid service. The Lead Inbox artifact stays the working ops tool
until this app is verified and cut over.

Blueprint: `xleads-clone-build-blueprint-2026-10-29.md` (workspace goal
`xleads-class-wholesaling-app-build`).

## What's inside

| Area | Where | What it does |
|---|---|---|
| Dashboard | `src/pages/Dashboard.tsx` | Bucket totals, approvals waiting, buyers callable now, pipeline counts, today's calls, follow-ups due, weekly scorecard (5-new-sellers goal) |
| Leads | `src/pages/LeadsPage.tsx` | Scored sample leads, filter by market / multi-flag / search |
| Pipeline | `src/pages/PipelinePage.tsx` | Kanban across the six stages: New Lead → Attempted Contact → Conversation → Offer Made → Under Contract → Nurture/Dead |
| Buyers | `src/pages/BuyersPage.tsx` | The real buyer file with buy boxes and call-ready flags |
| Agents | `src/pages/AgentsPage.tsx` | Pricer (live MAO/LAO), Scorer (ranked leads, math shown), Follow-up drafter (draft previews), Dispo matcher |
| Settings | `src/pages/SettingsPage.tsx` | Phase 2 slots: Supabase, Twilio, skip-trace — all clearly NOT CONNECTED |
| Logic | `src/lib/` | Pure TypeScript modules (see below), covered by `scripts/test-logic.ts` |
| Schema | `supabase/migrations/0001_schema.sql` | leads, properties, owners, phones, buyers, buy_boxes, outreach_plans, follow_ups, dnc_entries, offers |
| Seed | `src/data/seed.json` | Generated from real files by `scripts/generate-seed.py` |

### Logic modules (`src/lib/`)

- **pricer.ts** — Ginn math. `MAO = (ARV − repairs) × tier`; tiers by
  ARV: <$120k 0.70 · $120–220k 0.80 · $220–300k 0.815 · $300–400k
  0.829 · $400k+ 0.849. `LAO = MAO × 0.70` (always open at the LAO).
- **scorer.ts** — flag count × 40 + sale-urgency points + market
  points. Multi-flag properties (on 2+ lists) rank hottest.
- **followups.ts** — drafts the 7-day and 30-day "not now" follow-ups.
  Draft only; AI discloses itself; every draft carries STOP.
- **dispo.ts** — matches a deal (market / type / price) to buyer buy
  boxes; callable buyers rank first.
- **dncGate.ts** — seller + individual numbers blocked until
  `dnc_status = 'clear'`; published business buyer lines exempt
  (2026-10-29 rule). Includes the FTC-list scrub helper.
- **approvalGate.ts** — outreach lifecycle draft → pending_approval →
  approved → sent. Unapproved plans *cannot* be marked sent (throws).
  `markSent` only records a send Dajon performed himself; Phase 1 has
  no send function.
- **providers/twilio.ts / providers/skipTrace.ts** — Phase 2 stubs.
  Every function throws "not connected". No credentials, no signups.

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # logic test suite (tsx scripts/test-logic.ts)
npm run build      # type-check + production build into dist/
npm run seed       # regenerate src/data/seed.json from the source CSVs
```

Requires Node 18+ (built/tested on Node 24). Note: `package.json`
pins Rollup to 4.65.1 via npm `overrides` — the 4.67.x platform
tarball was missing from the registry mirror during the Phase 1
build; the pin is safe to remove once that's fixed upstream.

## Deploy (free)

The build is static files (`dist/`) — any free static host works:

- **Vercel:** import the repo, framework preset "Vite", build command
  `npm run build`, output `dist`. No env vars needed for Phase 1.
- **Netlify:** same build command / publish directory `dist`
  (drag-and-drop of `dist/` also works for a quick preview).
- **Cloudflare Pages:** same settings.

Do NOT push this repo anywhere or deploy it until Dajon says go —
Phase 1 is a local build.

## Supabase setup (when Phase 1 is picked up for real)

1. Create a free project at supabase.com (Dajon's account — his step).
2. SQL editor → run `supabase/migrations/0001_schema.sql` (or
   `supabase db push` with the CLI).
3. Run the full CSV migration per `scripts/import-csv-notes.md`:
   bucket → properties/owners/leads, buyers → buyers/buy_boxes,
   FTC lists → `dnc_entries`, then the scrub job. Row-count and
   spot-check verification gates are in that runbook — cutover happens
   only after they pass.
4. Wire the app: replace the seed exports in `src/data/seedData.ts`
   with Supabase queries (same shapes as `src/lib/types.ts`). RLS is
   enabled on all tables in the migration; add owner policies with
   auth.

## Phase 2 wiring notes (funded by Dajon at build completion)

- **Twilio:** number + A2P registration; credentials server-side only;
  sending allowed ONLY for plans passing `approvalGate.assertSendable()`
  to numbers passing `dncGate.canContact()`. STOP handling flips the
  phone record to `registered`.
- **Paid skip trace:** provider slot in
  `src/lib/providers/skipTrace.ts` (Tracerfy first candidate). Results
  land as `dnc_status = 'unchecked'` — a trace hit is not permission
  to contact.
- **Contracts / e-sign:** slot chosen from the stack research at
  Phase 2; state PSA pack + assignment, title shortlist per market.

## Non-negotiable rules (architecture, not settings)

1. **Approval gate.** AI/automated texting only after Dajon approves
   who gets texted, what the texts say, and when they go — before any
   send. Never fully auto.
2. **DNC gate.** Every seller/homeowner contact is gated on the FTC
   scrub. Published business buyer lines are exempt per Dajon's
   2026-10-29 correction (the registry covers personal numbers).
3. **No AI calling. Ever.** There is no calling module, stub, or
   setting in this codebase, and Phase 2 adds none.
4. **Honest outreach.** AI identifies itself; every text carries
   STOP/opt-out.
5. **Free-first.** No paid anything until Dajon approves that item.
   (Twilio + paid skip trace are pre-approved for Phase 2 only.)
6. **Unverified stays unverified.** Bucket rows are public-record data
   until county confirmation; nothing here upgrades that silently.

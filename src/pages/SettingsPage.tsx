import { SKIP_TRACE_PROVIDER_CONNECTED } from '../lib/providers/skipTrace';
import { TWILIO_CONNECTED } from '../lib/providers/twilio';
import { generatedFrom } from '../data/seedData';

export default function SettingsPage() {
  return (
    <div className="stack">
      <div className="slot">
        <h3 style={{ marginTop: 0 }}>Database — Supabase hub</h3>
        <p className="small">
          <span className="status">NOT CONNECTED YET.</span> Phase 1 runs on bundled seed
          data. Schema is ready at <code>supabase/migrations/0001_schema.sql</code> —
          leads, properties, owners, phones, buyers, buy_boxes, outreach_plans,
          follow_ups, dnc_entries, offers. Setup: create a free Supabase project → apply
          the migration → full CSV migration per <code>scripts/import-csv-notes.md</code>.
        </p>
        <p className="small muted">
          Seed sources: {Object.values(generatedFrom).join(' · ')}
        </p>
      </div>

      <div className="slot">
        <h3 style={{ marginTop: 0 }}>Texting pipe — Twilio (Phase 2 slot)</h3>
        <p className="small">
          <span className="status">
            {TWILIO_CONNECTED ? 'CONNECTED' : 'NOT CONNECTED — Phase 2.'}
          </span>{' '}
          The stub in <code>src/lib/providers/twilio.ts</code> throws on any send attempt.
          Phase 2 (Dajon funds at build completion): Twilio number + A2P registration.
          Even then, transmission is allowed only for plans Dajon approved
          (who/what/when) to numbers that pass the DNC gate. Until then, the app hands
          Dajon scripts and he sends manually from his TextNow number, (209) 336-9237 —
          TextNow has no API and stays his manual number.
        </p>
      </div>

      <div className="slot">
        <h3 style={{ marginTop: 0 }}>Skip-trace provider (Phase 2 slot)</h3>
        <p className="small">
          <span className="status">
            {SKIP_TRACE_PROVIDER_CONNECTED ? 'CONNECTED' : 'NOT CONNECTED — Phase 2.'}
          </span>{' '}
          Today: free people-search queue (lookup lists Dajon runs on his phone). Phase 2
          first candidate is Tracerfy (pay-per-record, misses free). A trace hit is never
          contact permission — results land as <code>dnc_status = 'unchecked'</code> and
          stay behind the DNC gate.
        </p>
      </div>

      <div className="card">
        <h3>Non-negotiable rules (baked into the code, not settings)</h3>
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>
            <strong>Approval gate:</strong> outreach moves draft → pending_approval →
            approved → sent. Only Dajon approves who gets contacted, what the message
            says, and when it goes. An unapproved plan cannot be marked sent — the code
            throws.
          </li>
          <li>
            <strong>DNC gate:</strong> seller/homeowner and individual numbers are blocked
            until scrubbed clear against the FTC lists (901 / 317 / 314 / 216 / 713).
            Published business buyer lines are exempt per Dajon's 2026-10-29 rule.
          </li>
          <li>
            <strong>No AI calling — anywhere.</strong> There is no calling module, stub,
            or setting in this codebase. That is architecture, not configuration.
          </li>
          <li>
            <strong>Honest outreach:</strong> AI drafts disclose themselves; every text
            carries a STOP/opt-out line.
          </li>
          <li>
            <strong>Free-first:</strong> no paid service connects until Dajon says so for
            that item. Twilio + paid skip trace are pre-approved for Phase 2 only.
          </li>
        </ul>
      </div>
    </div>
  );
}

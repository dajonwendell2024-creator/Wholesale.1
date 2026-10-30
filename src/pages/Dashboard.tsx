import { useMemo } from 'react';
import { bucketTotals, buyers, sampleLeads } from '../data/seedData';
import { PIPELINE_STAGES } from '../lib/types';
import { draftFollowUpPair } from '../lib/followups';

export default function Dashboard({ go }: { go: (tab: string) => void }) {
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const stage of PIPELINE_STAGES) counts[stage] = 0;
    for (const lead of sampleLeads) counts[lead.stage] = (counts[lead.stage] ?? 0) + 1;
    return counts;
  }, []);

  const callableBuyers = buyers.filter((b) => b.callReady === 'callable');
  const topLeads = sampleLeads.slice(0, 5);

  // Demo approval queue: follow-up drafts generated for the hottest
  // leads. In production these come from follow_ups + outreach_plans
  // rows; every one sits in 'draft' until Dajon approves who/what/when.
  const approvalDrafts = useMemo(
    () => sampleLeads.slice(0, 3).flatMap((lead) => draftFollowUpPair(lead)),
    [],
  );
  const followUpsDue = approvalDrafts
    .filter((d) => d.kind === '7-day')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="stack">
      <div className="grid">
        <div className="card">
          <h3>Leads in the bucket (full file)</h3>
          <div className="big">{bucketTotals.totalLeads.toLocaleString()}</div>
          <div className="small muted">
            {Object.entries(bucketTotals.perMarket)
              .map(([m, n]) => `${m} ${n}`)
              .join(' · ')}
          </div>
          <div className="small muted" style={{ marginTop: 6 }}>
            App demo runs on {sampleLeads.length} curated sample leads; the full
            bucket migrates into Supabase (see scripts/import-csv-notes.md).
          </div>
        </div>

        <div className="card">
          <h3>Approvals waiting on you</h3>
          <div className="big">{approvalDrafts.length}</div>
          <div className="small muted">
            Draft follow-ups sitting in <strong>draft</strong> — nothing sends
            without your approval of who, what, and when.
          </div>
          <button className="ghost" style={{ marginTop: 8 }} onClick={() => go('agents')}>
            Review drafts in Agents →
          </button>
        </div>

        <div className="card">
          <h3>Buyers callable now</h3>
          <div className="big">{callableBuyers.length}</div>
          <div className="small muted">
            Published business lines (DNC-exempt) + scrubbed-clear individuals
            from the Oct 29 buyer file.
          </div>
          <button className="ghost" style={{ marginTop: 8 }} onClick={() => go('buyers')}>
            Open buyer list →
          </button>
        </div>

        <div className="card">
          <h3>Weekly scorecard — new sellers contacted</h3>
          <div className="big">0 / 5</div>
          <div className="small muted">
            Goal locked 2026-10-10: 5 new sellers a week, plus priority calls
            made and owner letters mailed. Live tracking lands with the
            Supabase cutover; seller outreach still waits on DNC-clear
            numbers.
          </div>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Pipeline — sample leads by stage</h3>
          <table>
            <tbody>
              {PIPELINE_STAGES.map((stage) => (
                <tr key={stage}>
                  <td>{stage}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{stageCounts[stage] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="ghost" style={{ marginTop: 8 }} onClick={() => go('pipeline')}>
            Open pipeline board →
          </button>
        </div>

        <div className="card">
          <h3>Today's calls</h3>
          <p className="small muted" style={{ marginTop: 0 }}>
            Placeholder for the daily call block: buyer vetting calls are
            live now (Buyers tab); seller calls join this list only when a
            lead has a phone number that is DNC-clear.
          </p>
          <strong className="small">Work first — hottest scored leads:</strong>
          <ol className="small" style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {topLeads.map((lead) => (
              <li key={lead.id}>
                {lead.address} — score {lead.score}
                {lead.saleDate ? `, sale ${lead.saleDate}` : ''}
              </li>
            ))}
          </ol>
        </div>

        <div className="card">
          <h3>Follow-ups due (drafts)</h3>
          {followUpsDue.length === 0 && <p className="small muted">None drafted yet.</p>}
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {followUpsDue.map((d) => {
              const lead = sampleLeads.find((l) => l.id === d.leadId);
              return (
                <li key={`${d.leadId}-${d.kind}`}>
                  {d.dueDate} — {lead?.address ?? d.leadId} ({d.kind}, awaiting approval)
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

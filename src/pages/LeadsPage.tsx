import { useMemo, useState } from 'react';
import { markets, sampleLeads } from '../data/seedData';

export default function LeadsPage() {
  const [market, setMarket] = useState<string>('all');
  const [multiOnly, setMultiOnly] = useState(false);
  const [query, setQuery] = useState('');

  const rows = useMemo(
    () =>
      sampleLeads.filter((lead) => {
        if (market !== 'all' && lead.market !== market) return false;
        if (multiOnly && lead.flagCount < 2) return false;
        if (query) {
          const q = query.toLowerCase();
          const hay = `${lead.address} ${lead.ownerName} ${lead.leadType}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }),
    [market, multiOnly, query],
  );

  return (
    <div className="card">
      <h3>Leads — {rows.length} shown (sample of the full bucket, scored hottest-first)</h3>
      <div className="row" style={{ marginBottom: 12 }}>
        <label className="small">
          Market{' '}
          <select value={market} onChange={(e) => setMarket(e.target.value)}>
            <option value="all">All markets</option>
            {markets.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="small">
          {' '}
          <input
            type="checkbox"
            checked={multiOnly}
            onChange={(e) => setMultiOnly(e.target.checked)}
          />{' '}
          Multi-flag only (2+ lists)
        </label>
        <input
          placeholder="Search address / owner / type…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Score</th>
              <th>Property</th>
              <th>Owner</th>
              <th>Market</th>
              <th>Type</th>
              <th>Sale date</th>
              <th>Flags</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => (
              <tr key={lead.id}>
                <td>
                  <span className="pill score">{lead.score}</span>
                </td>
                <td>{lead.address}</td>
                <td>{lead.ownerName || <span className="muted">—</span>}</td>
                <td>{lead.market}</td>
                <td>{lead.leadType}</td>
                <td>{lead.saleDate ?? <span className="muted">{lead.saleDateRaw || '—'}</span>}</td>
                <td className="small">{lead.flags.join(', ')}</td>
                <td className="small">{lead.verificationStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        All rows are UNVERIFIED public-record data until county confirmation. Seller phone
        numbers are not in this sample — they land via the skip-trace queue and stay behind
        the DNC gate until scrubbed clear.
      </p>
    </div>
  );
}

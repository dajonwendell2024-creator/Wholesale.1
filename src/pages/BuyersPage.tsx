import { useMemo, useState } from 'react';
import { buyers } from '../data/seedData';
import type { CallReady } from '../lib/types';

const FILTERS: { id: CallReady | 'all'; label: string }[] = [
  { id: 'all', label: 'All buyers' },
  { id: 'callable', label: 'Callable now' },
  { id: 'gated', label: 'Gated — check first' },
  { id: 'no-phone', label: 'No phone yet' },
];

export default function BuyersPage() {
  const [filter, setFilter] = useState<CallReady | 'all'>('all');
  const rows = useMemo(
    () => buyers.filter((b) => filter === 'all' || b.callReady === filter),
    [filter],
  );

  return (
    <div className="stack">
      <div className="row">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            className={filter === f.id ? 'tab active' : 'tab'}
            onClick={() => setFilter(f.id)}
          >
            {f.label} ({f.id === 'all' ? buyers.length : buyers.filter((b) => b.callReady === f.id).length})
          </button>
        ))}
      </div>

      <div className="grid">
        {rows.map((buyer) => (
          <div className="card" key={buyer.id}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>{buyer.name}</h3>
              <span className={`pill ${buyer.callReady}`}>
                {buyer.callReady === 'callable'
                  ? 'CALLABLE NOW'
                  : buyer.callReady === 'gated'
                    ? 'CHECK FIRST'
                    : 'NO PHONE'}
              </span>
            </div>
            <div className="small muted">
              {buyer.market}
              {buyer.phone ? ` · ${buyer.phone}` : ''}
              {buyer.isBusinessLine ? ' · published business line' : ''}
            </div>
            <p className="small" style={{ margin: '8px 0' }}>
              <strong>Buy box:</strong> {buyer.buyBox.summary || '—'}
            </p>
            <div className="small muted">
              Types: {buyer.buyBox.propertyTypes.join(', ') || 'any'}
              {buyer.buyBox.conditions.length > 0 &&
                ` · Conditions: ${buyer.buyBox.conditions.join(', ')}`}
            </div>
            {buyer.dncNote && (
              <div className="small" style={{ marginTop: 6 }}>
                <strong>DNC:</strong> {buyer.dncNote}
              </div>
            )}
            {buyer.notes && buyer.notes !== buyer.dncNote && (
              <div className="small muted" style={{ marginTop: 6 }}>{buyer.notes}</div>
            )}
            <div className="small muted" style={{ marginTop: 8 }}>
              Vet on the call: buy box · close speed · proof of funds · assignments OK?
            </div>
          </div>
        ))}
      </div>
      {rows.length === 0 && <p className="muted">No buyers in this filter.</p>}
      <p className="small muted">
        Source: Craigslist harvest 2026-10-29 + call-ready sheet. MAC Capital Enterprises
        (Cleveland + St. Louis ads) is in the full file flagged "owners only, no
        assignments" with no public phone. Nobody has been contacted from this app.
      </p>
    </div>
  );
}

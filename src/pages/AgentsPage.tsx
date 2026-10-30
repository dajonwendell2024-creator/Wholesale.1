import { useMemo, useState } from 'react';
import { buyers, sampleLeads } from '../data/seedData';
import { priceDeal, type PriceResult } from '../lib/pricer';
import { daysUntilSale, urgencyPoints } from '../lib/scorer';
import { draftFollowUpPair } from '../lib/followups';
import { matchDealToBuyers } from '../lib/dispo';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export default function AgentsPage() {
  // ---------------- Pricer state
  const [arv, setArv] = useState('185000');
  const [repairs, setRepairs] = useState('25000');
  const [sqft, setSqft] = useState('1400');
  const [price, setPrice] = useState<PriceResult | null>(null);
  const [priceError, setPriceError] = useState('');

  const runPricer = () => {
    setPriceError('');
    if (!sqft || Number(sqft) <= 0) {
      setPrice(null);
      setPriceError('Square footage is required — never quote an offer without ARV, repairs, and sq ft.');
      return;
    }
    try {
      setPrice(priceDeal(Number(arv), Number(repairs)));
    } catch (e) {
      setPrice(null);
      setPriceError(e instanceof Error ? e.message : 'Invalid inputs.');
    }
  };

  // ---------------- Follow-up drafter state
  const topTen = useMemo(() => sampleLeads.slice(0, 10), []);
  const [draftLeadId, setDraftLeadId] = useState(topTen[0]?.id ?? '');
  const draftLead = sampleLeads.find((l) => l.id === draftLeadId) ?? topTen[0];
  const drafts = draftLead ? draftFollowUpPair(draftLead) : [];

  // ---------------- Dispo state
  const [dealMarket, setDealMarket] = useState('Houston');
  const [dealType, setDealType] = useState('single-family');
  const [dealPrice, setDealPrice] = useState('150000');
  const matches = useMemo(
    () =>
      matchDealToBuyers(buyers, {
        market: dealMarket,
        propertyType: dealType,
        price: Number(dealPrice) || 0,
      }),
    [dealMarket, dealType, dealPrice],
  );

  return (
    <div className="stack">
      <div className="card">
        <h3>Pricer agent — Ginn offer math</h3>
        <p className="small muted" style={{ marginTop: 0 }}>
          MAO = (ARV − repairs) × tier multiplier · LAO = MAO × 0.70. Always open at the
          LAO; the MAO is the ceiling.
        </p>
        <div className="row">
          <label className="small">
            ARV $ <input value={arv} onChange={(e) => setArv(e.target.value)} size={9} />
          </label>
          <label className="small">
            Repairs $ <input value={repairs} onChange={(e) => setRepairs(e.target.value)} size={9} />
          </label>
          <label className="small">
            Sq ft <input value={sqft} onChange={(e) => setSqft(e.target.value)} size={6} />
          </label>
          <button className="action" onClick={runPricer}>Price it</button>
        </div>
        {priceError && <p className="small" style={{ color: 'var(--bad)' }}>{priceError}</p>}
        {price && (
          <div className="row" style={{ marginTop: 10 }}>
            <span className="pill score">Tier {price.tierLabel} × {price.tierMultiplier}</span>
            <span>
              <strong>MAO (ceiling): {money(price.mao)}</strong>
            </span>
            <span>
              <strong>LAO (opener): {money(price.lao)}</strong>
            </span>
            <span className="small muted">Net value after repairs: {money(price.netValue)}</span>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Scorer agent — top 10 sample leads, with the math shown</h3>
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Flags</th>
              <th>Flag pts</th>
              <th>Urgency pts</th>
              <th>Days to sale</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {topTen.map((lead) => (
              <tr key={lead.id}>
                <td>
                  {lead.address}
                  <div className="small muted">{lead.market} · {lead.leadType}</div>
                </td>
                <td className="small">{lead.flags.join(', ')}</td>
                <td>{lead.flagCount * 40}</td>
                <td>{urgencyPoints(lead.saleDate, new Date())}</td>
                <td>{daysUntilSale(lead.saleDate, new Date()) ?? '—'}</td>
                <td>
                  <span className="pill score">{lead.score}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">
          Score = flag count × 40 + sale-urgency points + market points. A property on 2+
          lists is a hotter lead — that's the whole point of the Friday pull's
          cross-referencing.
        </p>
      </div>

      <div className="card">
        <h3>Follow-up drafter — 7-day / 30-day touches (drafts only, never sent)</h3>
        <div className="row" style={{ marginBottom: 10 }}>
          <label className="small">
            Lead{' '}
            <select value={draftLead?.id ?? ''} onChange={(e) => setDraftLeadId(e.target.value)}>
              {topTen.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.address} ({lead.market})
                </option>
              ))}
            </select>
          </label>
          <span className="pill gated">status: draft — needs Dajon's approval</span>
        </div>
        {drafts.map((d) => (
          <div key={d.kind} style={{ marginBottom: 10 }}>
            <strong className="small">
              {d.kind} follow-up · due {d.dueDate} · via {d.channel}
            </strong>
            <pre className="draft">{d.body}</pre>
          </div>
        ))}
        <p className="small muted">
          Every "not now" gets both touches drafted. Drafts disclose the AI and carry the
          STOP line. They enter the approval gate as drafts — see Dashboard → Approvals
          waiting.
        </p>
      </div>

      <div className="card">
        <h3>Dispo agent — match a deal to buy boxes</h3>
        <div className="row" style={{ marginBottom: 10 }}>
          <label className="small">
            Market/city{' '}
            <input value={dealMarket} onChange={(e) => setDealMarket(e.target.value)} size={12} />
          </label>
          <label className="small">
            Type{' '}
            <select value={dealType} onChange={(e) => setDealType(e.target.value)}>
              <option value="single-family">single-family</option>
              <option value="duplex">duplex</option>
              <option value="multifamily">multifamily</option>
              <option value="mobile-home">mobile-home</option>
              <option value="land">land</option>
              <option value="commercial">commercial</option>
              <option value="condo">condo</option>
            </select>
          </label>
          <label className="small">
            Asking $ <input value={dealPrice} onChange={(e) => setDealPrice(e.target.value)} size={9} />
          </label>
        </div>
        {matches.length === 0 && (
          <p className="small muted">
            No buy-box matches for those terms. (Seed buy boxes are parsed from ad text —
            most buyers take "any" type in their market; a specific type can narrow it to
            zero until Dajon's vetting calls fill in structured boxes.)
          </p>
        )}
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          {matches.map((m) => (
            <li key={m.buyer.id} style={{ marginBottom: 6 }}>
              <strong>{m.buyer.name}</strong> ({m.buyer.market})
              <span className={`pill ${m.buyer.callReady}`} style={{ marginLeft: 8 }}>
                {m.buyer.callReady}
              </span>
              <div className="muted">{m.reasons.join(' · ')}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Logic test script — run with: npm test  (tsx scripts/test-logic.ts)
// Exercises every Phase 1 logic module with Dajon's standing rules.
// Exits non-zero on the first failed section summary.

import { priceDeal, tierForArv } from '../src/lib/pricer';
import { rankLeads, scoreLead, urgencyPoints } from '../src/lib/scorer';
import { draftFollowUp, draftFollowUpPair } from '../src/lib/followups';
import { matchDealToBuyers } from '../src/lib/dispo';
import { canContact, scrubAgainstDncList } from '../src/lib/dncGate';
import {
  approve,
  createDraft,
  markSent,
  submitForApproval,
} from '../src/lib/approvalGate';
import type { Buyer, Lead } from '../src/lib/types';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// ---------------------------------------------------------------- Pricer
console.log('Pricer (Ginn tiers)');
{
  const p1 = priceDeal(100_000, 20_000); // net 80k, tier 0.70
  check('under $120k tier = 0.70', p1.tierMultiplier === 0.7);
  check('MAO = (100k-20k)*0.70 = 56,000', p1.mao === 56_000, `got ${p1.mao}`);
  check('LAO = MAO*0.70 = 39,200', p1.lao === 39_200, `got ${p1.lao}`);

  const p2 = priceDeal(150_000, 30_000);
  check('$120k-$220k tier = 0.80, MAO 96,000', p2.tierMultiplier === 0.8 && p2.mao === 96_000);

  const p3 = priceDeal(250_000, 0);
  check('$220k-$300k tier = 0.815, MAO 203,750', p3.tierMultiplier === 0.815 && p3.mao === 203_750);

  const p4 = priceDeal(350_000, 50_000);
  check('$300k-$400k tier = 0.829, MAO 248,700', p4.tierMultiplier === 0.829 && p4.mao === 248_700);

  const p5 = priceDeal(500_000, 100_000);
  check('$400k+ tier = 0.849, MAO 339,600 / LAO 237,720',
    p5.tierMultiplier === 0.849 && p5.mao === 339_600 && p5.lao === 237_720);

  check('tier boundaries', tierForArv(119_999).multiplier === 0.7
    && tierForArv(120_000).multiplier === 0.8
    && tierForArv(400_000).multiplier === 0.849);

  let threw = false;
  try { priceDeal(0, 0); } catch { threw = true; }
  check('rejects ARV of 0 (never quote without ARV)', threw);
}

// ---------------------------------------------------------------- Scorer
console.log('Scorer');
const baseLead: Lead = {
  id: 't1', address: '1 Test St, Memphis, TN 38128', city: 'Memphis', state: 'TN',
  zip: '38128', county: 'Shelby County', market: 'Memphis', ownerName: 'Test Owner',
  leadType: 'tax-sale', saleDate: '2026-11-03', saleDateRaw: '2026-11-03',
  source: 'test', verificationStatus: 'UNVERIFIED', flags: ['tax'],
  flagCount: 1, stage: 'New Lead', score: 0, notes: '',
};
const now = new Date('2026-10-30T12:00:00');
{
  check('urgency: 4 days out = 30 pts', urgencyPoints('2026-11-03', now) === 30);
  check('urgency: past sale = 0 pts', urgencyPoints('2026-10-01', now) === 0);
  check('urgency: no date = 0 pts', urgencyPoints(null, now) === 0);

  const hot: Lead = { ...baseLead, id: 'hot', flagCount: 3, flags: ['tax', 'lien', 'probate'] };
  const cold: Lead = { ...baseLead, id: 'cold', saleDate: '2027-03-01', saleDateRaw: '2027-03-01' };
  check('multi-flag outranks single-flag', scoreLead(hot, now) > scoreLead(cold, now));
  const ranked = rankLeads([cold, hot], now);
  check('rankLeads sorts hottest first', ranked[0].id === 'hot');
  check('score = 3*40 + 30 + 5 (Memphis) = 155', scoreLead(hot, now) === 155,
    `got ${scoreLead(hot, now)}`);
}

// ---------------------------------------------------------------- Follow-ups
console.log('Follow-up drafter');
{
  const [d7, d30] = draftFollowUpPair(baseLead, '2026-10-30');
  check('7-day draft due in 7 days', d7.dueDate === '2026-11-06', d7.dueDate);
  check('30-day draft due in 30 days', d30.dueDate === '2026-11-29', d30.dueDate);
  check('drafts are draft-only + require approval',
    d7.status === 'draft' && d7.requiresApproval === true && d30.requiresApproval === true);
  check('draft discloses AI + carries STOP line',
    /AI assistant/i.test(d7.body) && /STOP/.test(d7.body));
  const single = draftFollowUp(baseLead, '7-day', '2026-10-30');
  check('single draft includes property address', single.body.includes('1 Test St'));
}

// ---------------------------------------------------------------- Dispo
console.log('Dispo matcher');
const buyer = (over: Partial<Buyer>): Buyer => ({
  id: 'b1', name: 'Test Buyer', market: 'Houston TX', city: 'Houston', state: 'TX',
  phone: '(713) 555-0100', phoneSource: 'website', isBusinessLine: true,
  callReady: 'callable', dncNote: '', notes: '',
  buyBox: { markets: ['Houston'], propertyTypes: ['single-family'], conditions: [],
            maxPrice: 180_000, closeSpeed: '', proofOfFunds: null,
            assignmentsOk: null, summary: '' },
  ...over,
});
{
  const matches = matchDealToBuyers(
    [buyer({}), buyer({ id: 'b2', name: 'Memphis Only',
      buyBox: { markets: ['Memphis'], propertyTypes: ['any'], conditions: [],
                maxPrice: null, closeSpeed: '', proofOfFunds: null,
                assignmentsOk: null, summary: '' } })],
    { market: 'Houston', propertyType: 'single-family', price: 150_000 },
  );
  check('matches in-market under-max buyer only', matches.length === 1 && matches[0].buyer.id === 'b1');
  const tooPricey = matchDealToBuyers([buyer({})],
    { market: 'Houston', propertyType: 'single-family', price: 250_000 });
  check('over box max price does not match', tooPricey.length === 0);
}

// ---------------------------------------------------------------- DNC gate
console.log('DNC gate');
{
  check('seller unchecked = BLOCKED',
    !canContact({ number: 'x', ownerKind: 'seller', isPublishedBusinessLine: false, dncStatus: 'unchecked' }).allowed);
  check('seller registered = BLOCKED',
    !canContact({ number: 'x', ownerKind: 'seller', isPublishedBusinessLine: false, dncStatus: 'registered' }).allowed);
  check('seller clear = allowed',
    canContact({ number: 'x', ownerKind: 'seller', isPublishedBusinessLine: false, dncStatus: 'clear' }).allowed);
  check('published business buyer line = EXEMPT even when unchecked',
    canContact({ number: 'x', ownerKind: 'buyer_business', isPublishedBusinessLine: true, dncStatus: 'unchecked' }).allowed);
  check('individual buyer unchecked = BLOCKED',
    !canContact({ number: 'x', ownerKind: 'buyer_individual', isPublishedBusinessLine: false, dncStatus: 'unchecked' }).allowed);
  check('individual buyer clear = allowed',
    canContact({ number: 'x', ownerKind: 'buyer_individual', isPublishedBusinessLine: false, dncStatus: 'clear' }).allowed);

  const scrubbed = scrubAgainstDncList(
    ['(901) 555-1234', '(317) 555-9999'],
    new Set(['9015551234']),
  );
  check('scrub flags registry hits', scrubbed.get('(901) 555-1234') === 'registered'
    && scrubbed.get('(317) 555-9999') === 'clear');
}

// ---------------------------------------------------------------- Approval gate
console.log('Approval gate');
{
  let plan = createDraft('p1', 'lead-1', 'text', 'Hi, test draft. Reply STOP to end.');
  check('new plan starts as draft', plan.status === 'draft');

  let threw = false;
  try { markSent(plan, '2026-10-30T10:00:00Z'); } catch { threw = true; }
  check('draft can NEVER be marked sent', threw);

  plan = submitForApproval(plan);
  check('draft → pending_approval', plan.status === 'pending_approval');

  threw = false;
  try { markSent(plan, '2026-10-30T10:00:00Z'); } catch { threw = true; }
  check('pending (unapproved) can NEVER be marked sent', threw);

  plan = approve(plan, 'Dajon', '2026-10-30T10:05:00Z');
  check('approval records who/when', plan.status === 'approved'
    && plan.approvedBy === 'Dajon' && plan.approvedAt === '2026-10-30T10:05:00Z');

  plan = markSent(plan, '2026-10-30T10:10:00Z');
  check('approved → sent records the manual send', plan.status === 'sent' && !!plan.sentAt);

  check('draft body unchanged through lifecycle', eq(plan.body, 'Hi, test draft. Reply STOP to end.'));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('ALL LOGIC TESTS PASSED');

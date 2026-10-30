// Dispo matcher agent — matches a deal to buyer buy boxes.
//
// A buyer matches when:
//   - the deal's market/city is in the buy box (or the box is open), AND
//   - the deal's property type fits the box ('any' fits everything), AND
//   - the deal price is at/under the box max price (when the box has one).
// Call-ready buyers (published business lines) rank ahead of gated ones.

import type { Buyer } from './types';

export interface DealQuery {
  /** Market label ("Houston") or city ("Pasadena") — matched loosely. */
  market: string;
  propertyType: string;
  price: number;
}

export interface BuyerMatch {
  buyer: Buyer;
  matched: boolean;
  reasons: string[];
}

const norm = (s: string) => s.trim().toLowerCase();

export function matchBuyer(buyer: Buyer, deal: DealQuery): BuyerMatch {
  const reasons: string[] = [];
  const box = buyer.buyBox;

  // Buy-box markets are authoritative. (An earlier draft also matched
  // on the buyer's own city, which let a Memphis-box buyer match a
  // Houston deal — caught by scripts/test-logic.ts, removed.)
  // Matching is loose about suffixes: "Houston" matches "Houston TX".
  const marketOk =
    box.markets.length === 0 ||
    box.markets.some((m) => {
      const bm = norm(m);
      const dm = norm(deal.market);
      return bm === dm || dm.startsWith(bm) || bm.startsWith(dm);
    });
  reasons.push(marketOk ? `market: buys in ${deal.market}` : `market: does not list ${deal.market}`);

  const typeOk =
    box.propertyTypes.length === 0 ||
    box.propertyTypes.some((t) => norm(t) === 'any' || norm(t) === norm(deal.propertyType));
  reasons.push(
    typeOk ? `type: takes ${deal.propertyType}` : `type: no ${deal.propertyType} in buy box`,
  );

  const priceOk = box.maxPrice === null || deal.price <= box.maxPrice;
  reasons.push(
    box.maxPrice === null
      ? 'price: no max stated'
      : priceOk
        ? `price: $${deal.price.toLocaleString()} ≤ box max $${box.maxPrice.toLocaleString()}`
        : `price: $${deal.price.toLocaleString()} > box max $${box.maxPrice.toLocaleString()}`,
  );

  return { buyer, matched: marketOk && typeOk && priceOk, reasons };
}

export function matchDealToBuyers(buyers: Buyer[], deal: DealQuery): BuyerMatch[] {
  const rank = (b: Buyer) => (b.callReady === 'callable' ? 0 : b.callReady === 'gated' ? 1 : 2);
  return buyers
    .map((b) => matchBuyer(b, deal))
    .filter((m) => m.matched)
    .sort((a, b) => rank(a.buyer) - rank(b.buyer));
}

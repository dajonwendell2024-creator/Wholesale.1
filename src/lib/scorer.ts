// Scorer agent — ranks leads so the hottest properties surface first.
//
// Score = flag points + sale-urgency points + market points.
//   - Multi-flag: each distress category the property appears on is
//     worth 40 points (a property on 2+ lists is a hotter lead —
//     the Friday pull cross-references categories for exactly this).
//   - Urgency: the closer the sale/auction date, the higher the score.
//     Past sale dates score 0 urgency (the window has closed).
//   - Market: small standing bonus per market (buyer depth / volume).

import type { Lead } from './types';

const MARKET_POINTS: Record<string, number> = {
  Memphis: 5,
  Houston: 5,
  Cleveland: 4,
  Indianapolis: 4,
  'St. Louis': 4,
  Birmingham: 2,
};
const DEFAULT_MARKET_POINTS = 3;

export function daysUntilSale(saleDate: string | null, now: Date): number | null {
  if (!saleDate) return null;
  const sale = new Date(`${saleDate}T12:00:00`);
  if (Number.isNaN(sale.getTime())) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((sale.getTime() - now.getTime()) / msPerDay);
}

export function urgencyPoints(saleDate: string | null, now: Date): number {
  const days = daysUntilSale(saleDate, now);
  if (days === null || days < 0) return 0;
  if (days <= 7) return 30;
  if (days <= 14) return 22;
  if (days <= 30) return 15;
  if (days <= 60) return 8;
  return 3;
}

export function scoreLead(lead: Lead, now: Date = new Date()): number {
  const flagPoints = lead.flagCount * 40;
  const marketPoints = MARKET_POINTS[lead.market] ?? DEFAULT_MARKET_POINTS;
  return flagPoints + urgencyPoints(lead.saleDate, now) + marketPoints;
}

/** Returns a new array, hottest first; ties break on sooner sale date. */
export function rankLeads(leads: Lead[], now: Date = new Date()): Lead[] {
  return leads
    .map((lead) => ({ ...lead, score: scoreLead(lead, now) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const da = daysUntilSale(a.saleDate, now) ?? Number.MAX_SAFE_INTEGER;
      const db = daysUntilSale(b.saleDate, now) ?? Number.MAX_SAFE_INTEGER;
      return da - db;
    });
}

// Pricer agent — Ginn tiered offer math.
//
//   MAO = (ARV − repairs) × tier multiplier
//   LAO = MAO × 0.70        (the lowball opener — always open at LAO)
//
// Tier is selected by ARV:
//   < $120,000          → 0.70
//   $120,000–$220,000   → 0.80
//   $220,000–$300,000   → 0.815
//   $300,000–$400,000   → 0.829
//   $400,000+           → 0.849
//
// Never quote an offer without ARV, repairs, and square footage —
// the UI enforces ARV + repairs before this runs.

export interface PriceResult {
  arv: number;
  repairs: number;
  netValue: number;
  tierMultiplier: number;
  tierLabel: string;
  /** Maximum Allowable Offer (ceiling). */
  mao: number;
  /** Lowball Allowable Offer (opener) = MAO × 0.70. */
  lao: number;
}

const TIERS: { minArv: number; multiplier: number; label: string }[] = [
  { minArv: 400_000, multiplier: 0.849, label: '$400,000+' },
  { minArv: 300_000, multiplier: 0.829, label: '$300,000–$400,000' },
  { minArv: 220_000, multiplier: 0.815, label: '$220,000–$300,000' },
  { minArv: 120_000, multiplier: 0.8, label: '$120,000–$220,000' },
  { minArv: 0, multiplier: 0.7, label: 'under $120,000' },
];

export function tierForArv(arv: number): { multiplier: number; label: string } {
  for (const tier of TIERS) {
    if (arv >= tier.minArv) return tier;
  }
  const lowest = TIERS[TIERS.length - 1];
  return { multiplier: lowest.multiplier, label: lowest.label };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function priceDeal(arv: number, repairs: number): PriceResult {
  if (!Number.isFinite(arv) || arv <= 0) {
    throw new Error('Pricer requires a positive ARV.');
  }
  if (!Number.isFinite(repairs) || repairs < 0) {
    throw new Error('Pricer requires a non-negative repair estimate.');
  }
  const netValue = arv - repairs;
  const { multiplier, label } = tierForArv(arv);
  const mao = round2(netValue * multiplier);
  const lao = round2(mao * 0.7);
  return {
    arv,
    repairs,
    netValue,
    tierMultiplier: multiplier,
    tierLabel: label,
    mao,
    lao,
  };
}

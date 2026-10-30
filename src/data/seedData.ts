// Seed data access. Phase 1 runs on the bundled seed (generated from
// Dajon's real bucket/buyer files by scripts/generate-seed.py).
// When Supabase is wired, these exports get replaced by queries —
// page components consume the same shapes (src/lib/types.ts).

import seedJson from './seed.json';
import { rankLeads } from '../lib/scorer';
import type { Buyer, Lead } from '../lib/types';

interface SeedFile {
  generatedFrom: Record<string, string>;
  bucketTotals: {
    totalLeads: number;
    perMarket: Record<string, number>;
    perLeadType: Record<string, number>;
  };
  leads: Lead[];
  buyers: Buyer[];
}

const seed = seedJson as unknown as SeedFile;

export const bucketTotals = seed.bucketTotals;
export const generatedFrom = seed.generatedFrom;

/** Sample leads (Best-of-the-Best + St. Louis), scored + ranked. */
export const sampleLeads: Lead[] = rankLeads(seed.leads);

export const buyers: Buyer[] = seed.buyers;

export const markets: string[] = Array.from(new Set(sampleLeads.map((l) => l.market))).sort();

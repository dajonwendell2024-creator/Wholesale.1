// Core domain types for the Wholesale Command Center (Phase 1).
// These mirror the Supabase schema in supabase/migrations/0001_schema.sql.

export const PIPELINE_STAGES = [
  'New Lead',
  'Attempted Contact',
  'Conversation',
  'Offer Made',
  'Under Contract',
  'Nurture/Dead',
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export type DncStatus = 'unchecked' | 'clear' | 'registered';

/**
 * Who a phone number belongs to. This distinction is load-bearing:
 * Dajon's 2026-10-29 rule — the DNC registry covers personal numbers;
 * published business buyer lines are exempt. Seller/homeowner numbers
 * stay fully gated until DNC-clear.
 */
export type PhoneOwnerKind =
  | 'seller' // homeowner / seller lead — FULL DNC gate
  | 'buyer_business' // published business buyer line — exempt (2026-10-29 rule)
  | 'buyer_individual'; // individual buyer advertiser — gated until clear

export interface PhoneRecord {
  number: string;
  ownerKind: PhoneOwnerKind;
  /** True when the number is the business's own published line (ads/site). */
  isPublishedBusinessLine: boolean;
  dncStatus: DncStatus;
  dncCheckedAt?: string | null;
}

export interface Lead {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  /** Market label, e.g. "Memphis", "Houston", "St. Louis". */
  market: string;
  ownerName: string;
  leadType: string;
  /** ISO date (YYYY-MM-DD) when known, else null. */
  saleDate: string | null;
  saleDateRaw: string;
  source: string;
  verificationStatus: string;
  /** Distress categories this property appears on (tax, foreclosure, lien…). */
  flags: string[];
  flagCount: number;
  stage: PipelineStage;
  score: number;
  notes: string;
}

export interface BuyBox {
  markets: string[];
  propertyTypes: string[];
  conditions: string[];
  maxPrice: number | null;
  closeSpeed: string;
  proofOfFunds: boolean | null;
  assignmentsOk: boolean | null;
  summary: string;
}

export type CallReady = 'callable' | 'gated' | 'no-phone';

export interface Buyer {
  id: string;
  name: string;
  market: string;
  city: string;
  state: string;
  phone: string;
  phoneSource: string;
  isBusinessLine: boolean;
  callReady: CallReady;
  dncNote: string;
  notes: string;
  buyBox: BuyBox;
}

export type OutreachChannel = 'text' | 'call' | 'letter';

/**
 * Approval-gate lifecycle. There is deliberately NO state past
 * `approved` that a provider can trigger on its own — `sent` is only
 * ever recorded after Dajon himself sends (Phase 1: manually, e.g.
 * from his TextNow number). See src/lib/approvalGate.ts.
 */
export type OutreachStatus = 'draft' | 'pending_approval' | 'approved' | 'sent';

export interface OutreachPlan {
  id: string;
  leadId: string;
  channel: OutreachChannel;
  body: string;
  status: OutreachStatus;
  scheduledFor: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  sentAt: string | null;
}

export type FollowUpKind = '7-day' | '30-day';

export interface FollowUpDraft {
  leadId: string;
  kind: FollowUpKind;
  dueDate: string;
  channel: OutreachChannel;
  body: string;
  status: 'draft';
  requiresApproval: true;
}

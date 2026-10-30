// DNC gate — decides whether a number may be contacted at all.
//
// Rules (non-negotiable, baked in 2026-10-29):
//  1. Seller / homeowner numbers: BLOCKED until dnc_status = 'clear'.
//     'unchecked' and 'registered' are both blocked. No exceptions.
//  2. Buyer individuals (a person advertising, number may be a
//     personal cell): same full gate as sellers.
//  3. Published business buyer lines: EXEMPT. The DNC registry covers
//     personal numbers; businesses can't register business lines, and
//     a company publishing "call or text us" invites the call
//     (Dajon's 2026-10-29 correction, accepted same day).

import type { PhoneRecord } from './types';

export interface GateResult {
  allowed: boolean;
  reason: string;
}

export function canContact(phone: PhoneRecord): GateResult {
  if (phone.ownerKind === 'buyer_business' && phone.isPublishedBusinessLine) {
    return {
      allowed: true,
      reason: 'Published business buyer line — DNC-exempt per the 2026-10-29 business-line rule.',
    };
  }

  if (phone.dncStatus === 'registered') {
    return { allowed: false, reason: 'Number is on the Do Not Call registry. Do not contact.' };
  }
  if (phone.dncStatus === 'clear') {
    return { allowed: true, reason: 'DNC-checked and clear.' };
  }
  return {
    allowed: false,
    reason:
      phone.ownerKind === 'buyer_business'
        ? 'Business line not verified as published — treat as gated until confirmed or DNC-clear.'
        : 'Not DNC-checked yet. Seller/individual numbers stay blocked until the scrub comes back clear.',
  };
}

export function isBlocked(phone: PhoneRecord): boolean {
  return !canContact(phone).allowed;
}

/**
 * Scrub a list of 10-digit numbers against imported FTC DNC entries
 * (area code + 7-digit). Returns each number's resulting status.
 * Pure function — the FTC files themselves are imported offline
 * (see scripts/import-csv-notes.md).
 */
export function scrubAgainstDncList(
  numbers: string[],
  dncEntries: Set<string>, // keys: "9015551234" (digits only)
): Map<string, 'clear' | 'registered'> {
  const out = new Map<string, 'clear' | 'registered'>();
  for (const raw of numbers) {
    const digits = raw.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    out.set(raw, dncEntries.has(digits) ? 'registered' : 'clear');
  }
  return out;
}

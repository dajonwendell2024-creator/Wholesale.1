// Follow-up drafter agent — writes the 7-day and 30-day follow-up
// touches for leads that said "not now" (cadence locked 2026-10-19).
//
// DRAFT ONLY. This module generates text and returns it with
// status 'draft' + requiresApproval: true. It never sends anything —
// sending does not exist in Phase 1 (see approvalGate.ts). Every
// draft carries the standing rules: AI discloses itself, and every
// text carries a STOP/opt-out line.

import type { FollowUpDraft, FollowUpKind, Lead } from './types';

const CALLBACK_NUMBER = '(209) 336-9237'; // Dajon's TextNow number

function firstName(ownerName: string): string {
  const cleaned = ownerName.replace(/,.*$/, '').trim();
  if (!cleaned || /LLC|INC|LTD|PAR\b/i.test(cleaned)) return 'there';
  const parts = cleaned.split(/\s+/);
  // Bucket data is often "LAST FIRST" or mixed case; a friendly first
  // token is good enough for a draft Dajon edits before approving.
  const candidate = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function draftFollowUp(
  lead: Lead,
  kind: FollowUpKind,
  fromDate: string = new Date().toISOString().slice(0, 10),
): FollowUpDraft {
  const name = firstName(lead.ownerName);
  const days = kind === '7-day' ? 7 : 30;
  const body =
    kind === '7-day'
      ? `Hi ${name}, this is Phoenix, an AI assistant for Dajon — we spoke last week about your property at ${lead.address}. ` +
        `If the timing works better now, Dajon can still make you a fair cash offer with a closing date you pick. ` +
        `Worth a quick chat? Call or text Dajon at ${CALLBACK_NUMBER}. Reply STOP to end.`
      : `Hi ${name}, Phoenix (AI assistant for Dajon) checking back in on ${lead.address}. ` +
        `No pressure at all — if selling is on your mind this month, Dajon buys as-is for cash and handles the paperwork. ` +
        `One call is all it takes: ${CALLBACK_NUMBER}. Reply STOP to end.`;
  return {
    leadId: lead.id,
    kind,
    dueDate: addDays(fromDate, days),
    channel: 'text',
    body,
    status: 'draft',
    requiresApproval: true,
  };
}

/** The standard pair: every "not now" gets both touches drafted. */
export function draftFollowUpPair(
  lead: Lead,
  fromDate?: string,
): [FollowUpDraft, FollowUpDraft] {
  return [draftFollowUp(lead, '7-day', fromDate), draftFollowUp(lead, '30-day', fromDate)];
}

// Outreach approval gate — the hard-coded rule (set 2026-10-25):
//
//   AI/automated texting is acceptable ONLY after Dajon approves
//   WHO gets texted, WHAT the text says, and WHEN it goes —
//   before any send. Never fully auto.
//
// Lifecycle: draft → pending_approval → approved → sent
//
// Phase 1 has NO send function and NO provider integration.
// `markSent` only RECORDS that Dajon himself sent the message
// (e.g. manually from his TextNow number, (209) 336-9237) — the app
// hands him scripts; it does not transmit. Phase 2 (Twilio) may add
// transmission, and even then only from the `approved` state —
// see src/lib/providers/twilio.ts.
//
// AI calling does not exist in this codebase — not as a feature,
// not as a stub, not as a setting. That is architecture, not config.

import type { OutreachPlan, OutreachStatus } from './types';

const TRANSITIONS: Record<OutreachStatus, OutreachStatus[]> = {
  draft: ['pending_approval'],
  pending_approval: ['approved', 'draft'], // approve, or kick back to draft
  approved: ['sent'],
  sent: [],
};

export function canTransition(from: OutreachStatus, to: OutreachStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

function transition(plan: OutreachPlan, to: OutreachStatus): OutreachPlan {
  if (!canTransition(plan.status, to)) {
    throw new Error(`Outreach plan cannot move ${plan.status} → ${to}.`);
  }
  return { ...plan, status: to };
}

/** Agent or human drafts a plan. Always starts as a draft. */
export function createDraft(
  id: string,
  leadId: string,
  channel: OutreachPlan['channel'],
  body: string,
  scheduledFor: string | null = null,
): OutreachPlan {
  return {
    id,
    leadId,
    channel,
    body,
    status: 'draft',
    scheduledFor,
    approvedBy: null,
    approvedAt: null,
    sentAt: null,
  };
}

export function submitForApproval(plan: OutreachPlan): OutreachPlan {
  return transition(plan, 'pending_approval');
}

/** Only Dajon approves. The approver name is recorded on the plan. */
export function approve(plan: OutreachPlan, approver: string, at: string): OutreachPlan {
  const next = transition(plan, 'approved');
  return { ...next, approvedBy: approver, approvedAt: at };
}

export function kickBackToDraft(plan: OutreachPlan): OutreachPlan {
  const next = transition(plan, 'draft');
  return { ...next, approvedBy: null, approvedAt: null };
}

/**
 * Records a send that DAJON performed himself outside the app.
 * Throws unless the plan was approved first — an unapproved plan
 * can never be marked sent. This function transmits nothing.
 */
export function markSent(plan: OutreachPlan, at: string): OutreachPlan {
  if (plan.status !== 'approved' || !plan.approvedBy) {
    throw new Error('Refused: only a plan Dajon approved can be marked sent.');
  }
  const next = transition(plan, 'sent');
  return { ...next, sentAt: at };
}

/** Guard used by any future Phase 2 sender before it may transmit. */
export function assertSendable(plan: OutreachPlan): void {
  if (plan.status !== 'approved' || !plan.approvedBy || !plan.approvedAt) {
    throw new Error(
      'Approval gate: this plan is not approved by Dajon (who/what/when). Transmission refused.',
    );
  }
}

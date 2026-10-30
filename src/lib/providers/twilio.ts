// PHASE 2 STUB — Twilio SMS pipe. NOT CONNECTED.
//
// TODO (Phase 2, funded by Dajon at build completion per the
// 2026-10-29 decision):
//   1. Provision a Twilio number + complete A2P registration.
//   2. Store credentials server-side only (Supabase secrets / host
//      env vars) — never in this repo, never in the browser bundle.
//   3. Transmission may ONLY happen for outreach plans that pass
//      approvalGate.assertSendable() AND phone records that pass
//      dncGate.canContact(). Both checks run server-side.
//   4. Every outbound text carries a STOP/opt-out line; inbound
//      STOP replies must flip the phone record to 'registered'.
//
// Phase 1: every function here throws. There is intentionally no
// way to send a message from this codebase yet.
//
// NOTE: There is no voice/calling module and there never will be —
// AI calling is prohibited by architecture (Dajon's standing rule).

import type { OutreachPlan } from '../types';

export const TWILIO_CONNECTED = false;

export async function sendSmsPhase2(_plan: OutreachPlan, _toNumber: string): Promise<never> {
  throw new Error(
    'Twilio is not connected (Phase 2). In Phase 1, Dajon sends manually from his own number after approving the plan.',
  );
}

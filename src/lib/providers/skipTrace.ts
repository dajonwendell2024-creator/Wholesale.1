// PHASE 2 STUB — paid skip-trace provider slot. NOT CONNECTED.
//
// Today (Phase 1): skip tracing is the free people-search queue —
// Phoenix builds phone-lookup lists and Dajon runs them on his
// phone (TruePeopleSearch etc.); found numbers land as phones with
// dnc_status 'unchecked' and stay gated until scrubbed.
//
// TODO (Phase 2, plugs in when funded):
//   - First candidate: Tracerfy (pay-per-record, ~$0.02 per named
//     hit / ~$0.04 per address-only hit, misses free, credits never
//     expire) — pricing verified 2026-10-25.
//   - Provider results must be written as phone records with
//     dnc_status 'unchecked'. A trace hit is NOT contact permission:
//     the DNC gate still applies before any outreach.

export const SKIP_TRACE_PROVIDER_CONNECTED = false;

export interface TraceRequest {
  ownerName?: string;
  address: string;
  city: string;
  state: string;
}

export async function tracePhase2(_req: TraceRequest): Promise<never> {
  throw new Error(
    'No skip-trace provider connected (Phase 2). Phase 1 uses the free people-search queue.',
  );
}

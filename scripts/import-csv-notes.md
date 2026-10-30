# Full data migration — how it will run against Supabase (later)

Phase 1 runs on `src/data/seed.json` (sample leads + the real buyer
file) so the app builds and demos with zero infrastructure. The full
migration moves every bucket row into Supabase once Dajon's project
exists. Nothing here runs yet — this is the runbook.

## Source files (workspace: goals/virtual-wholesale-leads-bucket/files/)

| File | Rows | Lands in |
|---|---|---|
| `virtual-lead-bucket.csv` | ~1,658 leads | `properties` + `owners` + `leads` |
| `best-of-the-best-top50-2026-10-23.csv` | 142 curated | flags/score refresh on matching `leads` |
| `craigslist-buyers-2026-10-29.csv` | 38 buyers | `buyers` + `buy_boxes` |
| `buyers-call-ready-2026-10-29.csv` | 14 with numbers | `phones` (buyer rows) + DNC notes |
| `virtual-buyer-list.csv` | 6 Marion winners | `buyers` (no contact info — trace queue) |
| Lead Inbox export (artifact `lead-inbox-skip-trace`) | 197 leads + phones + outreach plans | `leads`, `phones`, `outreach_plans`, `follow_ups` |
| FTC DNC downloads (per area code) | ~1.3M per code | `dnc_entries` |

## Migration steps (when the Supabase project is created)

1. **Create the project** (free tier) and apply
   `supabase/migrations/0001_schema.sql`.
2. **Properties + owners + leads** — stream `virtual-lead-bucket.csv`
   with a Node script (papaparse) in batches of 500:
   - Split `property_address` into address/city/state/zip.
   - Upsert `properties` on (address, city, state, zip) — dedupe
     against existing rows AND within the file (same rule the Apex
     importer uses).
   - Insert `owners` for non-empty `owner_name`; link on `leads`.
   - `leads.flags`/`flag_count` come from the same keyword derivation
     as `scripts/generate-seed.py`; rows cross-referenced on 2+
     source categories get the extra flags (multi-flag = hotter).
   - Every row lands `stage = 'New Lead'`, `verification_status`
     exactly as in the file (UNVERIFIED stays UNVERIFIED — county
     confirmation is a separate step, never assumed).
3. **Buyers + buy boxes** — import the Craigslist file, then overlay
   the call-ready sheet by phone digits: `is_business_line`, DNC
   note, callable flag. Buy-box free text parses to
   `property_types`/`conditions` with the keyword tables from
   `generate-seed.py`; Dajon confirms parsed boxes during vetting
   calls (buy box, close speed, proof of funds, assignments) and the
   structured fields get filled in from his call notes.
4. **Lead Inbox export** — export the artifact's leads/phones/plans
   (it stays the ops tool until this migration is verified), map
   phone slots to `phones` rows preserving `dnc_status` exactly —
   `unchecked` stays `unchecked`; nothing is silently cleared.
5. **DNC lists** — load each FTC file (`AREACODE,7DIGITS` per line)
   into `dnc_entries` with `\copy` or batched inserts (~1.3M rows per
   area code is fine). Then run the scrub job:
   `phones.dnc_status = registered` where a digits-match exists in
   `dnc_entries`, else `clear` (only for numbers actually scrubbed —
   record `dnc_checked_at`). Re-download lists at least every 31
   days per FTC rules.
6. **Verify before cutover** — row counts per market vs. the bucket
   file, 20-row spot check per market, pipeline counts = 100% "New
   Lead" for bucket rows, zero phones marked `clear` that were not
   scrubbed. Only then does the app replace the Lead Inbox as the
   system of record.

## Notes

- The Memphis tax-sale enrichment file
  (`memphis-tax-sale-enriched-2026-10-23.csv`, 1,252 parcels) overlaps
  the bucket's Memphis rows — dedupe on parcel/address before import;
  owners are present for 1,247 of 1,252 there.
- Minimum bids are NOT in any free county source — never import tax
  balances as bids.

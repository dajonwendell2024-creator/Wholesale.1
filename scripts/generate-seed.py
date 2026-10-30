#!/usr/bin/env python3
"""
Generate src/data/seed.json from Dajon's real working files.

Sources (paths are relative to the repo root's workspace):
  - craigslist-buyers-2026-10-29.csv     (38-buyer Craigslist harvest)
  - buyers-call-ready-2026-10-29.csv     (14 buyers with numbers + DNC notes)
  - virtual-lead-bucket.csv              (market counts only — 1,600+ rows
                                          are NOT embedded in the app bundle)
  - best-of-the-best-top50-2026-10-23.csv (142 curated leads = sample leads)
  - st-louis-best-of-the-best-2026-10-25.csv (9 St. Louis leads = sample)

Run:  python3 scripts/generate-seed.py
Override the files dir with WCC_SOURCE_DIR if the layout changes.
"""
import csv
import json
import os
import re
import sys
from collections import Counter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SRC = os.path.expanduser(
    "~/workspace/goals/virtual-wholesale-leads-bucket/files"
)
SRC = os.environ.get("WCC_SOURCE_DIR", DEFAULT_SRC)
OUT = os.path.join(REPO, "src", "data", "seed.json")

FLAG_KEYWORDS = [
    "tax", "foreclosure", "sheriff", "trustee", "judgment", "lien",
    "probate", "code violation", "demolition", "fire", "water",
    "lis pendens", "hoa", "auction",
]
TYPE_KEYWORDS = {
    "duplex": "duplex", "2-family": "duplex", "two-family": "duplex",
    "multi": "multifamily", "mobile home": "mobile-home",
    "land": "land", "commercial": "commercial", "condo": "condo",
}
CONDITION_KEYWORDS = [
    "fire", "water damage", "vacant", "inherited", "tenant", "repairs",
    "as-is", "distressed", "probate", "foreclosure",
]


def read_csv(name):
    path = os.path.join(SRC, name)
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def digits(s):
    return re.sub(r"\D", "", s or "")


def parse_address(raw):
    """'3287 Leschallas Dr, Memphis, TN 38128' -> (address, city, state, zip)"""
    parts = [p.strip() for p in (raw or "").split(",")]
    city = parts[-2] if len(parts) >= 3 else ""
    state, zipcode = "", ""
    if parts:
        m = re.match(r"([A-Z]{2})\s*(\d{5})?", parts[-1])
        if m:
            state, zipcode = m.group(1), m.group(2) or ""
    address = ", ".join(parts[:-2]) if len(parts) >= 3 else (raw or "")
    return address, city, state, zipcode


def derive_flags(row):
    hay = " ".join([row.get("lead_type", ""), row.get("notes", ""),
                    row.get("source", "")]).lower()
    flags, seen = [], set()
    for kw in FLAG_KEYWORDS:
        label = kw if kw != "hoa" else "hoa lien"
        if kw in hay and label not in seen:
            flags.append(label)
            seen.add(label)
    return flags or ["foreclosure"]


def derive_lead(row, idx, origin):
    address, city, state, zipcode = parse_address(row.get("property_address", ""))
    m = re.search(r"\d{4}-\d{2}-\d{2}", row.get("sale_auction_date", "") or "")
    flags = derive_flags(row)
    market = (row.get("market") or city or "").strip()
    return {
        "id": f"lead-{origin}-{idx}",
        "address": row.get("property_address", "").strip(),
        "city": city,
        "state": state or (row.get("state", "") or ""),
        "zip": zipcode,
        "county": row.get("county", ""),
        "market": market,
        "ownerName": (row.get("owner_name") or "").strip(),
        "leadType": (row.get("lead_type") or "").strip(),
        "saleDate": m.group(0) if m else None,
        "saleDateRaw": (row.get("sale_auction_date") or "").strip(),
        "source": (row.get("source") or origin).strip(),
        "verificationStatus": (row.get("verification_status") or "UNVERIFIED").strip(),
        "flags": flags,
        "flagCount": len(flags),
        "stage": "New Lead",
        "score": 0,
        "notes": (row.get("notes") or "").strip()[:400],
    }


def split_market(market_field):
    parts = (market_field or "").rsplit(" ", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return market_field or "", ""


def derive_buybox(summary):
    low = (summary or "").lower()
    types = sorted({v for k, v in TYPE_KEYWORDS.items() if k in low})
    conditions = [c for c in CONDITION_KEYWORDS if c in low]
    return {
        "markets": [],  # filled per-buyer below
        "propertyTypes": types if types else ["any"],
        "conditions": conditions,
        "maxPrice": None,
        "closeSpeed": "",
        "proofOfFunds": None,
        "assignmentsOk": None,
        "summary": summary or "",
    }


def main():
    if not os.path.isdir(SRC):
        sys.exit(f"Source dir not found: {SRC}")

    # ---- market summary counts from the full bucket (counts only) ----
    bucket = read_csv("virtual-lead-bucket.csv")
    bucket_leads = [r for r in bucket if r.get("row_type") == "lead"]
    market_counts = Counter((r.get("market") or "?").strip() for r in bucket_leads)
    lead_type_counts = Counter((r.get("lead_type") or "?").strip() for r in bucket_leads)

    # ---- sample leads: Best-of-the-Best + St. Louis ----
    leads = []
    for i, row in enumerate(read_csv("best-of-the-best-top50-2026-10-23.csv")):
        if row.get("row_type") == "lead" and row.get("property_address"):
            leads.append(derive_lead(row, len(leads) + 1, "bob"))
    for row in read_csv("st-louis-best-of-the-best-2026-10-25.csv"):
        if row.get("property_address"):
            leads.append(derive_lead(row, len(leads) + 1, "stl"))

    # ---- buyers: craigslist harvest merged with call-ready sheet ----
    call_ready = {}
    for row in read_csv("buyers-call-ready-2026-10-29.csv"):
        key = digits(row.get("phone", ""))[-10:]
        if key:
            call_ready[key] = row

    buyers, used_cr = [], set()
    for i, row in enumerate(read_csv("craigslist-buyers-2026-10-29.csv")):
        name = (row.get("business_or_contact") or "").strip()
        phone = (row.get("phone") or "").strip()
        key = digits(phone)[-10:]
        cr = call_ready.get(key) if key else None
        if cr:
            used_cr.add(key)
        city, state = split_market(row.get("market", ""))
        is_business = bool(cr and "BUSINESS LINE" in (cr.get("dnc_status", "").upper()))
        if is_business:
            ready = "callable"
        elif cr and "CALLABLE NOW" in (cr.get("notes", "")).upper():
            ready = "callable"
        elif phone:
            ready = "gated"
        else:
            ready = "no-phone"
        box = derive_buybox(row.get("buy_box_summary", ""))
        box["markets"] = [city] if city else []
        buyers.append({
            "id": f"buyer-{i + 1}",
            "name": name if name and name != "(no name in ad)" else f"Unnamed buyer — {city} ad",
            "market": row.get("market", ""),
            "city": city,
            "state": state,
            "phone": phone,
            "phoneSource": (row.get("phone_source") or "none").strip(),
            "isBusinessLine": is_business,
            "callReady": ready,
            "dncNote": (cr.get("dnc_status", "") if cr else "").strip(),
            "notes": ((cr.get("notes", "") if cr else "") or row.get("notes", "")).strip(),
            "buyBox": box,
        })

    # call-ready buyers not present in the craigslist file (safety net)
    for key, cr in call_ready.items():
        if key in used_cr:
            continue
        city, state = split_market(cr.get("market", ""))
        box = derive_buybox(cr.get("notes", ""))
        box["markets"] = [city] if city else []
        buyers.append({
            "id": f"buyer-cr-{len(buyers) + 1}",
            "name": (cr.get("buyer") or "").strip(),
            "market": cr.get("market", ""),
            "city": city,
            "state": state,
            "phone": (cr.get("phone") or "").strip(),
            "phoneSource": "call-ready sheet 2026-10-29",
            "isBusinessLine": "BUSINESS LINE" in (cr.get("dnc_status", "").upper()),
            "callReady": "callable" if "CALLABLE NOW" in (cr.get("notes", "")).upper() else "gated",
            "dncNote": (cr.get("dnc_status") or "").strip(),
            "notes": (cr.get("notes") or "").strip(),
            "buyBox": box,
        })

    seed = {
        "generatedFrom": {
            "buyers": "craigslist-buyers-2026-10-29.csv + buyers-call-ready-2026-10-29.csv",
            "leadSample": "best-of-the-best-top50-2026-10-23.csv + st-louis-best-of-the-best-2026-10-25.csv",
            "marketCounts": "virtual-lead-bucket.csv (counts only; full file is migrated via Supabase — see scripts/import-csv-notes.md)",
        },
        "bucketTotals": {
            "totalLeads": len(bucket_leads),
            "perMarket": dict(market_counts.most_common()),
            "perLeadType": dict(lead_type_counts.most_common()),
        },
        "leads": leads,
        "buyers": buyers,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(seed, f, indent=1, ensure_ascii=False)
    print(f"Wrote {OUT}")
    print(f"  leads (sample): {len(leads)}")
    print(f"  buyers:         {len(buyers)} "
          f"(callable {sum(1 for b in buyers if b['callReady'] == 'callable')}, "
          f"gated {sum(1 for b in buyers if b['callReady'] == 'gated')}, "
          f"no-phone {sum(1 for b in buyers if b['callReady'] == 'no-phone')})")
    print(f"  bucket total:   {len(bucket_leads)} leads across {len(market_counts)} markets")


if __name__ == "__main__":
    main()

"""
RxGuard — openFDA FAERS data collection.

Pulls adverse event reports from the openFDA drug/event endpoint for each
interaction pair, filters for serious events, handles pagination and
rate-limiting, slims records to essential fields, and saves raw JSON to
data/raw/.
"""

import json
import os
import sys
import time

import requests
from tqdm import tqdm

# Allow running as a script from the project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import config


def _build_search(drug_a: str, drug_b: str) -> str:
    """Build an openFDA search string for a drug pair (serious events only)."""
    return (f'patient.drug.openfda.generic_name:"{drug_a}" '
            f'AND patient.drug.openfda.generic_name:"{drug_b}" '
            f'AND serious:1')


def _slim_record(record: dict) -> dict:
    """Strip a raw FAERS record to essential fields before saving."""
    patient = record.get("patient", {}) or {}
    slim_drugs = []
    for d in (patient.get("drug") or []):
        openfda = d.get("openfda", {}) or {}
        slim_drugs.append({
            "medicinalproduct": d.get("medicinalproduct", ""),
            "openfda": {"generic_name": openfda.get("generic_name", [])},
            "drugcharacterization": d.get("drugcharacterization", ""),
        })
    slim_reactions = [
        {"reactionmeddrapt": r.get("reactionmeddrapt", "")}
        for r in (patient.get("reaction") or [])
        if r.get("reactionmeddrapt")
    ]
    return {
        "safetyreportid": record.get("safetyreportid", ""),
        "safetyreportversion": record.get("safetyreportversion", ""),
        "serious": record.get("serious", ""),
        "seriousnessdeath": record.get("seriousnessdeath", ""),
        "seriousnesshospitalization": record.get("seriousnesshospitalization", ""),
        "seriousnesslifethreatening": record.get("seriousnesslifethreatening", ""),
        "patient": {
            "patientsex": patient.get("patientsex"),
            "patientonsetage": patient.get("patientonsetage"),
            "patientonsetageunit": patient.get("patientonsetageunit"),
            "reaction": slim_reactions,
            "drug": slim_drugs,
        },
    }


def _request_with_backoff(url: str, params: dict, max_retries: int = 5) -> requests.Response | None:
    """GET with exponential backoff on 429 / 5xx errors."""
    delay = 1.0
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, params=params, timeout=30)
            if resp.status_code == 200:
                return resp
            if resp.status_code == 404:
                return None
            if resp.status_code in (429, 500, 502, 503):
                time.sleep(delay)
                delay = min(delay * 2, 30)
                continue
            resp.raise_for_status()
        except requests.exceptions.Timeout:
            time.sleep(delay)
            delay = min(delay * 2, 30)
    return None


def fetch_pair_reports(drug_a: str, drug_b: str, max_reports: int = config.REPORTS_PER_PAIR) -> list[dict]:
    """Fetch up to *max_reports* serious FAERS reports mentioning both drugs."""
    results: list[dict] = []
    skip = 0
    search = _build_search(drug_a, drug_b)

    min_delay = 60.0 / config.RATE_LIMIT

    while skip < min(max_reports, config.MAX_SKIP):
        params: dict = {
            "search": search,
            "limit": config.PAGE_LIMIT,
            "skip": skip,
        }
        if config.FDA_API_KEY:
            params["api_key"] = config.FDA_API_KEY

        resp = _request_with_backoff(config.FDA_BASE_URL, params)

        if resp is None:
            break

        payload = resp.json()
        page_results = payload.get("results", [])
        if not page_results:
            break

        results.extend(page_results)
        skip += config.PAGE_LIMIT

        time.sleep(min_delay)

        if len(results) >= max_reports:
            break

    return results[:max_reports]


def save_raw(drug_a: str, drug_b: str, records: list[dict]) -> str:
    """Save raw JSON records for a pair to data/raw/<drug_a>_<drug_b>.json."""
    os.makedirs(config.DATA_RAW_DIR, exist_ok=True)
    path = os.path.join(config.DATA_RAW_DIR, f"{drug_a}_{drug_b}.json")
    with open(path, "w") as f:
        json.dump(records, f)
    return path


def collect_all(pairs: list[tuple[str, str]] | None = None) -> dict[str, int]:
    """
    Pull FAERS data for every interaction pair and save to data/raw/.

    Returns a dict mapping "drug_a+drug_b" → number of reports saved.
    """
    if pairs is None:
        pairs = config.INTERACTION_PAIRS

    summary: dict[str, int] = {}

    for drug_a, drug_b in tqdm(pairs, desc="Collecting FAERS data"):
        pair_key = f"{drug_a}+{drug_b}"

        # Skip if already downloaded
        existing_path = os.path.join(config.DATA_RAW_DIR, f"{drug_a}_{drug_b}.json")
        if os.path.exists(existing_path):
            with open(existing_path) as f:
                existing = json.load(f)
            summary[pair_key] = len(existing)
            tqdm.write(f"  {pair_key}: {len(existing)} reports (cached)")
            continue

        records = fetch_pair_reports(drug_a, drug_b)
        # Slim records before saving
        records = [_slim_record(r) for r in records]
        if records:
            save_raw(drug_a, drug_b, records)
        summary[pair_key] = len(records)
        tqdm.write(f"  {pair_key}: {len(records)} reports")

    total = sum(summary.values())
    print(f"\nTotal reports collected: {total:,}")
    return summary


if __name__ == "__main__":
    collect_all()

"""
RxGuard — openFDA FAERS data collection.

Pulls adverse event reports from the openFDA drug/event endpoint for each
target drug, filters for serious events, handles pagination and rate-limiting,
and saves raw JSON to data/raw/.
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


def _build_search(drug: str) -> str:
    """Build an openFDA search string for a drug (serious events only)."""
    return f'patient.drug.openfda.generic_name:"{drug}" AND serious:1'


def _request_with_backoff(url: str, params: dict, max_retries: int = 5) -> requests.Response | None:
    """GET with exponential backoff on 429 / 5xx errors."""
    delay = 1.0
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, params=params, timeout=30)
            if resp.status_code == 200:
                return resp
            if resp.status_code == 404:
                # No results for this query
                return None
            if resp.status_code in (429, 500, 502, 503):
                time.sleep(delay)
                delay = min(delay * 2, 30)
                continue
            # Other errors — give up
            resp.raise_for_status()
        except requests.exceptions.Timeout:
            time.sleep(delay)
            delay = min(delay * 2, 30)
    return None


def fetch_drug_reports(drug: str, max_reports: int = config.REPORTS_PER_DRUG) -> list[dict]:
    """Fetch up to *max_reports* serious FAERS reports for *drug*."""
    results: list[dict] = []
    skip = 0
    search = _build_search(drug)

    # Minimum delay between requests to stay within rate limit
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

        # Respect rate limit
        time.sleep(min_delay)

        if len(results) >= max_reports:
            break

    return results[:max_reports]


def save_raw(drug: str, records: list[dict]) -> str:
    """Save raw JSON records for a drug to data/raw/<drug>.json."""
    os.makedirs(config.DATA_RAW_DIR, exist_ok=True)
    path = os.path.join(config.DATA_RAW_DIR, f"{drug}.json")
    with open(path, "w") as f:
        json.dump(records, f)
    return path


def collect_all(drugs: list[str] | None = None) -> dict[str, int]:
    """
    Pull FAERS data for every target drug and save to data/raw/.

    Returns a dict mapping drug name → number of reports saved.
    """
    if drugs is None:
        drugs = config.TARGET_DRUGS

    summary: dict[str, int] = {}

    for drug in tqdm(drugs, desc="Collecting FAERS data"):
        # Skip if already downloaded
        existing_path = os.path.join(config.DATA_RAW_DIR, f"{drug}.json")
        if os.path.exists(existing_path):
            with open(existing_path) as f:
                existing = json.load(f)
            summary[drug] = len(existing)
            tqdm.write(f"  {drug}: {len(existing)} reports (cached)")
            continue

        records = fetch_drug_reports(drug)
        if records:
            save_raw(drug, records)
        summary[drug] = len(records)
        tqdm.write(f"  {drug}: {len(records)} reports")

    total = sum(summary.values())
    print(f"\nTotal reports collected: {total:,}")
    return summary


if __name__ == "__main__":
    collect_all()

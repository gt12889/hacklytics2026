"""
RxGuard — DailyMed / FDA Drug Label ingestion.

Fetches drug labels from FDA SPL sources (DailyMed API or openFDA drug label API)
and extracts sections: warnings, drug interactions, contraindications, boxed warnings.
Uses openFDA drug/label for structured JSON; same SPL data as DailyMed.
"""

import json
import os
import re
import sys
import time

import requests
from tqdm import tqdm

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import config

# openFDA drug label API (same SPL data as DailyMed)
FDA_LABEL_BASE = "https://api.fda.gov/drug/label.json"

# DailyMed API (alternative - returns SPL metadata; full text requires XML parsing)
DAILYMED_BASE = "https://dailymed.nlm.nih.gov/dailymed/services/v2"


def _request_with_backoff(url: str, params: dict, max_retries: int = 5) -> requests.Response | None:
    """GET with exponential backoff on 429 / 5xx."""
    delay = 1.0
    for attempt in range(max_retries):
        try:
            resp = requests.get(url, params=params, timeout=60)
            if resp.status_code == 200:
                return resp
            if resp.status_code == 404:
                return None
            if resp.status_code in (429, 500, 502, 503):
                time.sleep(delay)
                delay = min(delay * 2, 30)
                continue
            resp.raise_for_status()
        except requests.exceptions.RequestException:
            time.sleep(delay)
            delay = min(delay * 2, 30)
    return None


def _extract_text_section(obj) -> list[str]:
    """Extract text from label section (can be string or list)."""
    if obj is None:
        return []
    if isinstance(obj, str):
        text = obj.strip()
        return [text] if text else []
    if isinstance(obj, list):
        out = []
        for item in obj:
            if isinstance(item, str) and item.strip():
                out.append(item.strip())
        return out
    return []


def _join_sections(sections: list[str], max_len: int = 8000) -> str:
    """Join section texts, truncating if needed."""
    out = []
    total = 0
    for s in sections:
        if total + len(s) > max_len:
            remainder = max_len - total - 50
            if remainder > 0:
                out.append(s[:remainder] + "...")
            break
        out.append(s)
        total += len(s)
    return "\n\n".join(out)


def fetch_labels_openfda(drug_names: list[str], limit_per_drug: int = 5) -> list[dict]:
    """
    Fetch drug labels from openFDA drug/label API.
    Returns list of label dicts with: drug_name, generic_name, brand_names,
    boxed_warning, warnings, drug_interactions, contraindications, indications, adverse_reactions.
    """
    labels: list[dict] = []
    seen_ids: set[str] = set()

    for drug in tqdm(drug_names, desc="Fetching labels (openFDA)"):
        params = {
            "search": f'openfda.generic_name:"{drug}"',
            "limit": limit_per_drug,
        }
        if config.FDA_API_KEY:
            params["api_key"] = config.FDA_API_KEY

        resp = _request_with_backoff(FDA_LABEL_BASE, params)
        if resp is None:
            continue

        payload = resp.json()
        results = payload.get("results", [])
        if not results:
            # Try brand name search
            params["search"] = f'openfda.brand_name:"{drug}"'
            resp = _request_with_backoff(FDA_LABEL_BASE, params)
            if resp is None:
                continue
            payload = resp.json()
            results = payload.get("results", [])

        for r in results:
            openfda = r.get("openfda", {}) or {}
            generic = openfda.get("generic_name") or []
            brand = openfda.get("brand_name") or []
            if isinstance(generic, str):
                generic = [generic]
            if isinstance(brand, str):
                brand = [brand]

            # Dedupe by first generic name
            g = generic[0] if generic else drug
            key = f"{g}_{r.get('id', '')}"
            if key in seen_ids:
                continue
            seen_ids.add(key)

            boxed = _extract_text_section(r.get("boxed_warning"))
            warnings = _extract_text_section(r.get("warnings_and_precautions") or r.get("warnings"))
            interactions = _extract_text_section(r.get("drug_interactions"))
            contraindications = _extract_text_section(r.get("contraindications"))
            indications = _extract_text_section(r.get("indications_and_usage"))
            adverse = _extract_text_section(r.get("adverse_reactions"))

            labels.append({
                "id": r.get("id", ""),
                "drug_name": drug,
                "generic_name": g,
                "brand_names": brand[:5],
                "boxed_warning": boxed,
                "warnings": warnings,
                "drug_interactions": interactions,
                "contraindications": contraindications,
                "indications": indications,
                "adverse_reactions": adverse,
            })
        time.sleep(60.0 / max(config.RATE_LIMIT, 20))

    return labels


def fetch_labels_dailymed(drug_names: list[str], limit_per_drug: int = 3) -> list[dict]:
    """
    Fetch SPL metadata from DailyMed API.
    DailyMed returns setid/metadata; full label text requires SPL XML parsing.
    We use this for setid lookup; openFDA provides the actual section text.
    Returns minimal records; prefer fetch_labels_openfda for full content.
    """
    labels: list[dict] = []
    for drug in tqdm(drug_names, desc="Fetching metadata (DailyMed)"):
        url = f"{DAILYMED_BASE}/spls.json"
        params = {"drug_name": drug, "pagesize": limit_per_drug}
        resp = _request_with_backoff(url, params)
        if resp is None:
            continue
        payload = resp.json()
        data = payload.get("data", [])
        for item in data:
            setid = item.get("setid", "")
            spl_version = item.get("spl_version", "")
            labels.append({
                "id": setid or f"dailymed_{drug}",
                "drug_name": drug,
                "setid": setid,
                "spl_version": spl_version,
                "source": "dailymed",
            })
        time.sleep(0.5)
    return labels


def fetch_all_labels(drug_names: list[str] | None = None) -> list[dict]:
    """
    Fetch drug labels for TARGET_DRUGS (or provided list).
    Uses openFDA drug/label for structured warnings/interactions/contraindications.
    """
    if drug_names is None:
        drug_names = config.TARGET_DRUGS
    return fetch_labels_openfda(drug_names, limit_per_drug=5)


def save_raw_labels(labels: list[dict], path: str | None = None) -> str:
    """Save raw label records to JSON."""
    if path is None:
        os.makedirs(config.DATA_RAW_DIR, exist_ok=True)
        path = os.path.join(config.DATA_RAW_DIR, "dailymed_labels.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(labels, f, indent=2)
    return path


def load_raw_labels(path: str | None = None) -> list[dict]:
    """Load raw label records from JSON."""
    if path is None:
        path = os.path.join(config.DATA_RAW_DIR, "dailymed_labels.json")
    if not os.path.exists(path):
        return []
    with open(path) as f:
        return json.load(f)


if __name__ == "__main__":
    labels = fetch_all_labels()
    print(f"Fetched {len(labels)} label records")
    if labels:
        p = save_raw_labels(labels)
        print(f"Saved to {p}")
        # Sample
        l0 = labels[0]
        print(f"\nSample: {l0.get('generic_name')}")
        print(f"  boxed: {len(l0.get('boxed_warning', []))} items")
        print(f"  warnings: {len(l0.get('warnings', []))} items")
        print(f"  interactions: {len(l0.get('drug_interactions', []))} items")
        print(f"  contraindications: {len(l0.get('contraindications', []))} items")

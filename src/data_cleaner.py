"""
RxGuard — FAERS data cleaning & deduplication.

Reads raw JSON files from data/raw/, flattens into a single DataFrame,
deduplicates by safetyreportid (keeping latest version), normalises drug
names, handles missing data, and outputs data/processed/faers_cleaned.parquet.
"""

import json
import os
import re
import sys

import pandas as pd
from tqdm import tqdm

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import config

# ── Regex for stripping formulation / strength info from drug names ──────────
_STRENGTH_RE = re.compile(
    r"\s*\d+[\d.,/]*\s*(mg|mcg|ml|g|iu|units?|%|mmol|meq)[\s/]*.*$",
    re.IGNORECASE,
)
_FORMULATION_RE = re.compile(
    r"\s+(tablet|capsule|injection|solution|cream|ointment|gel|patch|"
    r"suspension|syrup|inhaler|spray|drops|suppository|powder|hcl|"
    r"hydrochloride|sodium|potassium|maleate|succinate|tartrate|"
    r"mesylate|besylate|fumarate|extended.release|er|sr|cr|xl|dr|"
    r"oral|intravenous|iv|im|topical).*$",
    re.IGNORECASE,
)


def normalize_drug_name(name: str | None) -> str:
    """Lowercase, strip formulation/strength, return cleaned generic name."""
    if not name or not isinstance(name, str):
        return ""
    name = name.strip().lower()
    name = _STRENGTH_RE.sub("", name)
    name = _FORMULATION_RE.sub("", name)
    return name.strip()


def _extract_drugs(drug_list: list[dict] | None) -> list[dict]:
    """Extract and normalize drug info from a report's patient.drug array."""
    if not drug_list or not isinstance(drug_list, list):
        return []
    out = []
    for d in drug_list:
        # Prefer openfda generic_name, fall back to medicinalproduct
        openfda = d.get("openfda", {}) or {}
        generic_names = openfda.get("generic_name", [])
        generic = generic_names[0] if generic_names else ""
        raw_name = d.get("medicinalproduct", "")
        name = normalize_drug_name(generic or raw_name)

        char_code = str(d.get("drugcharacterization", ""))
        char_map = {"1": "suspect", "2": "concomitant", "3": "interacting"}
        characterization = char_map.get(char_code, char_code)

        out.append({
            "name": name,
            "characterization": characterization,
        })
    return out


def _extract_reactions(reaction_list: list[dict] | None) -> list[str]:
    """Extract MedDRA reaction terms from patient.reaction."""
    if not reaction_list or not isinstance(reaction_list, list):
        return []
    return [
        r.get("reactionmeddrapt", "").strip()
        for r in reaction_list
        if r.get("reactionmeddrapt")
    ]


def _parse_age(record: dict) -> float | None:
    """Convert patient onset age to years (numeric)."""
    age_val = record.get("patient", {}).get("patientonsetage")
    age_unit = record.get("patient", {}).get("patientonsetageunit")
    if age_val is None:
        return None
    try:
        age = float(age_val)
    except (ValueError, TypeError):
        return None
    # Unit codes: 800=decade, 801=year, 802=month, 803=week, 804=day, 805=hour
    unit_map = {
        "800": lambda a: a * 10,
        "801": lambda a: a,
        "802": lambda a: a / 12,
        "803": lambda a: a / 52,
        "804": lambda a: a / 365,
        "805": lambda a: a / 8760,
    }
    converter = unit_map.get(str(age_unit), lambda a: a)
    return round(converter(age), 1)


def _sex_label(code: str | None) -> str:
    sex_map = {"0": "unknown", "1": "male", "2": "female"}
    return sex_map.get(str(code), "unknown")


def flatten_record(record: dict) -> dict:
    """Convert a single raw FAERS JSON record into a flat dict."""
    patient = record.get("patient", {}) or {}
    drugs = _extract_drugs(patient.get("drug"))
    reactions = _extract_reactions(patient.get("reaction"))
    drug_names = [d["name"] for d in drugs if d["name"]]

    return {
        "safetyreportid": record.get("safetyreportid", ""),
        "safetyreportversion": record.get("safetyreportversion", ""),
        "serious": record.get("serious", ""),
        "seriousnessdeath": record.get("seriousnessdeath", ""),
        "seriousnesshospitalization": record.get("seriousnesshospitalization", ""),
        "seriousnesslifethreatening": record.get("seriousnesslifethreatening", ""),
        "patient_age": _parse_age(record),
        "patient_sex": _sex_label(patient.get("patientsex")),
        "drugs": drug_names,
        "drugs_detail": drugs,
        "reactions": reactions,
    }


def load_raw_records() -> list[dict]:
    """Load all raw JSON files from data/raw/."""
    raw_dir = config.DATA_RAW_DIR
    all_records: list[dict] = []
    files = sorted(f for f in os.listdir(raw_dir) if f.endswith(".json"))
    for fname in tqdm(files, desc="Loading raw files"):
        path = os.path.join(raw_dir, fname)
        with open(path) as f:
            records = json.load(f)
        all_records.extend(records)
    print(f"Loaded {len(all_records):,} raw records from {len(files)} files")
    return all_records


def deduplicate(df: pd.DataFrame) -> pd.DataFrame:
    """Deduplicate by safetyreportid, keeping the latest safetyreportversion."""
    before = len(df)
    df["_version_num"] = pd.to_numeric(df["safetyreportversion"], errors="coerce").fillna(0)
    df = df.sort_values("_version_num", ascending=False).drop_duplicates(
        subset=["safetyreportid"], keep="first"
    )
    df = df.drop(columns=["_version_num"])
    after = len(df)
    print(f"Deduplication: {before:,} → {after:,} reports ({before - after:,} duplicates removed)")
    return df.reset_index(drop=True)


def flag_missing(df: pd.DataFrame) -> pd.DataFrame:
    """Add a boolean column flagging records missing critical fields."""
    df["missing_drugs"] = df["drugs"].apply(lambda x: len(x) == 0)
    df["missing_reactions"] = df["reactions"].apply(lambda x: len(x) == 0)
    n_drugs = df["missing_drugs"].sum()
    n_reactions = df["missing_reactions"].sum()
    print(f"Missing data flags: {n_drugs:,} without drug names, {n_reactions:,} without reactions")
    return df


def clean_all() -> pd.DataFrame:
    """Run the full cleaning pipeline: load → flatten → dedup → normalize → save."""
    raw_records = load_raw_records()

    print("Flattening records...")
    flat = [flatten_record(r) for r in tqdm(raw_records, desc="Flattening")]
    df = pd.DataFrame(flat)
    print(f"Flattened DataFrame: {df.shape[0]:,} rows × {df.shape[1]} cols")

    df = deduplicate(df)
    df = flag_missing(df)

    # Save
    os.makedirs(config.DATA_PROCESSED_DIR, exist_ok=True)
    out_path = os.path.join(config.DATA_PROCESSED_DIR, "faers_cleaned.parquet")
    df.to_parquet(out_path, index=False)
    print(f"Saved cleaned data to {out_path}  ({df.shape[0]:,} rows)")
    return df


if __name__ == "__main__":
    clean_all()

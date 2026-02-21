"""
RxGuard — document chunk builder.

Reads the cleaned FAERS parquet, constructs a combined searchable text block
for each report (suitable for embedding), and writes
data/processed/faers_documents.parquet.
"""

import os
import sys

import pandas as pd
from tqdm import tqdm

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import config


def _severity_score(row: pd.Series) -> int:
    """Compute a 0–3 severity score from seriousness flags.

    4 = death, 3 = life-threatening, 2 = hospitalization,
    0 = not serious / unknown.
    """
    if str(row.get("seriousnessdeath")) == "1":
        return 4
    if str(row.get("seriousnesslifethreatening")) == "1":
        return 3
    if str(row.get("seriousnesshospitalization")) == "1":
        return 2
    return 0


def _outcome_label(score: int) -> str:
    return {4: "death", 3: "life-threatening", 2: "hospitalization",
            1: "serious (other)", 0: "unknown"}[score]


def _format_drugs(drugs_detail) -> str:
    """Format drug list with characterization, e.g. 'warfarin (suspect)'."""
    if drugs_detail is None or (hasattr(drugs_detail, '__len__') and len(drugs_detail) == 0):
        return "unknown"
    # Convert numpy array back to list if needed
    if not isinstance(drugs_detail, list):
        drugs_detail = list(drugs_detail)
    parts = []
    for d in drugs_detail:
        name = d.get("name", "unknown") or "unknown"
        char = d.get("characterization", "")
        parts.append(f"{name} ({char})" if char else name)
    return ", ".join(parts)


def build_text(row: pd.Series) -> str:
    """Build a single searchable text chunk from a cleaned FAERS row."""
    parts = []

    # Demographics
    age = row.get("patient_age")
    sex = row.get("patient_sex", "unknown")
    age_str = f"{int(age)}-year-old" if pd.notna(age) else "age unknown"
    parts.append(f"Patient: {age_str} {sex}.")

    # Drugs
    drugs_detail = row.get("drugs_detail")
    parts.append(f"Drugs: {_format_drugs(drugs_detail)}.")

    # Reactions
    reactions = row.get("reactions")
    if reactions is not None and hasattr(reactions, '__len__') and len(reactions) > 0:
        reactions = list(reactions) if not isinstance(reactions, list) else reactions
        parts.append(f"Reactions: {', '.join(reactions)}.")

    # Outcome
    severity = _severity_score(row)
    parts.append(f"Outcome: {_outcome_label(severity)}.")

    return " ".join(parts)


def build_documents(input_path: str | None = None) -> pd.DataFrame:
    """
    Read cleaned parquet, build document chunks, save to
    data/processed/faers_documents.parquet.
    """
    if input_path is None:
        input_path = os.path.join(config.DATA_PROCESSED_DIR, "faers_cleaned.parquet")

    df = pd.read_parquet(input_path)
    print(f"Loaded {len(df):,} cleaned records")

    tqdm.pandas(desc="Building document chunks")

    docs = []
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="Building chunks"):
        text = build_text(row)
        severity = _severity_score(row)
        docs.append({
            "doc_id": row["safetyreportid"],
            "text": text,
            "drugs": list(row.get("drugs", [])),
            "reactions": list(row.get("reactions", [])),
            "serious": str(row.get("serious", "")),
            "severity_score": severity,
            "patient_age": row.get("patient_age"),
            "patient_sex": row.get("patient_sex", "unknown"),
        })

    doc_df = pd.DataFrame(docs)

    # Validate: no empty text
    empty = (doc_df["text"].str.strip() == "").sum()
    if empty:
        print(f"WARNING: {empty} document chunks have empty text")

    out_path = os.path.join(config.DATA_PROCESSED_DIR, "faers_documents.parquet")
    os.makedirs(config.DATA_PROCESSED_DIR, exist_ok=True)
    doc_df.to_parquet(out_path, index=False)
    print(f"Saved {len(doc_df):,} document chunks to {out_path}")

    return doc_df


if __name__ == "__main__":
    build_documents()

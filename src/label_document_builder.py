"""
RxGuard — drug label document chunk builder.

Reads raw DailyMed/openFDA label JSON, extracts chunks from warnings,
drug interactions, contraindications, and boxed warnings. Produces
searchable document chunks for embedding and vector search.
"""

import os
import sys
import re

import pandas as pd
from tqdm import tqdm

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import config
from src.dailymed_ingestion import load_raw_labels


def _sanitize_text(t: str, max_len: int = 4000) -> str:
    """Remove excessive whitespace and truncate."""
    if not t or not isinstance(t, str):
        return ""
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) > max_len:
        t = t[: max_len - 50] + "..."
    return t


def build_label_chunk(
    label: dict,
    section: str,
    content: str,
) -> dict:
    """Build a single document chunk for a label section."""
    generic = label.get("generic_name", label.get("drug_name", "unknown"))
    brand = label.get("brand_names", [])
    brand_str = ", ".join(brand[:3]) if brand else ""
    drugs_str = f"{generic}" + (f" ({brand_str})" if brand_str else "")

    text = f"Drug: {drugs_str}. Section: {section}. {_sanitize_text(content, 3000)}"
    return {
        "doc_id": f"{label.get('id', '')}_{section}",
        "text": text,
        "drugs": [generic] + (brand[:2] if brand else []),
        "section": section,
        "generic_name": generic,
        "source": "drug_label",
    }


def build_label_documents(labels: list[dict] | None = None) -> pd.DataFrame:
    """
    Build document chunks from label records.
    Creates one chunk per non-empty section (boxed_warning, warnings,
    drug_interactions, contraindications).
    """
    if labels is None:
        labels = load_raw_labels()
    if not labels:
        raise FileNotFoundError(
            "No label data. Run dailymed_ingestion.fetch_all_labels() and save_raw_labels() first."
        )

    chunks: list[dict] = []
    seen_ids: set[str] = set()

    section_config = [
        ("boxed_warning", "Boxed Warning"),
        ("warnings", "Warnings and Precautions"),
        ("drug_interactions", "Drug Interactions"),
        ("contraindications", "Contraindications"),
    ]

    for label in tqdm(labels, desc="Building label chunks"):
        generic = label.get("generic_name", label.get("drug_name", "unknown"))

        for field, section_name in section_config:
            items = label.get(field)
            if not items:
                continue
            if isinstance(items, str):
                items = [items]
            for i, content in enumerate(items):
                if not content or not str(content).strip():
                    continue
                chunk = build_label_chunk(label, section_name, str(content))
                cid = chunk["doc_id"]
                if cid in seen_ids:
                    cid = f"{cid}_{i}"
                    chunk["doc_id"] = cid
                seen_ids.add(cid)
                chunks.append(chunk)

    df = pd.DataFrame(chunks)
    if df.empty:
        print("WARNING: No label chunks produced. Check raw label structure.")
        return df

    out_path = os.path.join(config.DATA_PROCESSED_DIR, "label_documents.parquet")
    os.makedirs(config.DATA_PROCESSED_DIR, exist_ok=True)
    df.to_parquet(out_path, index=False)
    print(f"Saved {len(df):,} label chunks to {out_path}")
    return df


if __name__ == "__main__":
    build_label_documents()

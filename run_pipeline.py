#!/usr/bin/env python3
"""
RxGuard — Phase 1 end-to-end pipeline runner.

Usage:
    python run_pipeline.py              # run full pipeline
    python run_pipeline.py --validate   # only validate existing outputs
"""

import argparse
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(__file__))
import config
from src.data_collector import collect_all
from src.data_cleaner import clean_all
from src.document_builder import build_documents


def run_pipeline():
    """Execute the full pipeline: collect → clean → build documents."""
    print("=" * 60)
    print("RxGuard Phase 1 — Data Pipeline")
    print("=" * 60)

    # Step 1: Collect
    print("\n[1/3] Collecting FAERS data from openFDA...")
    summary = collect_all()

    # Step 2: Clean
    print("\n[2/3] Cleaning and deduplicating...")
    cleaned_df = clean_all()

    # Step 3: Build document chunks
    print("\n[3/3] Building document chunks...")
    doc_df = build_documents()

    # Validate
    print("\n" + "=" * 60)
    validate(summary, cleaned_df, doc_df)


def validate(
    collection_summary: dict[str, int] | None = None,
    cleaned_df: pd.DataFrame | None = None,
    doc_df: pd.DataFrame | None = None,
):
    """Print summary stats and spot-check the outputs."""

    # Load from disk if not passed in
    cleaned_path = os.path.join(config.DATA_PROCESSED_DIR, "faers_cleaned.parquet")
    docs_path = os.path.join(config.DATA_PROCESSED_DIR, "faers_documents.parquet")

    if cleaned_df is None and os.path.exists(cleaned_path):
        cleaned_df = pd.read_parquet(cleaned_path)
    if doc_df is None and os.path.exists(docs_path):
        doc_df = pd.read_parquet(docs_path)

    print("VALIDATION REPORT")
    print("=" * 60)

    # --- Collection summary ---
    if collection_summary:
        total = sum(collection_summary.values())
        print(f"\nCollection: {total:,} reports across {len(collection_summary)} drugs")
        top5 = sorted(collection_summary.items(), key=lambda x: -x[1])[:5]
        print("  Top 5 drugs by report count:")
        for drug, count in top5:
            print(f"    {drug}: {count:,}")
    else:
        # Count from raw files
        raw_dir = config.DATA_RAW_DIR
        if os.path.isdir(raw_dir):
            import json
            total = 0
            for f in os.listdir(raw_dir):
                if f.endswith(".json"):
                    with open(os.path.join(raw_dir, f)) as fh:
                        total += len(json.load(fh))
            print(f"\nRaw data: {total:,} records in data/raw/")

    # --- Cleaned data ---
    if cleaned_df is not None:
        print(f"\nCleaned data: {len(cleaned_df):,} rows")
        unique_ids = cleaned_df["safetyreportid"].nunique()
        print(f"  Unique safetyreportid: {unique_ids:,}")
        assert unique_ids == len(cleaned_df), "DEDUP CHECK FAILED: row count != unique IDs"
        print("  Dedup check: PASSED (row count == unique IDs)")

        # Severity distribution
        print("\n  Severity distribution:")
        for col in ["seriousnessdeath", "seriousnesshospitalization",
                     "seriousnesslifethreatening", "seriousnessdisabling", "seriousnessother"]:
            if col in cleaned_df.columns:
                count = (cleaned_df[col].astype(str) == "1").sum()
                print(f"    {col}: {count:,}")

        # Demographics
        print("\n  Demographics:")
        sex_counts = cleaned_df["patient_sex"].value_counts()
        for sex, count in sex_counts.items():
            print(f"    {sex}: {count:,}")
        age_valid = cleaned_df["patient_age"].dropna()
        if len(age_valid) > 0:
            print(f"    Age: mean={age_valid.mean():.1f}, median={age_valid.median():.1f}, "
                  f"range=[{age_valid.min():.0f}, {age_valid.max():.0f}]")

        # Spot-check: warfarin
        warfarin_mask = cleaned_df["drugs"].apply(
            lambda dl: any("warfarin" in str(d) for d in dl) if dl is not None and hasattr(dl, '__iter__') else False
        )
        n_warfarin = warfarin_mask.sum()
        print(f"\n  Spot-check — warfarin reports: {n_warfarin:,}")

    # --- Document chunks ---
    if doc_df is not None:
        print(f"\nDocument chunks: {len(doc_df):,}")
        empty_text = (doc_df["text"].str.strip() == "").sum()
        print(f"  Empty text chunks: {empty_text}")

        # Show a sample
        print("\n  Sample document chunk:")
        sample = doc_df[doc_df["text"].str.contains("warfarin", case=False, na=False)]
        if len(sample) > 0:
            row = sample.iloc[0]
            print(f"    doc_id: {row['doc_id']}")
            print(f"    text: {row['text'][:300]}...")
            print(f"    drugs: {row['drugs']}")
            print(f"    severity_score: {row['severity_score']}")
        else:
            row = doc_df.iloc[0]
            print(f"    doc_id: {row['doc_id']}")
            print(f"    text: {row['text'][:300]}...")

        # Severity score distribution
        print("\n  Severity score distribution:")
        for score, count in doc_df["severity_score"].value_counts().sort_index().items():
            labels = {0: "unknown", 1: "serious-other", 2: "hospitalization",
                      3: "life-threatening", 4: "death"}
            print(f"    {score} ({labels.get(score, '?')}): {count:,}")

    print("\n" + "=" * 60)
    print("Phase 1 pipeline complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RxGuard Phase 1 pipeline")
    parser.add_argument("--validate", action="store_true", help="Only validate existing outputs")
    args = parser.parse_args()

    if args.validate:
        validate()
    else:
        run_pipeline()

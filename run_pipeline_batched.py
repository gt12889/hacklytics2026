#!/usr/bin/env python3
"""
RxGuard — batched FAERS pipeline runner (Option 1 in batches).

Runs the pipeline in stages:
1. By volume: ramps REPORTS_PER_PAIR (e.g. 1000 → 2500 → 5000)
2. By pairs: processes drug pairs in configurable batch sizes

Each stage collects more data, then runs clean → build → embed on the full
data/raw/ dataset (cumulative). Safe to stop and resume — cached pairs are skipped.

Usage:
    python run_pipeline_batched.py                    # default: 10 pairs/batch, 1K→2.5K→5K reports
    python run_pipeline_batched.py --pair-batch 5     # 5 pairs per batch
    python run_pipeline_batched.py --stages 1000 5000 10000   # custom report stages
    python run_pipeline_batched.py --labels           # also run DailyMed label pipeline at end
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

# Default batch settings
DEFAULT_PAIR_BATCH_SIZE = 10
DEFAULT_REPORT_STAGES = [1000, 2500, 5000]


def run_batched_pipeline(
    pair_batch_size: int = DEFAULT_PAIR_BATCH_SIZE,
    report_stages: list[int] | None = None,
    run_labels: bool = False,
) -> None:
    """Execute pipeline in batches: pair batches × report volume stages."""
    if report_stages is None:
        report_stages = DEFAULT_REPORT_STAGES

    all_pairs = config.INTERACTION_PAIRS
    n_pairs = len(all_pairs)
    n_stages = len(report_stages)

    print("=" * 60)
    print("RxGuard — Batched FAERS Pipeline")
    print("=" * 60)
    print(f"Total pairs: {n_pairs}")
    print(f"Pair batch size: {pair_batch_size}")
    print(f"Report stages: {report_stages}")
    print()

    total_summary: dict[str, int] = {}
    final_cleaned_df: pd.DataFrame | None = None
    final_doc_df: pd.DataFrame | None = None

    for stage_idx, reports_per_pair in enumerate(report_stages):
        print("\n" + "=" * 60)
        print(f"STAGE {stage_idx + 1}/{n_stages}: REPORTS_PER_PAIR = {reports_per_pair:,}")
        print("=" * 60)

        # Temporarily override config
        original_limit = config.REPORTS_PER_PAIR
        config.REPORTS_PER_PAIR = reports_per_pair

        # Collect in pair batches
        pair_batches = [
            all_pairs[i : i + pair_batch_size]
            for i in range(0, n_pairs, pair_batch_size)
        ]
        for batch_idx, batch in enumerate(pair_batches):
            print(f"\n  Batch {batch_idx + 1}/{len(pair_batches)} ({len(batch)} pairs)...")
            summary = collect_all(pairs=batch)
            for k, v in summary.items():
                total_summary[k] = v

        config.REPORTS_PER_PAIR = original_limit

        # Run clean → build → embed on full data/raw/
        print(f"\n  Cleaning and deduplicating (all raw data)...")
        cleaned_df = clean_all()

        print(f"\n  Building document chunks...")
        doc_df = build_documents()

        print(f"\n  Embedding and loading into VectorAI DB...")
        from src.vector_store import embed_and_load
        embed_and_load()

        print(f"\n  Stage {stage_idx + 1} complete: {len(cleaned_df):,} reports → {len(doc_df):,} documents")
        final_cleaned_df = cleaned_df
        final_doc_df = doc_df

    # Optional: DailyMed labels
    if run_labels:
        print("\n" + "=" * 60)
        print("Running DailyMed label pipeline...")
        print("=" * 60)
        from run_label_pipeline import run_label_pipeline
        run_label_pipeline()

    # Validation
    from run_pipeline import validate
    print("\n" + "=" * 60)
    validate(total_summary, final_cleaned_df, final_doc_df)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="RxGuard batched FAERS pipeline (pair batches + volume stages)"
    )
    parser.add_argument(
        "--pair-batch",
        type=int,
        default=DEFAULT_PAIR_BATCH_SIZE,
        help=f"Number of drug pairs per collection batch (default: {DEFAULT_PAIR_BATCH_SIZE})",
    )
    parser.add_argument(
        "--stages",
        type=int,
        nargs="+",
        default=DEFAULT_REPORT_STAGES,
        help=f"REPORTS_PER_PAIR stages to ramp through (default: {DEFAULT_REPORT_STAGES})",
    )
    parser.add_argument(
        "--labels",
        action="store_true",
        help="Also run DailyMed label pipeline after FAERS pipeline",
    )
    args = parser.parse_args()

    run_batched_pipeline(
        pair_batch_size=args.pair_batch,
        report_stages=args.stages,
        run_labels=args.labels,
    )

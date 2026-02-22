#!/usr/bin/env python3
"""
RxGuard — DailyMed / drug label pipeline.

1. Fetch drug labels from openFDA drug/label API (FDA SPL data)
2. Build document chunks (warnings, interactions, contraindications)
3. Embed and load into separate vector collection (dailymed_labels)

Usage:
    python run_label_pipeline.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import config

from src.dailymed_ingestion import fetch_all_labels, save_raw_labels, load_raw_labels
from src.label_document_builder import build_label_documents


def run_label_pipeline():
    """Execute label pipeline: fetch → build chunks → embed & load."""
    print("=" * 60)
    print("RxGuard — DailyMed / Drug Label Pipeline")
    print("=" * 60)

    # Step 1: Fetch labels (or load cached)
    raw_path = os.path.join(config.DATA_RAW_DIR, "dailymed_labels.json")
    if os.path.exists(raw_path):
        print("\n[1/3] Loading cached labels...")
        labels = load_raw_labels(raw_path)
        print(f"  Loaded {len(labels)} label records")
    else:
        print("\n[1/3] Fetching drug labels from openFDA...")
        labels = fetch_all_labels()
        save_raw_labels(labels)
        print(f"  Fetched and saved {len(labels)} label records")

    if not labels:
        print("  No labels available. Exiting.")
        return

    # Step 2: Build document chunks
    print("\n[2/3] Building label document chunks...")
    doc_df = build_label_documents(labels)
    if doc_df.empty:
        print("  No chunks produced. Exiting.")
        return

    # Step 3: Embed and load into vector store
    print("\n[3/3] Embedding and loading into VectorAI DB...")
    from src.label_vector_store import embed_and_load_labels
    n = embed_and_load_labels()

    print("\n" + "=" * 60)
    print(f"Label pipeline complete. Loaded {n} label chunks.")
    print("=" * 60)


if __name__ == "__main__":
    run_label_pipeline()

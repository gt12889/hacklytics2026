"""
RxGuard — embedding generation & VectorAI DB ingestion.

Loads document chunks from faers_documents.parquet, generates sentence-transformer
embeddings, and batch-upserts them into Actian VectorAI DB with metadata payloads.
"""

import os
import sys

import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import config

from cortex import CortexClient, DistanceMetric


def load_documents(path: str | None = None) -> pd.DataFrame:
    """Load document chunks from parquet."""
    if path is None:
        path = os.path.join(config.DATA_PROCESSED_DIR, "faers_documents.parquet")
    df = pd.read_parquet(path)
    print(f"Loaded {len(df):,} document chunks from {path}")
    return df


def generate_embeddings(texts: list[str], model_name: str = config.EMBEDDING_MODEL) -> np.ndarray:
    """Generate sentence-transformer embeddings for a list of texts."""
    print(f"Loading embedding model: {model_name}")
    model = SentenceTransformer(model_name)
    print(f"Encoding {len(texts):,} texts...")
    embeddings = model.encode(texts, batch_size=256, show_progress_bar=True)
    print(f"Generated embeddings: shape {embeddings.shape}")
    return embeddings


def _build_payload(row: pd.Series) -> dict:
    """Build a metadata payload dict from a document row."""
    # Safely extract fields with defaults
    drugs = row.get("drugs", [])
    if drugs is None or (hasattr(drugs, '__len__') and len(drugs) == 0):
        drugs = []
    elif not isinstance(drugs, list):
        drugs = list(drugs)

    reactions = row.get("reactions", [])
    if reactions is None or (hasattr(reactions, '__len__') and len(reactions) == 0):
        reactions = []
    elif not isinstance(reactions, list):
        reactions = list(reactions)

    age = row.get("patient_age")
    age_val = float(age) if pd.notna(age) else -1.0

    report_date = row.get("report_date")
    if pd.notna(report_date):
        date_str = str(report_date)[:10]  # ISO date portion
    else:
        date_str = ""

    return {
        "doc_id": str(row.get("doc_id", "")),
        "text": str(row.get("text", "")),
        "drugs": drugs,
        "drugs_str": ", ".join(drugs),  # for text-based filtering
        "reactions": reactions,
        "severity_score": int(row.get("severity_score", 0)),
        "patient_age": age_val,
        "patient_sex": str(row.get("patient_sex", "unknown")),
        "report_date": date_str,
    }


def embed_and_load(docs_path: str | None = None):
    """End-to-end: load docs → embed → create collection → batch upsert."""
    df = load_documents(docs_path)

    # Generate embeddings
    texts = df["text"].tolist()
    embeddings = generate_embeddings(texts)

    # Build payloads
    print("Building metadata payloads...")
    payloads = [_build_payload(row) for _, row in df.iterrows()]

    # Connect to VectorAI DB and ingest
    print(f"\nConnecting to VectorAI DB at {config.VECTORDB_ADDRESS}...")
    with CortexClient(config.VECTORDB_ADDRESS) as client:
        # Health check
        version, uptime = client.health_check()
        print(f"  Server version: {version}, uptime: {uptime}s")

        # Recreate collection
        print(f"  Recreating collection '{config.VECTORDB_COLLECTION}' "
              f"(dim={config.EMBEDDING_DIMENSION}, COSINE)...")
        client.recreate_collection(
            name=config.VECTORDB_COLLECTION,
            dimension=config.EMBEDDING_DIMENSION,
            distance_metric=DistanceMetric.COSINE,
            hnsw_ef_search=config.HNSW_EF_SEARCH,
        )

        # Batch upsert in chunks
        n = len(df)
        batch_size = config.VECTORDB_BATCH_SIZE
        all_ids = list(range(n))
        all_vectors = [emb.tolist() for emb in embeddings]

        print(f"  Upserting {n:,} vectors in batches of {batch_size}...")
        for start in tqdm(range(0, n, batch_size), desc="Batch upsert"):
            end = min(start + batch_size, n)
            client.batch_upsert(
                config.VECTORDB_COLLECTION,
                all_ids[start:end],
                all_vectors[start:end],
                payloads[start:end],
            )

        # Verify
        count = client.count(config.VECTORDB_COLLECTION, exact=True)
        print(f"\n  Collection '{config.VECTORDB_COLLECTION}' now has {count:,} vectors")
        assert count == n, f"Count mismatch: expected {n}, got {count}"
        print("  Ingestion verified: count matches document count.")

    print("\nPhase 2 embedding + ingestion complete.")
    return n


if __name__ == "__main__":
    embed_and_load()

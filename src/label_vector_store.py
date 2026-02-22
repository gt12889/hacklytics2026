"""
RxGuard — drug label embedding and vector store ingestion.

Loads label document chunks from label_documents.parquet, generates embeddings,
and upserts into a separate Actian VectorAI DB collection (dailymed_labels).
"""

import os
import sys
import time

import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import config

from cortex import CortexClient, DistanceMetric


def load_label_documents(path: str | None = None) -> pd.DataFrame:
    """Load label document chunks from parquet."""
    if path is None:
        path = os.path.join(config.DATA_PROCESSED_DIR, "label_documents.parquet")
    if not os.path.exists(path):
        raise FileNotFoundError(f"Label documents not found: {path}. Run label_document_builder first.")
    df = pd.read_parquet(path)
    print(f"Loaded {len(df):,} label document chunks from {path}")
    return df


def generate_embeddings(texts: list[str], model_name: str = config.EMBEDDING_MODEL) -> np.ndarray:
    """Generate sentence-transformer embeddings for texts."""
    print(f"Loading embedding model: {model_name}")
    model = SentenceTransformer(model_name)
    print(f"Encoding {len(texts):,} label texts...")
    embeddings = model.encode(texts, batch_size=256, show_progress_bar=True)
    return embeddings


def _build_payload(row: pd.Series) -> dict:
    """Build metadata payload for a label chunk."""
    drugs = row.get("drugs", [])
    if drugs is None or not isinstance(drugs, list):
        drugs = list(drugs) if drugs is not None else []
    return {
        "doc_id": str(row.get("doc_id", "")),
        "text": str(row.get("text", "")),
        "drugs": drugs,
        "drugs_str": ", ".join(drugs),
        "section": str(row.get("section", "")),
        "generic_name": str(row.get("generic_name", "")),
        "source": "drug_label",
    }


def _upsert_with_retry(client, collection, ids, vectors, payloads, max_retries=3):
    """Batch upsert with retry."""
    delay = 2.0
    for attempt in range(max_retries):
        try:
            client.batch_upsert(collection, ids, vectors, payloads)
            return
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"\n  Batch upsert failed (attempt {attempt+1}): {e}")
                time.sleep(delay)
                delay *= 2
            else:
                print(f"\n  Trying individual upserts...")
                for i in range(len(ids)):
                    try:
                        client.batch_upsert(collection, [ids[i]], [vectors[i]], [payloads[i]])
                    except Exception as inner_e:
                        print(f"  WARNING: Failed id={ids[i]}: {inner_e}")


def embed_and_load_labels(docs_path: str | None = None) -> int:
    """
    Load label docs → embed → create labels collection → batch upsert.
    Uses separate collection VECTORDB_LABELS_COLLECTION.
    """
    df = load_label_documents(docs_path)
    texts = df["text"].tolist()
    embeddings = generate_embeddings(texts)

    payloads = [_build_payload(row) for _, row in df.iterrows()]

    print(f"\nConnecting to VectorAI DB at {config.VECTORDB_ADDRESS}...")
    with CortexClient(config.VECTORDB_ADDRESS) as client:
        version, uptime = client.health_check()
        print(f"  Server version: {version}")

        coll = config.VECTORDB_LABELS_COLLECTION
        print(f"  Recreating collection '{coll}' (dim={config.EMBEDDING_DIMENSION})...")
        client.recreate_collection(
            name=coll,
            dimension=config.EMBEDDING_DIMENSION,
            distance_metric=DistanceMetric.COSINE,
            hnsw_ef_search=config.HNSW_EF_SEARCH,
        )

        n = len(df)
        batch_size = config.VECTORDB_BATCH_SIZE
        all_ids = list(range(n))
        all_vectors = [emb.tolist() for emb in embeddings]

        for start in tqdm(range(0, n, batch_size), desc="Batch upsert labels"):
            end = min(start + batch_size, n)
            _upsert_with_retry(
                client, coll,
                all_ids[start:end], all_vectors[start:end], payloads[start:end],
            )

        count = client.count(coll, exact=True)
        print(f"\n  Collection '{coll}' has {count:,} vectors")
    return n


if __name__ == "__main__":
    embed_and_load_labels()

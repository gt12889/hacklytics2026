"""
RxGuard — semantic search interface for FAERS reports.

Embeds a natural-language query with the same sentence-transformer model used
for ingestion, then searches Actian VectorAI DB with optional metadata filters.
"""

import os
import sys

from sentence_transformers import SentenceTransformer

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import config

from cortex import CortexClient
from cortex.filters import Filter, Field

# Module-level model cache (loaded once per process)
_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(config.EMBEDDING_MODEL)
    return _model


def search_faers(
    query: str,
    top_k: int = 10,
    min_severity: int = 0,
    drug_filter: str | None = None,
) -> list[dict]:
    """
    Semantic search over FAERS reports in VectorAI DB.

    Args:
        query: Natural-language search query.
        top_k: Number of results to return.
        min_severity: Minimum severity_score (0-4) for filtering.
        drug_filter: Optional drug name — results are post-filtered to
                     include only reports mentioning this drug.

    Returns:
        List of dicts with keys: rank, score, doc_id, text, drugs,
        reactions, severity_score, patient_age, patient_sex.
    """
    model = _get_model()
    query_vector = model.encode(query).tolist()

    # Build metadata filter
    f = Filter()
    if min_severity > 0:
        f = f.must(Field("severity_score").gte(min_severity))

    # Over-fetch if drug filtering is needed (post-filter on list field)
    fetch_k = top_k * 3 if drug_filter else top_k

    with CortexClient(config.VECTORDB_ADDRESS) as client:
        results = client.search(
            config.VECTORDB_COLLECTION,
            query=query_vector,
            top_k=fetch_k,
            filter=f if not f.is_empty() else None,
            with_payload=True,
        )

    # Build output
    output = []
    for r in results:
        payload = r.payload or {}
        # Post-filter by drug name if requested
        if drug_filter:
            drugs = payload.get("drugs", [])
            if not any(drug_filter.lower() in d.lower() for d in drugs):
                continue

        output.append({
            "rank": len(output) + 1,
            "score": round(r.score, 4),
            "doc_id": payload.get("doc_id", ""),
            "text": payload.get("text", ""),
            "drugs": payload.get("drugs", []),
            "reactions": payload.get("reactions", []),
            "severity_score": payload.get("severity_score", 0),
            "patient_age": payload.get("patient_age", -1),
            "patient_sex": payload.get("patient_sex", "unknown"),
        })
        if len(output) >= top_k:
            break

    return output


def print_results(results: list[dict]):
    """Pretty-print search results."""
    if not results:
        print("  No results found.")
        return
    for r in results:
        severity_labels = {0: "unknown", 1: "serious-other", 2: "hospitalization",
                           3: "life-threatening", 4: "death"}
        sev = severity_labels.get(r["severity_score"], "?")
        age = r["patient_age"]
        age_str = f"{int(age)}y" if age >= 0 else "age?"
        print(f"\n  [{r['rank']}] score={r['score']:.4f}  severity={sev}  "
              f"{age_str}/{r['patient_sex']}  report={r['doc_id']}")
        print(f"      drugs: {', '.join(r['drugs'][:5])}")
        print(f"      reactions: {', '.join(r['reactions'][:5])}")
        # Truncate text for display
        text = r["text"]
        if len(text) > 200:
            text = text[:200] + "..."
        print(f"      {text}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="RxGuard semantic search")
    parser.add_argument("query", help="Natural language search query")
    parser.add_argument("-k", "--top-k", type=int, default=10, help="Number of results")
    parser.add_argument("-s", "--min-severity", type=int, default=0,
                        help="Minimum severity score (0-4)")
    parser.add_argument("-d", "--drug", type=str, default=None,
                        help="Filter by drug name")
    args = parser.parse_args()

    print(f"Searching: \"{args.query}\"")
    if args.min_severity > 0:
        print(f"  min_severity={args.min_severity}")
    if args.drug:
        print(f"  drug_filter={args.drug}")

    results = search_faers(
        args.query,
        top_k=args.top_k,
        min_severity=args.min_severity,
        drug_filter=args.drug,
    )
    print(f"\n  {len(results)} results:")
    print_results(results)

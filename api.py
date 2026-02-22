"""
RxGuard FastAPI Backend
Bridges the React frontend to the Python search/ranking/LLM pipeline.
"""

import os
import sys
import math
import traceback
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Ensure project root is on sys.path so module imports work
sys.path.insert(0, os.path.dirname(__file__))

from query_processor import QueryProcessor
from search_engines import V1KeywordSearch, V2TFIDFSearch, V3VectorSearch
from results_ranker import ResultsRanker
from response_generator import ResponseGenerator
from sample_data import get_sample_cases
from data_models import FAERSCase

# ── App setup ────────────────────────────────────────────────────────────────

app = FastAPI(title="RxGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global state (loaded once at startup) ────────────────────────────────────

cases: list[FAERSCase] = []
query_processor: Optional[QueryProcessor] = None
v1_search: Optional[V1KeywordSearch] = None
v2_search: Optional[V2TFIDFSearch] = None
v3_search: Optional[V3VectorSearch] = None
ranker: Optional[ResultsRanker] = None
response_gen: Optional[ResponseGenerator] = None
faers_df: Optional[pd.DataFrame] = None


@app.on_event("startup")
def startup():
    global cases, query_processor, v1_search, v2_search, v3_search
    global ranker, response_gen, faers_df

    print("[RxGuard] Initialising components ...")

    # 1. Load cases (sample data — always available)
    cases = get_sample_cases()
    print(f"[RxGuard] Loaded {len(cases)} sample cases")

    # 2. Query processor (loads sentence-transformer model)
    query_processor = QueryProcessor()
    print("[RxGuard] QueryProcessor ready")

    # 3. Search engines
    v1_search = V1KeywordSearch()

    v2_search = V2TFIDFSearch()
    v2_search.fit(cases)
    print("[RxGuard] V2 TF-IDF fitted")

    v3_search = V3VectorSearch(query_processor)
    v3_search.fit(cases)
    print("[RxGuard] V3 Vector Search fitted")

    # 4. Ranker + response generator
    ranker = ResultsRanker()
    response_gen = ResponseGenerator()

    # 5. Try loading FAERS parquet (optional)
    parquet_path = os.path.join(
        os.path.dirname(__file__), "data", "processed", "faers_cleaned.parquet"
    )
    if os.path.exists(parquet_path):
        faers_df = pd.read_parquet(parquet_path)
        print(f"[RxGuard] Loaded FAERS parquet: {len(faers_df)} rows")
    else:
        faers_df = None
        print("[RxGuard] No FAERS parquet found — will derive stats from sample data")

    print("[RxGuard] Startup complete")


# ── Request / Response schemas ───────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str
    engine: str = "v3"  # "v1", "v2", or "v3"


# ── Helpers ──────────────────────────────────────────────────────────────────

OUTCOME_MAP = {
    "death": "Fatal",
    "hospitalization": "Hospitalized",
    "serious": "Life-Threatening",
    "non-serious": "Other",
}

OUTCOME_TYPE_MAP = {
    "death": "death",
    "hospitalization": "hospitalized",
    "serious": "lifethreat",
    "non-serious": "other",
}

# Common reactions associated with drug classes (for when parquet unavailable)
DRUG_REACTIONS = {
    frozenset(["warfarin", "ibuprofen"]): [
        "GI haemorrhage", "INR increased", "Renal failure",
        "Anaemia", "Melena", "Epistaxis",
    ],
    frozenset(["warfarin", "naproxen"]): [
        "GI haemorrhage", "INR increased", "Melena",
        "Haematuria", "Anaemia", "Epistaxis",
    ],
    frozenset(["metformin", "ibuprofen"]): [
        "Acute kidney injury", "Lactic acidosis", "Renal failure",
        "Nausea", "Hyperkalaemia", "Diarrhoea",
    ],
}

AGE_BINS = ["18-30", "31-45", "46-60", "61-70", "71-80", "81+"]
AGE_RANGES = [(18, 30), (31, 45), (46, 60), (61, 70), (71, 80), (81, 150)]


def _aggregate_from_parquet(df: pd.DataFrame, drugs: list[str]) -> dict | None:
    """Aggregate FAERS stats from the full parquet for the given drug pair."""
    if df is None or len(drugs) < 2:
        return None

    # Filter rows containing both drugs
    drug_sets = df["drugs"].apply(
        lambda lst: set(d.lower().strip() for d in lst)
        if isinstance(lst, list) else set()
    )
    mask = drug_sets.apply(
        lambda s: drugs[0].lower() in s and drugs[1].lower() in s
    )
    matched = df.loc[mask]
    if matched.empty:
        return None

    total = len(matched)

    # Outcomes
    deaths = int(matched["seriousnessdeath"].astype(str).eq("1").sum())
    hospitalized = int(matched["seriousnesshospitalization"].astype(str).eq("1").sum())
    life_threat = int(matched["seriousnesslifethreatening"].astype(str).eq("1").sum())

    # Top reactions
    reactions_exploded = matched["reactions"].explode().dropna()
    reactions_exploded = reactions_exploded.str.strip().str.title()
    top_reactions = (
        reactions_exploded.value_counts().head(6)
        .reset_index()
        .rename(columns={"index": "name", "count": "count"})
    )
    top_reactions_list = [
        {"name": row.iloc[0], "count": int(row.iloc[1])}
        for _, row in top_reactions.iterrows()
    ]

    # Sex split
    sex_counts = matched["patient_sex"].str.lower().value_counts()
    total_sex = sex_counts.sum()
    female_pct = round(sex_counts.get("female", 0) / max(total_sex, 1) * 100)
    male_pct = 100 - female_pct

    # Age distribution
    ages = matched["patient_age"].dropna()
    age_dist = []
    for label, (lo, hi) in zip(AGE_BINS, AGE_RANGES):
        count = int(((ages >= lo) & (ages <= hi)).sum())
        age_dist.append({"range": label, "count": count})

    return {
        "totalReports": total,
        "outcomes": {
            "deaths": deaths,
            "hospitalized": hospitalized,
            "lifeThreatening": life_threat,
        },
        "topReactions": top_reactions_list,
        "sexSplit": [
            {"name": "Female", "value": female_pct},
            {"name": "Male", "value": male_pct},
        ],
        "ageDistribution": age_dist,
    }


def _aggregate_from_sample(
    ranked_results: list, drugs: list[str]
) -> dict:
    """Derive approximate FAERS stats from sample cases when parquet is unavailable.

    Only counts cases whose drug list contains ALL extracted drugs (exact match
    on the drug pair), so stats reflect the specific interaction — not
    semantically similar but different drug combos.
    """
    if not ranked_results or len(drugs) < 2:
        return {
            "totalReports": 0,
            "outcomes": {"deaths": 0, "hospitalized": 0, "lifeThreatening": 0},
            "topReactions": [],
            "sexSplit": [{"name": "Female", "value": 50}, {"name": "Male", "value": 50}],
            "ageDistribution": [{"range": r, "count": 0} for r in AGE_BINS],
        }

    # Filter to cases that contain BOTH primary drugs
    drug_a, drug_b = drugs[0].lower(), drugs[1].lower()
    matched = [
        (case, scores) for case, scores in ranked_results
        if drug_a in [d.lower() for d in case.drugs]
        and drug_b in [d.lower() for d in case.drugs]
    ]
    if not matched:
        matched = ranked_results  # fallback if no exact pair match

    # Total reports: sum faers_matches across matched cases
    total = sum(case.faers_matches for case, _ in matched)

    # Outcome breakdown (weight by faers_matches)
    deaths = sum(
        case.faers_matches for case, _ in matched
        if case.outcome_severity == "death"
    )
    hospitalized = sum(
        case.faers_matches for case, _ in matched
        if case.outcome_severity == "hospitalization"
    )
    serious = sum(
        case.faers_matches for case, _ in matched
        if case.outcome_severity == "serious"
    )

    # Top reactions: use drug-specific knowledge or generic
    drug_key = frozenset(d.lower() for d in drugs[:2])
    reaction_names = DRUG_REACTIONS.get(drug_key, [
        "Adverse reaction", "Nausea", "Dizziness",
        "Headache", "Fatigue", "Rash",
    ])
    # Distribute total across reactions with decreasing weight
    top_reactions = []
    for i, name in enumerate(reaction_names[:6]):
        weight = 1.0 / (1.0 + i * 0.4)
        count = max(1, int(total * 0.08 * weight))
        top_reactions.append({"name": name, "count": count})

    # Sex split from matched cases
    females = sum(1 for c, _ in matched if c.sex and c.sex.lower() == "female")
    males = sum(1 for c, _ in matched if c.sex and c.sex.lower() == "male")
    total_sex = max(females + males, 1)
    female_pct = round(females / total_sex * 100)

    # Age distribution from matched cases
    ages = [c.age for c, _ in matched if c.age]
    age_dist = []
    for label, (lo, hi) in zip(AGE_BINS, AGE_RANGES):
        count = sum(1 for a in ages if lo <= a <= hi)
        age_dist.append({"range": label, "count": count})

    return {
        "totalReports": total,
        "outcomes": {
            "deaths": deaths,
            "hospitalized": hospitalized,
            "lifeThreatening": serious,
        },
        "topReactions": top_reactions,
        "sexSplit": [
            {"name": "Female", "value": female_pct},
            {"name": "Male", "value": 100 - female_pct},
        ],
        "ageDistribution": age_dist,
    }


def _build_similar_cases(ranked_results: list, limit: int = 5) -> list[dict]:
    """Convert ranked FAERSCase results into the dashboard's similarCases shape."""
    similar = []
    for i, (case, scores) in enumerate(ranked_results[:limit]):
        similarity = int(round(scores["semantic_similarity"] * 100))
        similar.append({
            "id": i + 1,
            "age": case.age or 0,
            "sex": case.sex.title() if case.sex else "Unknown",
            "drugs": ", ".join(d.title() for d in case.drugs),
            "reactions": case.description[:120],
            "outcome": OUTCOME_MAP.get(case.outcome_severity, case.outcome_severity),
            "similarity": min(similarity, 99),
            "outcomeType": OUTCOME_TYPE_MAP.get(
                case.outcome_severity, "other"
            ),
        })
    return similar


# ── Main endpoint ────────────────────────────────────────────────────────────

@app.post("/api/search")
def search(req: SearchRequest):
    if not query_processor:
        raise HTTPException(status_code=503, detail="Server still starting up")

    try:
        # 1. Process query
        processed = query_processor.process_query(req.query)
        drugs = processed["drugs"]
        context = processed["context"]
        embedding = processed["embedding"]

        # 2. Run selected search engine
        engine = req.engine.lower()
        if engine == "v1":
            results = v1_search.search(drugs, cases)
        elif engine == "v2":
            results = v2_search.search(req.query)
        else:
            results = v3_search.search(embedding)

        # 3. Rank results
        ranked = ranker.rank_results(results, context)

        # 4. Get risk score / level from response generator
        resp = response_gen.format_full_response(
            query=req.query,
            drugs=drugs,
            query_context=context,
            ranked_results=ranked,
            use_llm=True,
        )

        # 5. FAERS aggregation
        faers_stats = _aggregate_from_parquet(faers_df, drugs)
        if faers_stats is None:
            faers_stats = _aggregate_from_sample(ranked, drugs)

        # 6. Build similar cases
        similar_cases = _build_similar_cases(ranked)

        # 7. Determine drug names for header (order by position in query)
        query_lower = req.query.lower()
        ordered_drugs = sorted(drugs, key=lambda d: query_lower.find(d.lower()))
        current_med = ordered_drugs[0].title() if len(ordered_drugs) >= 1 else "Unknown"
        new_rx = ordered_drugs[1].title() if len(ordered_drugs) >= 2 else "Unknown"

        return {
            "query": {
                "currentMed": current_med,
                "newPrescription": new_rx,
                "age": context.get("age") or 0,
                "sex": (context.get("sex") or "Unknown").title(),
                "conditions": ", ".join(context.get("conditions", [])),
            },
            "riskScore": round(resp["risk_score"], 1),
            "riskLevel": resp["risk_level"],
            **faers_stats,
            "similarCases": similar_cases,
            "summary": resp.get("summary", ""),
            "recommendations": resp.get("recommendations", ""),
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "cases_loaded": len(cases),
        "parquet_loaded": faers_df is not None,
    }


if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)

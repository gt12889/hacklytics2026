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

from itertools import combinations

from query_processor import QueryProcessor, DRUG_DICTIONARY
from search_engines import V1KeywordSearch, V2TFIDFSearch, V3VectorSearch
from results_ranker import ResultsRanker
from response_generator import ResponseGenerator
from sample_data import get_sample_cases
from data_models import FAERSCase
from query_logger import QueryLogger
from src.gemini_parser import parse_patient_text
from eval_search import get_relevant_ids, compute_metrics, normalize_drug

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
precomputed_heatmap: Optional[dict] = None
precomputed_retrieval_eval: Optional[dict] = None


def _precompute_heatmap(all_cases: list[FAERSCase]) -> dict:
    """Build a drug co-occurrence heatmap across the entire corpus."""
    sev_map = {"death": 4, "serious": 3, "hospitalization": 2, "non-serious": 0}
    drug_freq: dict[str, int] = {}
    pair_sevs: dict[tuple[str, str], list[int]] = {}

    for case in all_cases:
        normed = list({normalize_drug(d) for d in case.drugs})
        sev = sev_map.get(case.outcome_severity, 0)
        for d in normed:
            drug_freq[d] = drug_freq.get(d, 0) + 1
        for a, b in combinations(sorted(normed), 2):
            pair_sevs.setdefault((a, b), []).append(sev)

    # Keep top 20 drugs by frequency
    top_drugs = sorted(drug_freq, key=drug_freq.get, reverse=True)[:20]
    top_set = set(top_drugs)

    # Filter pairs to only include top-20 drugs
    all_drugs = sorted(top_set & {d for pair in pair_sevs for d in pair})
    n = len(all_drugs)
    drug_idx = {d: i for i, d in enumerate(all_drugs)}
    matrix = [[None] * n for _ in range(n)]

    for (a, b), sevs in pair_sevs.items():
        if a in top_set and b in top_set and a in drug_idx and b in drug_idx:
            val = round(sum(sevs) / len(sevs), 2)
            i, j = drug_idx[a], drug_idx[b]
            matrix[i][j] = val
            matrix[j][i] = val

    return {"drugs": [d.title() for d in all_drugs], "matrix": matrix}


def _precompute_retrieval_eval(all_cases: list[FAERSCase]) -> dict:
    """Run all 20 TEST_QUERIES through all 4 engines and average metrics."""
    from eval_search import TEST_QUERIES

    metric_names = ["P@5", "P@10", "R@5", "R@10", "NDCG@5", "NDCG@10", "MRR"]
    engine_sums = {
        label: {m: 0.0 for m in metric_names}
        for label in ["V1", "V2", "V3", "V3+R"]
    }
    n_queries = len(TEST_QUERIES)

    for tq in TEST_QUERIES:
        processed = query_processor.process_query(tq.query)
        embedding = processed["embedding"]
        context = processed["context"]
        drugs = processed["drugs"]

        relevant_ids = get_relevant_ids(all_cases, tq.expected_pair)
        if not relevant_ids:
            continue

        v1_ids = [c.case_id for c, _ in v1_search.search(drugs, all_cases)]
        v2_ids = [c.case_id for c, _ in v2_search.search(tq.query)]
        v3_results = v3_search.search(embedding)
        v3_ids = [c.case_id for c, _ in v3_results]
        v3r_ids = [c.case_id for c, _ in ranker.rank_results(v3_results, context)]

        for label, ids in [("V1", v1_ids), ("V2", v2_ids), ("V3", v3_ids), ("V3+R", v3r_ids)]:
            metrics = compute_metrics(ids, relevant_ids)
            for m in metric_names:
                engine_sums[label][m] += metrics.get(m, 0.0)

    engines_data = []
    for label in ["V1", "V2", "V3", "V3+R"]:
        avg_metrics = {m: round(engine_sums[label][m] / n_queries, 4) for m in metric_names}
        engines_data.append({"engine": label, "metrics": avg_metrics})

    return {"queryCount": n_queries, "engines": engines_data}
query_logger: Optional[QueryLogger] = None


@app.on_event("startup")
def startup():
    global cases, query_processor, v1_search, v2_search, v3_search
    global ranker, response_gen, faers_df
    global precomputed_heatmap, precomputed_retrieval_eval
    global ranker, response_gen, faers_df, query_logger

    print("[RxGuard] Initialising components ...")

    # 1. Load cases — prefer eval corpus (richer) over sample data
    try:
        from eval_search import build_eval_corpus
        cases = build_eval_corpus()
        print(f"[RxGuard] Loaded {len(cases)} eval corpus cases")
    except Exception:
        cases = get_sample_cases()
        print(f"[RxGuard] Loaded {len(cases)} sample cases (eval corpus unavailable)")

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

    # 4b. Query logger
    query_logger = QueryLogger()
    print("[RxGuard] QueryLogger ready")

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

    # 6. Precompute dataset-level analyses
    precomputed_heatmap = _precompute_heatmap(cases)
    print(f"[RxGuard] Precomputed heatmap: {len(precomputed_heatmap['drugs'])} drugs")
    precomputed_retrieval_eval = _precompute_retrieval_eval(cases)
    print(f"[RxGuard] Precomputed retrieval eval: {precomputed_retrieval_eval['queryCount']} queries")

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

    Scans the full corpus (not just ranked results) for cases containing BOTH
    drugs, so stats reflect the specific interaction accurately.
    """
    if not ranked_results or len(drugs) < 2:
        return {
            "totalReports": 0,
            "outcomes": {"deaths": 0, "hospitalized": 0, "lifeThreatening": 0},
            "topReactions": [],
            "sexSplit": [{"name": "Female", "value": 50}, {"name": "Male", "value": 50}],
            "ageDistribution": [{"range": r, "count": 0} for r in AGE_BINS],
        }

    # Filter the FULL corpus to cases that contain BOTH primary drugs
    drug_a = normalize_drug(drugs[0])
    drug_b = normalize_drug(drugs[1])
    matched = [
        (case, {}) for case in cases
        if drug_a in [normalize_drug(d) for d in case.drugs]
        and drug_b in [normalize_drug(d) for d in case.drugs]
    ]

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
    top_reactions = []
    if total > 0:
        drug_key = frozenset(normalize_drug(d) for d in drugs[:2])
        reaction_names = DRUG_REACTIONS.get(drug_key, [
            "Adverse reaction", "Nausea", "Dizziness",
            "Headache", "Fatigue", "Rash",
        ])
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


SEVERITY_LABELS = {4: "death", 3: "life-threatening", 2: "hospitalization", 0: "other"}
SEVERITY_ORDER = ["death", "life-threatening", "hospitalization", "other"]
DEMO_AGE_BINS = [0, 30, 50, 65, 80, 200]
DEMO_AGE_LABELS = ["0-30", "31-50", "51-65", "66-80", "80+"]


def _compute_severity_score(df: pd.DataFrame) -> pd.DataFrame:
    """Add severity_score column (mirrors sphinx_eda.compute_severity)."""
    df = df.copy()
    df["severity_score"] = 0
    df.loc[df["seriousnesshospitalization"].astype(str) == "1", "severity_score"] = 2
    df.loc[df["seriousnesslifethreatening"].astype(str) == "1", "severity_score"] = 3
    df.loc[df["seriousnessdeath"].astype(str) == "1", "severity_score"] = 4
    return df


def _filter_to_drug_pair(df: pd.DataFrame, drugs: list[str]) -> pd.DataFrame:
    """Filter DataFrame to rows containing both drugs."""
    drug_sets = df["drugs"].apply(
        lambda lst: set(d.lower().strip() for d in lst)
        if isinstance(lst, list) else set()
    )
    mask = drug_sets.apply(
        lambda s: drugs[0].lower() in s and drugs[1].lower() in s
    )
    return df.loc[mask]


def _sphinx_context(
    df: Optional[pd.DataFrame], drugs: list[str], ranked_results: list
) -> dict:
    """Compute Sphinx EDA context data for the search response.

    Returns a dict with optional keys: severityBreakdown, datasetStats,
    demographicRisk.  Each is omitted when data is unavailable.
    """
    result = {}

    # ── Severity Breakdown ────────────────────────────────────────────────
    if df is not None and len(drugs) >= 2:
        matched = _filter_to_drug_pair(df, drugs)
        if not matched.empty:
            matched = _compute_severity_score(matched)
            sev_counts = matched["severity_score"].map(SEVERITY_LABELS).value_counts()
            result["severityBreakdown"] = [
                {"severity": label, "count": int(sev_counts.get(label, 0))}
                for label in SEVERITY_ORDER
            ]

    # Fallback: derive from full corpus filtered to drug pair
    if "severityBreakdown" not in result and ranked_results:
        outcome_to_sev = {
            "death": "death",
            "serious": "life-threatening",
            "hospitalization": "hospitalization",
            "non-serious": "other",
        }
        # Use full corpus filtered to drug pair with brand→generic normalization
        if len(drugs) >= 2:
            drug_a = normalize_drug(drugs[0])
            drug_b = normalize_drug(drugs[1])
            sev_source = [
                c for c in cases
                if drug_a in [normalize_drug(d) for d in c.drugs]
                and drug_b in [normalize_drug(d) for d in c.drugs]
            ]
        else:
            sev_source = []
        if not sev_source:
            sev_source = []
        if sev_source:
            sev_counts = {}
            for case in sev_source:
                label = outcome_to_sev.get(case.outcome_severity, "other")
                sev_counts[label] = sev_counts.get(label, 0) + case.faers_matches
            result["severityBreakdown"] = [
                {"severity": label, "count": sev_counts.get(label, 0)}
                for label in SEVERITY_ORDER
            ]

    # ── Dataset Stats (parquet only) ──────────────────────────────────────
    if df is not None:
        all_drugs = df["drugs"].explode().dropna().str.lower().str.strip().unique()
        all_rxns = df["reactions"].explode().dropna().str.lower().str.strip().unique()
        result["datasetStats"] = {
            "totalReports": int(len(df)),
            "uniqueDrugs": int(len(all_drugs)),
            "uniqueReactions": int(len(all_rxns)),
        }

    # ── Demographic Risk Profile (parquet only) ───────────────────────────
    if df is not None and len(drugs) >= 2:
        matched = _filter_to_drug_pair(df, drugs)
        matched = matched.dropna(subset=["patient_age"]).copy()
        matched = matched[matched["patient_sex"].isin(["male", "female"])]
        if not matched.empty:
            matched = _compute_severity_score(matched)
            matched["age_group"] = pd.cut(
                matched["patient_age"],
                bins=DEMO_AGE_BINS, labels=DEMO_AGE_LABELS, right=True,
            )
            agg = matched.groupby(
                ["age_group", "patient_sex"], observed=True
            ).agg(
                mean_severity=("severity_score", "mean"),
                count=("severity_score", "size"),
            ).reset_index()
            demo_risk = []
            for ag in DEMO_AGE_LABELS:
                entry = {"ageGroup": ag}
                for sex in ["male", "female"]:
                    row = agg[(agg["age_group"] == ag) & (agg["patient_sex"] == sex)]
                    if not row.empty:
                        entry[sex] = round(float(row["mean_severity"].iloc[0]), 2)
                        entry[f"{sex}Count"] = int(row["count"].iloc[0])
                    else:
                        entry[sex] = 0
                        entry[f"{sex}Count"] = 0
                demo_risk.append(entry)
            result["demographicRisk"] = demo_risk

    # ── Demographic Risk Fallback (from cases when parquet unavailable) ──
    if "demographicRisk" not in result and len(drugs) >= 2:
        sev_map = {"death": 4, "serious": 3, "hospitalization": 2, "non-serious": 0}
        drug_a = normalize_drug(drugs[0])
        drug_b = normalize_drug(drugs[1])
        matched_cases = [
            c for c in cases
            if drug_a in [normalize_drug(d) for d in c.drugs]
            and drug_b in [normalize_drug(d) for d in c.drugs]
        ]
        valid = [c for c in matched_cases if c.age and c.sex]
        if valid:
            demo_risk = []
            for ag, (lo, hi) in zip(DEMO_AGE_LABELS, [(0, 30), (31, 50), (51, 65), (66, 80), (81, 200)]):
                entry = {"ageGroup": ag}
                for sex in ["male", "female"]:
                    group = [c for c in valid if lo <= c.age <= hi and c.sex.lower() == sex]
                    if group:
                        mean_sev = sum(sev_map.get(c.outcome_severity, 0) for c in group) / len(group)
                        entry[sex] = round(mean_sev, 2)
                        entry[f"{sex}Count"] = len(group)
                    else:
                        entry[sex] = 0
                        entry[f"{sex}Count"] = 0
                demo_risk.append(entry)
            result["demographicRisk"] = demo_risk

    # ── Severity by Pair (scoped to drug pair) ───────────────────────────
    if df is not None and len(drugs) >= 2:
        try:
            matched = _filter_to_drug_pair(df, drugs)
            if not matched.empty:
                matched = _compute_severity_score(matched)
                severity_labels = {4: "death", 3: "lifeThreatening", 2: "hospitalization", 0: "other"}
                drug_sets = matched["drugs"].apply(
                    lambda lst: set(d.lower().strip() for d in lst)
                    if isinstance(lst, list) else set()
                )
                # Find all unique drug pairs within the filtered cases
                pair_counts = {}
                for idx_row, dset in drug_sets.items():
                    sev_label = severity_labels.get(matched.at[idx_row, "severity_score"], "other")
                    for a, b in combinations(sorted(dset), 2):
                        key = (a, b)
                        if key not in pair_counts:
                            pair_counts[key] = {"death": 0, "lifeThreatening": 0, "hospitalization": 0, "other": 0}
                        pair_counts[key][sev_label] += 1

                if pair_counts:
                    records = []
                    for (a, b), counts in pair_counts.items():
                        total = sum(counts.values())
                        records.append({
                            "pair": f"{a.title()} + {b.title()}",
                            "death": counts["death"],
                            "lifeThreatening": counts["lifeThreatening"],
                            "hospitalization": counts["hospitalization"],
                            "other": counts["other"],
                            "total": total,
                        })
                    records.sort(key=lambda r: r["total"], reverse=True)
                    result["severityByPair"] = records[:15]
        except Exception as e:
            print(f"[RxGuard] Per-query severityByPair error: {e}")

    # severityByPair fallback from full corpus (scoped to drug pair)
    if "severityByPair" not in result and len(drugs) >= 2:
        try:
            sev_map = {"death": "death", "serious": "lifeThreatening", "hospitalization": "hospitalization", "non-serious": "other"}
            drug_a = normalize_drug(drugs[0])
            drug_b = normalize_drug(drugs[1])
            sbp_cases = [
                c for c in cases
                if drug_a in [normalize_drug(d) for d in c.drugs]
                and drug_b in [normalize_drug(d) for d in c.drugs]
            ]
            pair_counts = {}
            for case in sbp_cases:
                sev_label = sev_map.get(case.outcome_severity, "other")
                dlist = sorted(set(d.lower() for d in case.drugs))
                for a, b in combinations(dlist, 2):
                    key = (a, b)
                    if key not in pair_counts:
                        pair_counts[key] = {"death": 0, "lifeThreatening": 0, "hospitalization": 0, "other": 0}
                    pair_counts[key][sev_label] += case.faers_matches
            if pair_counts:
                records = []
                for (a, b), counts in pair_counts.items():
                    total = sum(counts.values())
                    records.append({
                        "pair": f"{a.title()} + {b.title()}",
                        "death": counts["death"],
                        "lifeThreatening": counts["lifeThreatening"],
                        "hospitalization": counts["hospitalization"],
                        "other": counts["other"],
                        "total": total,
                    })
                records.sort(key=lambda r: r["total"], reverse=True)
                result["severityByPair"] = records[:15]
        except Exception as e:
            print(f"[RxGuard] severityByPair fallback error: {e}")

    return result


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
            "reactions": case.description,
            "outcome": OUTCOME_MAP.get(case.outcome_severity, case.outcome_severity),
            "similarity": min(similarity, 99),
            "outcomeType": OUTCOME_TYPE_MAP.get(
                case.outcome_severity, "other"
            ),
        })
    return similar


# ── Parse endpoint ──────────────────────────────────────────────────────────

class ParseRequest(BaseModel):
    text: str

@app.post("/api/parse")
def parse(req: ParseRequest):
    """Extract structured patient data from free-text using Gemini."""
    try:
        result = parse_patient_text(req.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Analysis endpoint (precomputed, dataset-level) ───────────────────────────

@app.get("/api/analysis")
def analysis():
    """Return precomputed dataset-level analyses (heatmap + retrieval eval)."""
    return {
        "heatmap": precomputed_heatmap,
        "retrievalEval": precomputed_retrieval_eval,
    }


# ── Main endpoint ────────────────────────────────────────────────────────────

@app.post("/api/search")
def search(req: SearchRequest):
    if not query_processor:
        raise HTTPException(status_code=503, detail="Server still starting up")

    # Initialize logger for this run
    logger = query_logger
    logger.start_run(req.query)

    try:
        # 1. Process query with timing
        with logger.time_stage("query_processing"):
            processed = query_processor.process_query(req.query)
        logger.log_query_processing(processed)
        
        drugs = processed["drugs"]
        context = processed["context"]
        embedding = processed["embedding"]

        # 2. Run selected search engine with timing
        engine = req.engine.lower()
        with logger.time_stage("search"):
            if engine == "v1":
                results = v1_search.search(drugs, cases)
                actual_engine = "V1"
            elif engine == "v2":
                results = v2_search.search(req.query)
                actual_engine = "V2"
            else:
                results = v3_search.search(embedding)
                actual_engine = "V3"
        
        logger.log_search(actual_engine, results)

        # 3. Rank results with timing
        with logger.time_stage("ranking"):
            ranked = ranker.rank_results(results, context)
        logger.log_ranking(ranked)

        # 4. Get risk score / level from response generator with timing
        with logger.time_stage("response_generation"):
            resp = response_gen.format_full_response(
                query=req.query,
                drugs=drugs,
                query_context=context,
                ranked_results=ranked,
                use_llm=True,
            )
        logger.log_response(resp)

        # 5. FAERS aggregation
        faers_stats = _aggregate_from_parquet(faers_df, drugs)
        if faers_stats is None:
            faers_stats = _aggregate_from_sample(ranked, drugs)

        # 6. Build similar cases
        similar_cases = _build_similar_cases(ranked)

        # 6b. Sphinx EDA context (severity, dataset stats, demographic risk)
        sphinx = _sphinx_context(faers_df, drugs, ranked)

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
            **sphinx,
        }

    except Exception as e:
        # Log error before re-raising
        if logger:
            logger.log_error(
                error_type=type(e).__name__,
                error_message=str(e),
                stage="main_processing"
            )
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Save log file
        if logger:
            log_filepath = logger.save_run()
            if log_filepath:
                print(f"[RxGuard] Query logged to: {log_filepath}")


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "cases_loaded": len(cases),
        "parquet_loaded": faers_df is not None,
    }


@app.get("/api/suggestions")
def suggestions():
    """Return sorted drug names and example queries for type-ahead UI."""
    drugs_sorted = sorted(DRUG_DICTIONARY)

    # Build example queries from the loaded corpus, deduplicated by drug pair
    seen_pairs = set()
    examples = []
    for case in cases:
        if len(case.drugs) < 2:
            continue
        pair = frozenset(d.lower() for d in case.drugs[:2])
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)
        sex_label = "female" if case.sex and case.sex.lower() == "female" else "male"
        sex_short = "F" if sex_label == "female" else "M"
        conditions_str = " and ".join(case.conditions) if case.conditions else "chronic conditions"
        drug1, drug2 = case.drugs[0].title(), case.drugs[1].title()
        examples.append({
            "label": f"{case.age}{sex_short} \u00b7 {drug1} + {drug2}",
            "query": f"{case.age}-year-old {sex_label} with {conditions_str}, currently on {drug1}. Considering adding {drug2}.",
        })
        if len(examples) >= 5:
            break

    return {"drugs": drugs_sorted, "examples": examples}


if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)

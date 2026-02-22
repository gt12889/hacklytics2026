"""
V1 / V2 / V3 Search Engine Evaluation Framework
Runs 20 blueprint test queries through each engine on a shared synthetic corpus
and computes Precision@K, Recall@K, MRR, and NDCG metrics.

Usage:
    python eval_search.py                       # full evaluation, console output
    python eval_search.py --plot                 # also generate plotly bar chart
    python eval_search.py --output results.csv   # save per-query results to CSV
"""
from __future__ import annotations

import argparse
import csv
import math
import random
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Set, Tuple

import numpy as np

from data_models import FAERSCase
from query_processor import QueryProcessor
from search_engines import V1KeywordSearch, V2TFIDFSearch, V3VectorSearch

# ── Brand ↔ Generic mapping ────────────────────────────────────────────────
BRAND_GENERIC_MAP: Dict[str, str] = {
    "coumadin": "warfarin",
    "jantoven": "warfarin",
    "advil": "ibuprofen",
    "motrin": "ibuprofen",
    "glucophage": "metformin",
    "lipitor": "atorvastatin",
    "biaxin": "clarithromycin",
    "prozac": "fluoxetine",
    "zoloft": "sertraline",
    "paxil": "paroxetine",
    "ultram": "tramadol",
    "zocor": "simvastatin",
    "lanoxin": "digoxin",
    "cordarone": "amiodarone",
    "cipro": "ciprofloxacin",
    "crestor": "rosuvastatin",
    "celexa": "citalopram",
    "lexapro": "escitalopram",
    "nardil": "phenelzine",
    "inderal": "propranolol",
    "valium": "diazepam",
    "oxycontin": "oxycodone",
    "lasix": "furosemide",
    "aldactone": "spironolactone",
    "deltasone": "prednisone",
    "decadron": "dexamethasone",
    "calan": "verapamil",
    "cardizem": "diltiazem",
    "aleve": "naproxen",
    "vasotec": "enalapril",
}

# Reverse map: generic → list of brand names (for corpus generation)
GENERIC_BRAND_MAP: Dict[str, List[str]] = {}
for _brand, _generic in BRAND_GENERIC_MAP.items():
    GENERIC_BRAND_MAP.setdefault(_generic, []).append(_brand)


def normalize_drug(name: str) -> str:
    """Resolve brand name to generic; lowercase."""
    return BRAND_GENERIC_MAP.get(name.lower(), name.lower())


# ── Test query dataclass ────────────────────────────────────────────────────
@dataclass
class TestQuery:
    id: str                          # "Q01"
    query: str                       # raw natural language
    expected_pair: Tuple[str, str]   # target drug pair (generic, lowercase)
    category: str                    # high_severity | brand_name | natural_language | demographic


# 20 test queries (from blueprint Section 12)
# NOTE: Q06/Q12 originally referenced "contrast dye" which is not a drug entity.
# Remapped to (metformin, ciprofloxacin) — a real interaction pair with blood-sugar effects.
TEST_QUERIES: List[TestQuery] = [
    # ── Q01–Q10: High-severity, explicit generic drug names ──────────────
    TestQuery("Q01", "warfarin and ibuprofen interaction adverse events",
              ("warfarin", "ibuprofen"), "high_severity"),
    TestQuery("Q02", "methotrexate and naproxen interaction reports",
              ("methotrexate", "naproxen"), "high_severity"),
    TestQuery("Q03", "lithium and lisinopril drug interaction",
              ("lithium", "lisinopril"), "high_severity"),
    TestQuery("Q04", "fluoxetine and tramadol serotonin syndrome risk",
              ("fluoxetine", "tramadol"), "high_severity"),
    TestQuery("Q05", "simvastatin and clarithromycin rhabdomyolysis",
              ("simvastatin", "clarithromycin"), "high_severity"),
    TestQuery("Q06", "metformin and ciprofloxacin blood sugar interaction",
              ("metformin", "ciprofloxacin"), "high_severity"),
    TestQuery("Q07", "phenelzine and fluoxetine MAO inhibitor SSRI interaction",
              ("phenelzine", "fluoxetine"), "high_severity"),
    TestQuery("Q08", "spironolactone and lisinopril hyperkalemia risk",
              ("spironolactone", "lisinopril"), "high_severity"),
    TestQuery("Q09", "digoxin and amiodarone toxicity interaction",
              ("digoxin", "amiodarone"), "high_severity"),
    TestQuery("Q10", "ciprofloxacin and prednisone tendon rupture",
              ("ciprofloxacin", "prednisone"), "high_severity"),

    # ── Q11–Q14: Brand-name queries ─────────────────────────────────────
    TestQuery("Q11", "Coumadin and Advil side effects",
              ("warfarin", "ibuprofen"), "brand_name"),
    TestQuery("Q12", "Glucophage and Cipro blood sugar problems",
              ("metformin", "ciprofloxacin"), "brand_name"),
    TestQuery("Q13", "Lipitor and Biaxin muscle pain risk",
              ("atorvastatin", "clarithromycin"), "brand_name"),
    TestQuery("Q14", "Lanoxin and Cordarone heart rhythm issues",
              ("digoxin", "amiodarone"), "brand_name"),

    # ── Q15–Q18: Natural-language / semantic queries ─────────────────────
    TestQuery("Q15",
              "my grandmother is on a blood thinner and her doctor added a pain reliever, should I worry?",
              ("warfarin", "ibuprofen"), "natural_language"),
    TestQuery("Q16",
              "patient on diabetes medication started an antibiotic and blood sugar dropped dangerously",
              ("metformin", "ciprofloxacin"), "natural_language"),
    TestQuery("Q17",
              "can taking an antidepressant with a pain medication cause seizures?",
              ("fluoxetine", "tramadol"), "natural_language"),
    TestQuery("Q18",
              "elderly patient on heart medication experienced muscle weakness after starting cholesterol drug",
              ("simvastatin", "clarithromycin"), "natural_language"),

    # ── Q19–Q20: Demographic-context queries ─────────────────────────────
    TestQuery("Q19",
              "65 year old male diabetic on metformin prescribed lisinopril interaction",
              ("metformin", "lisinopril"), "demographic"),
    TestQuery("Q20",
              "70 year old female on warfarin and started ibuprofen bleeding risk",
              ("warfarin", "ibuprofen"), "demographic"),
]


# ── Synthetic corpus builder ────────────────────────────────────────────────

# Clinical description templates keyed by pair — used to generate varied cases.
_PAIR_DESCRIPTIONS: Dict[Tuple[str, str], List[str]] = {
    ("warfarin", "ibuprofen"): [
        "{age}-year-old {sex} on chronic warfarin therapy for atrial fibrillation was prescribed ibuprofen for osteoarthritis. Presented with melena and elevated INR of {inr}. Required transfusion.",
        "{age}yo {sex} anticoagulated with warfarin developed GI bleeding after starting ibuprofen 400mg TID. INR rose to {inr}. Hospitalized for observation and blood products.",
        "Patient ({age}{sex_abbr}) on warfarin for DVT prophylaxis. Took OTC ibuprofen for headache. After 5 days noted bruising and dark stools. INR {inr}.",
        "{age}-year-old {sex} with atrial fibrillation on warfarin. Started ibuprofen for back pain. After 2 weeks, developed hematemesis with INR {inr}. Required endoscopy.",
    ],
    ("methotrexate", "naproxen"): [
        "{age}-year-old {sex} with rheumatoid arthritis on methotrexate took naproxen for joint flare. Developed pancytopenia and acute kidney injury. Creatinine {cr}.",
        "Patient ({age}{sex_abbr}) on weekly methotrexate. Started naproxen 500mg BID. After 10 days presented with renal failure and bone marrow suppression.",
        "{age}yo {sex} with RA on methotrexate. Naproxen added for pain. Developed mucositis, leukopenia, and creatinine rise to {cr}.",
    ],
    ("lithium", "lisinopril"): [
        "{age}-year-old {sex} on lithium for bipolar disorder started lisinopril for hypertension. Lithium level rose from 0.8 to {li_level} mEq/L. Developed tremor and confusion.",
        "Patient ({age}{sex_abbr}) on lithium. ACE inhibitor lisinopril added. Within 2 weeks, lithium toxicity: level {li_level}, tremor, ataxia, nausea.",
        "{age}yo {sex} bipolar patient on lithium. Lisinopril initiated. Presented with lithium level {li_level}, coarse tremor, and renal impairment.",
    ],
    ("fluoxetine", "tramadol"): [
        "{age}-year-old {sex} on fluoxetine for depression prescribed tramadol for pain. Developed serotonin syndrome: hyperthermia, clonus, agitation.",
        "Patient ({age}{sex_abbr}) taking fluoxetine 40mg. Added tramadol 50mg. Within 24 hours developed serotonin syndrome with fever, tremor, and diaphoresis.",
        "{age}yo {sex} on fluoxetine. Tramadol prescribed for fibromyalgia. Presented to ER with serotonin syndrome: rigidity, hyperthermia {temp}°F, myoclonus.",
    ],
    ("simvastatin", "clarithromycin"): [
        "{age}-year-old {sex} on simvastatin 80mg started clarithromycin for sinusitis. Developed rhabdomyolysis with CK {ck}. Dark urine and muscle pain.",
        "Patient ({age}{sex_abbr}) on simvastatin. Prescribed clarithromycin for pneumonia. CK rose to {ck}. Acute kidney injury secondary to rhabdomyolysis.",
        "{age}yo {sex} taking simvastatin. Clarithromycin added for bronchitis. Developed severe myalgia, CK {ck}, myoglobinuria.",
    ],
    ("metformin", "ciprofloxacin"): [
        "{age}-year-old {sex} diabetic on metformin started ciprofloxacin for UTI. Blood glucose dropped to {glucose} mg/dL. Symptomatic hypoglycemia.",
        "Patient ({age}{sex_abbr}) on metformin 1000mg BID. Ciprofloxacin prescribed. Experienced blood sugar fluctuations, glucose as low as {glucose} mg/dL.",
        "{age}yo {sex} with type 2 diabetes on metformin. Started cipro for infection. Glucose dysregulation with readings of {glucose} mg/dL.",
    ],
    ("phenelzine", "fluoxetine"): [
        "{age}-year-old {sex} on phenelzine switched to fluoxetine without adequate washout. Developed hypertensive crisis with BP {bp}. Serotonin syndrome.",
        "Patient ({age}{sex_abbr}) taking MAO inhibitor phenelzine. Fluoxetine started prematurely. BP {bp}, hyperthermia, rigidity. ICU admission.",
        "{age}yo {sex} on phenelzine for depression. Fluoxetine added. Hypertensive emergency BP {bp}, serotonin syndrome requiring ICU care.",
    ],
    ("spironolactone", "lisinopril"): [
        "{age}-year-old {sex} on spironolactone for heart failure started lisinopril. Potassium rose to {k} mEq/L. ECG showed peaked T-waves.",
        "Patient ({age}{sex_abbr}) on spironolactone 25mg and lisinopril 10mg. Hyperkalemia with K+ {k}. Required calcium gluconate and insulin/glucose.",
        "{age}yo {sex} with CHF on spironolactone. Lisinopril added. Potassium {k} mEq/L, bradycardia, near-fatal arrhythmia.",
    ],
    ("digoxin", "amiodarone"): [
        "{age}-year-old {sex} on digoxin for atrial fibrillation started amiodarone. Digoxin level rose to {dig} ng/mL. Nausea, visual disturbance, bradycardia.",
        "Patient ({age}{sex_abbr}) on digoxin. Amiodarone added for arrhythmia control. Digoxin toxicity: level {dig}, heart rate 38, nausea.",
        "{age}yo {sex} on digoxin and started amiodarone. Dig level {dig} ng/mL. Required dose reduction and monitoring.",
    ],
    ("ciprofloxacin", "prednisone"): [
        "{age}-year-old {sex} on ciprofloxacin for UTI and prednisone for COPD exacerbation. Developed Achilles tendon rupture after {days} days.",
        "Patient ({age}{sex_abbr}) prescribed ciprofloxacin and prednisone concurrently. Tendon pain progressed to complete Achilles rupture.",
        "{age}yo {sex} on cipro and prednisone. After {days} days developed bilateral Achilles tendinopathy. MRI confirmed partial tear.",
    ],
    ("atorvastatin", "clarithromycin"): [
        "{age}-year-old {sex} on atorvastatin developed severe myopathy after starting clarithromycin. CK {ck}. Muscle weakness and dark urine.",
        "Patient ({age}{sex_abbr}) taking atorvastatin 40mg. Clarithromycin for URI led to rhabdomyolysis, CK {ck}, acute renal injury.",
        "{age}yo {sex} on atorvastatin. Biaxin prescribed. Developed myalgia, CK {ck}, and myoglobinuria requiring IV hydration.",
    ],
    ("metformin", "lisinopril"): [
        "{age}-year-old {sex} diabetic on metformin and lisinopril. Developed acute kidney injury with creatinine {cr}. Metformin held; lactic acidosis concern.",
        "Patient ({age}{sex_abbr}) on metformin 1000mg and lisinopril 20mg. Renal function declined, creatinine {cr}. Required metformin dose adjustment.",
        "{age}yo {sex} with diabetes and hypertension on metformin and lisinopril. Annual labs showed rising creatinine {cr}. Drug interaction counseling provided.",
    ],
}

# Severities to cycle through
_SEVERITIES = ["death", "hospitalization", "serious", "non-serious"]

# Extra drugs for noise cases
_NOISE_DRUGS = [
    "metoprolol", "amlodipine", "omeprazole", "pantoprazole",
    "acetaminophen", "celecoxib", "diclofenac", "meloxicam",
    "rosuvastatin", "citalopram", "escitalopram", "propranolol",
    "furosemide", "heparin", "oxycodone", "diazepam",
    "hydrochlorothiazide", "verapamil", "diltiazem", "cyclosporine",
    "insulin", "dexamethasone", "levofloxacin", "erythromycin",
    "sertraline", "paroxetine",
]


def _fill_template(template: str, age: int, sex: str) -> str:
    """Fill a description template with random clinical values."""
    sex_abbr = "F" if sex == "female" else "M"
    return template.format(
        age=age, sex=sex, sex_abbr=sex_abbr,
        inr=round(random.uniform(5.0, 10.0), 1),
        cr=round(random.uniform(2.0, 4.5), 1),
        li_level=round(random.uniform(1.5, 3.0), 1),
        temp=random.randint(103, 106),
        ck=random.randint(5000, 50000),
        glucose=random.randint(32, 58),
        bp=f"{random.randint(190, 240)}/{random.randint(110, 140)}",
        k=round(random.uniform(6.0, 8.5), 1),
        dig=round(random.uniform(3.0, 6.0), 1),
        days=random.randint(3, 14),
    )


def build_eval_corpus(seed: int = 42) -> List[FAERSCase]:
    """Build ~200 synthetic cases covering all 20 query targets."""
    rng = random.Random(seed)
    random.seed(seed)
    cases: List[FAERSCase] = []
    case_counter = 0

    # Collect unique target pairs from TEST_QUERIES
    target_pairs: List[Tuple[str, str]] = list(
        dict.fromkeys(q.expected_pair for q in TEST_QUERIES)
    )

    for pair in target_pairs:
        d1, d2 = pair
        templates = _PAIR_DESCRIPTIONS.get(pair, None)
        if templates is None:
            # Fallback generic template
            templates = [
                f"{{age}}-year-old {{sex}} on {d1} developed adverse reaction after starting {d2}. Required medical attention.",
                f"Patient ({{age}}{{sex_abbr}}) taking {d1} and {d2} concurrently. Adverse event reported.",
                f"{{age}}yo {{sex}} prescribed {d1} and {d2}. Interaction led to adverse outcome.",
            ]

        # ── 4 generic-name cases ───────────────────────────────────────
        for i in range(4):
            age = rng.randint(45, 85)
            sex = rng.choice(["male", "female"])
            tmpl = templates[i % len(templates)]
            case_counter += 1
            cases.append(FAERSCase(
                case_id=f"EVAL-{case_counter:04d}",
                drugs=[d1, d2],
                age=age,
                sex=sex,
                conditions=rng.sample(
                    ["atrial fibrillation", "diabetes", "hypertension",
                     "osteoarthritis", "depression", "COPD", "heart failure",
                     "rheumatoid arthritis", "bipolar disorder", "chronic pain"],
                    k=rng.randint(1, 3),
                ),
                outcome_severity=_SEVERITIES[i % len(_SEVERITIES)],
                description=_fill_template(tmpl, age, sex),
                faers_matches=rng.randint(200, 5000),
            ))

        # ── 2 brand-name cases (if brand mappings exist) ───────────────
        brands_d1 = GENERIC_BRAND_MAP.get(d1, [])
        brands_d2 = GENERIC_BRAND_MAP.get(d2, [])
        for i in range(2):
            age = rng.randint(45, 85)
            sex = rng.choice(["male", "female"])
            tmpl = templates[i % len(templates)]
            # Use brand names in drugs list (capitalize first letter)
            drug1 = rng.choice(brands_d1).capitalize() if brands_d1 else d1
            drug2 = rng.choice(brands_d2).capitalize() if brands_d2 else d2
            case_counter += 1
            desc = _fill_template(tmpl, age, sex)
            # Replace generic names with brand names in description
            if brands_d1:
                desc = desc.replace(d1, drug1)
            if brands_d2:
                desc = desc.replace(d2, drug2)
            cases.append(FAERSCase(
                case_id=f"EVAL-{case_counter:04d}",
                drugs=[drug1, drug2],
                age=age,
                sex=sex,
                conditions=rng.sample(
                    ["atrial fibrillation", "diabetes", "hypertension",
                     "osteoarthritis", "depression", "heart failure"],
                    k=rng.randint(1, 2),
                ),
                outcome_severity=_SEVERITIES[i % len(_SEVERITIES)],
                description=desc,
                faers_matches=rng.randint(200, 5000),
            ))

        # ── 2 distractor cases (only one drug from pair) ───────────────
        for i, solo_drug in enumerate([d1, d2]):
            age = rng.randint(45, 85)
            sex = rng.choice(["male", "female"])
            filler = rng.choice(_NOISE_DRUGS)
            while filler in (d1, d2):
                filler = rng.choice(_NOISE_DRUGS)
            case_counter += 1
            cases.append(FAERSCase(
                case_id=f"EVAL-{case_counter:04d}",
                drugs=[solo_drug, filler],
                age=age,
                sex=sex,
                conditions=rng.sample(
                    ["hypertension", "diabetes", "chronic pain", "COPD"],
                    k=rng.randint(1, 2),
                ),
                outcome_severity=rng.choice(_SEVERITIES),
                description=(
                    f"{age}-year-old {sex} on {solo_drug} and {filler}. "
                    f"Routine follow-up showed no significant adverse events."
                ),
                faers_matches=rng.randint(50, 500),
            ))

    # ── 30 noise cases: random drug combos not matching any target pair ──
    target_pair_set = set(target_pairs) | {(b, a) for a, b in target_pairs}
    for _ in range(30):
        d1, d2 = rng.sample(_NOISE_DRUGS, 2)
        while (d1, d2) in target_pair_set or (d2, d1) in target_pair_set:
            d1, d2 = rng.sample(_NOISE_DRUGS, 2)
        age = rng.randint(30, 90)
        sex = rng.choice(["male", "female"])
        case_counter += 1
        cases.append(FAERSCase(
            case_id=f"EVAL-{case_counter:04d}",
            drugs=[d1, d2],
            age=age,
            sex=sex,
            conditions=rng.sample(
                ["hypertension", "diabetes", "COPD", "anxiety", "insomnia",
                 "chronic pain", "depression", "heart failure"],
                k=rng.randint(1, 3),
            ),
            outcome_severity=rng.choice(_SEVERITIES),
            description=(
                f"{age}-year-old {sex} taking {d1} and {d2}. "
                f"Presented for routine evaluation. No significant drug interaction events reported."
            ),
            faers_matches=rng.randint(10, 300),
        ))

    return cases


# ── Relevance judgement ─────────────────────────────────────────────────────

def is_relevant(case: FAERSCase, expected_pair: Tuple[str, str]) -> bool:
    """
    A case is relevant if it contains both drugs from the expected pair
    after brand→generic normalization.
    """
    normalized_drugs = {normalize_drug(d) for d in case.drugs}
    return expected_pair[0] in normalized_drugs and expected_pair[1] in normalized_drugs


def get_relevant_ids(corpus: List[FAERSCase], expected_pair: Tuple[str, str]) -> Set[str]:
    """Return set of case_ids relevant to the given pair."""
    return {c.case_id for c in corpus if is_relevant(c, expected_pair)}


# ── Retrieval metrics ───────────────────────────────────────────────────────

def precision_at_k(retrieved_ids: List[str], relevant_ids: Set[str], k: int) -> float:
    """Precision@K: fraction of top-K results that are relevant."""
    top_k = retrieved_ids[:k]
    if not top_k:
        return 0.0
    return sum(1 for rid in top_k if rid in relevant_ids) / k


def recall_at_k(retrieved_ids: List[str], relevant_ids: Set[str], k: int) -> float:
    """Recall@K: fraction of all relevant documents found in top-K."""
    if not relevant_ids:
        return 0.0
    top_k = retrieved_ids[:k]
    return sum(1 for rid in top_k if rid in relevant_ids) / len(relevant_ids)


def mrr(retrieved_ids: List[str], relevant_ids: Set[str]) -> float:
    """Mean Reciprocal Rank: 1/rank of first relevant result."""
    for i, rid in enumerate(retrieved_ids, start=1):
        if rid in relevant_ids:
            return 1.0 / i
    return 0.0


def ndcg_at_k(retrieved_ids: List[str], relevant_ids: Set[str], k: int) -> float:
    """NDCG@K with binary relevance."""
    top_k = retrieved_ids[:k]
    # DCG
    dcg = 0.0
    for i, rid in enumerate(top_k):
        rel = 1.0 if rid in relevant_ids else 0.0
        dcg += rel / math.log2(i + 2)  # i+2 because i is 0-indexed
    # IDCG: best possible ordering
    n_rel_in_k = min(len(relevant_ids), k)
    idcg = sum(1.0 / math.log2(i + 2) for i in range(n_rel_in_k))
    if idcg == 0:
        return 0.0
    return dcg / idcg


def compute_metrics(
    retrieved_ids: List[str],
    relevant_ids: Set[str],
    k_values: List[int] | None = None,
) -> Dict[str, float]:
    """Compute all metrics for a single query."""
    if k_values is None:
        k_values = [5, 10]
    metrics: Dict[str, float] = {}
    for k in k_values:
        metrics[f"P@{k}"] = precision_at_k(retrieved_ids, relevant_ids, k)
        metrics[f"R@{k}"] = recall_at_k(retrieved_ids, relevant_ids, k)
        metrics[f"NDCG@{k}"] = ndcg_at_k(retrieved_ids, relevant_ids, k)
    metrics["MRR"] = mrr(retrieved_ids, relevant_ids)
    return metrics


# ── Engine dispatch ─────────────────────────────────────────────────────────

def run_v1(
    query: TestQuery,
    corpus: List[FAERSCase],
    qp: QueryProcessor,
    top_k: int = 10,
) -> List[str]:
    """V1 keyword search: extract drugs from query, then exact match."""
    v1 = V1KeywordSearch()
    drugs = qp.extract_drugs(query.query)
    results = v1.search(drugs, corpus, top_k=top_k)
    return [case.case_id for case, _score in results]


def run_v2(
    query: TestQuery,
    v2_engine: V2TFIDFSearch,
    top_k: int = 10,
) -> List[str]:
    """V2 TF-IDF search: use raw query text."""
    results = v2_engine.search(query.query, top_k=top_k)
    return [case.case_id for case, _score in results]


def run_v3(
    query: TestQuery,
    v3_engine: V3VectorSearch,
    qp: QueryProcessor,
    top_k: int = 10,
) -> List[str]:
    """V3 vector search: encode query, then cosine similarity."""
    embedding = qp.generate_embedding(query.query)
    results = v3_engine.search(embedding, top_k=top_k)
    return [case.case_id for case, _score in results]


# ── Full evaluation ─────────────────────────────────────────────────────────

@dataclass
class QueryResult:
    query_id: str
    query_text: str
    category: str
    engine: str
    metrics: Dict[str, float] = field(default_factory=dict)
    retrieved_ids: List[str] = field(default_factory=list)
    relevant_count: int = 0


def run_full_evaluation(top_k: int = 10) -> List[QueryResult]:
    """Run all 20 queries through V1, V2, V3 and collect metrics."""
    print("Building evaluation corpus...")
    corpus = build_eval_corpus()
    print(f"  Corpus size: {len(corpus)} cases")

    print("Initializing search engines...")
    qp = QueryProcessor()

    # V2: fit TF-IDF
    v2 = V2TFIDFSearch()
    v2.fit(corpus)

    # V3: fit embeddings
    v3 = V3VectorSearch(qp)
    v3.fit(corpus)

    print(f"Running {len(TEST_QUERIES)} queries × 3 engines...\n")

    all_results: List[QueryResult] = []

    for q in TEST_QUERIES:
        relevant_ids = get_relevant_ids(corpus, q.expected_pair)

        # V1
        v1_ids = run_v1(q, corpus, qp, top_k)
        v1_metrics = compute_metrics(v1_ids, relevant_ids)
        all_results.append(QueryResult(
            q.id, q.query, q.category, "V1",
            v1_metrics, v1_ids, len(relevant_ids),
        ))

        # V2
        v2_ids = run_v2(q, v2, top_k)
        v2_metrics = compute_metrics(v2_ids, relevant_ids)
        all_results.append(QueryResult(
            q.id, q.query, q.category, "V2",
            v2_metrics, v2_ids, len(relevant_ids),
        ))

        # V3
        v3_ids = run_v3(q, v3, qp, top_k)
        v3_metrics = compute_metrics(v3_ids, relevant_ids)
        all_results.append(QueryResult(
            q.id, q.query, q.category, "V3",
            v3_metrics, v3_ids, len(relevant_ids),
        ))

    return all_results


# ── Printing / reporting ────────────────────────────────────────────────────

def _fmt(val: float) -> str:
    return f"{val:.1%}"


def print_summary_table(results: List[QueryResult]) -> None:
    """Print mean metrics per engine."""
    engines = ["V1", "V2", "V3"]
    metric_names = ["P@5", "P@10", "R@10", "MRR", "NDCG@10"]

    print("=" * 72)
    print("SUMMARY — Mean metrics across all 20 queries")
    print("=" * 72)
    header = f"{'Engine':<8}" + "".join(f"{m:>10}" for m in metric_names)
    print(header)
    print("-" * 72)

    for eng in engines:
        eng_results = [r for r in results if r.engine == eng]
        row = f"{eng:<8}"
        for m in metric_names:
            vals = [r.metrics[m] for r in eng_results]
            row += f"{_fmt(np.mean(vals)):>10}"
        print(row)
    print()


def print_category_breakdown(results: List[QueryResult]) -> None:
    """Print mean metrics per engine × category."""
    engines = ["V1", "V2", "V3"]
    categories = ["high_severity", "brand_name", "natural_language", "demographic"]
    cat_labels = {
        "high_severity": "Generic (Q01-Q10)",
        "brand_name": "Brand (Q11-Q14)",
        "natural_language": "NatLang (Q15-Q18)",
        "demographic": "Demo (Q19-Q20)",
    }
    metric_name = "NDCG@10"

    print("=" * 60)
    print(f"CATEGORY BREAKDOWN — {metric_name}")
    print("=" * 60)
    header = f"{'Category':<22}" + "".join(f"{e:>10}" for e in engines)
    print(header)
    print("-" * 60)

    for cat in categories:
        label = cat_labels[cat]
        row = f"{label:<22}"
        for eng in engines:
            vals = [
                r.metrics[metric_name]
                for r in results
                if r.engine == eng and r.category == cat
            ]
            row += f"{_fmt(np.mean(vals)) if vals else 'N/A':>10}"
        print(row)
    print()


def print_per_query_detail(results: List[QueryResult]) -> None:
    """Print per-query hit/miss detail."""
    engines = ["V1", "V2", "V3"]

    print("=" * 80)
    print("PER-QUERY DETAIL — R@10 (hit = ≥1 relevant in top 10)")
    print("=" * 80)
    header = f"{'QID':<6}{'Category':<18}" + "".join(f"{e:>10}" for e in engines)
    print(header)
    print("-" * 80)

    query_ids = list(dict.fromkeys(r.query_id for r in results))
    for qid in query_ids:
        qr = [r for r in results if r.query_id == qid]
        cat = qr[0].category
        row = f"{qid:<6}{cat:<18}"
        for eng in engines:
            r = next(r for r in qr if r.engine == eng)
            val = r.metrics["R@10"]
            marker = f"{_fmt(val)}"
            row += f"{marker:>10}"
        print(row)
    print()


def save_csv(results: List[QueryResult], path: str) -> None:
    """Save per-query results to CSV."""
    metric_names = ["P@5", "P@10", "R@10", "MRR", "NDCG@10"]
    with open(path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(
            ["query_id", "query", "category", "engine", "relevant_count"]
            + metric_names
        )
        for r in results:
            writer.writerow(
                [r.query_id, r.query_text, r.category, r.engine, r.relevant_count]
                + [round(r.metrics[m], 4) for m in metric_names]
            )
    print(f"Results saved to {path}")


def generate_plot(results: List[QueryResult], path: str = "/tmp/eval_comparison.html") -> None:
    """Generate a Plotly grouped bar chart."""
    try:
        import plotly.graph_objects as go
    except ImportError:
        print("plotly not installed — skipping chart. Install with: pip install plotly")
        return

    engines = ["V1", "V2", "V3"]
    metric_names = ["P@5", "P@10", "R@10", "MRR", "NDCG@10"]
    colors = {"V1": "#ef4444", "V2": "#f59e0b", "V3": "#22c55e"}

    fig = go.Figure()
    for eng in engines:
        eng_results = [r for r in results if r.engine == eng]
        means = []
        for m in metric_names:
            vals = [r.metrics[m] for r in eng_results]
            means.append(np.mean(vals))
        fig.add_trace(go.Bar(
            name=eng,
            x=metric_names,
            y=means,
            marker_color=colors[eng],
            text=[f"{v:.1%}" for v in means],
            textposition="outside",
        ))

    fig.update_layout(
        title="Search Engine Comparison: V1 vs V2 vs V3",
        xaxis_title="Metric",
        yaxis_title="Score",
        yaxis=dict(range=[0, 1.05]),
        barmode="group",
        template="plotly_white",
    )
    fig.write_html(path)
    print(f"Chart saved to {path}")


# ── CLI ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate V1/V2/V3 search engines")
    parser.add_argument("--plot", action="store_true", help="Generate Plotly bar chart")
    parser.add_argument("--output", type=str, default=None, help="Save results to CSV")
    args = parser.parse_args()

    results = run_full_evaluation()

    print_summary_table(results)
    print_category_breakdown(results)
    print_per_query_detail(results)

    if args.output:
        save_csv(results, args.output)

    if args.plot:
        generate_plot(results)


if __name__ == "__main__":
    main()

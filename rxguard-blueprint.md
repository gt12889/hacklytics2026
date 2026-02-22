# RxGuard — Project Blueprint

## Hacklytics 2026

---

## Implementation Status

### Completed

- Multi-engine search pipeline: V1 (keyword) → V2 (TF-IDF) → V3 (vector) → V3Actian (production)
- FAERS data pipeline with batched ingestion (pair batches + volume stages)
- DailyMed drug label ingestion pipeline
- Query processor with drug extraction, demographic parsing, and embedding generation
- Risk scoring with semantic similarity, severity weighting, and demographic matching
- Response generator with Gemini LLM summarization
- Actian VectorAI DB integration with Docker deployment
- Streamlit web application with search engine selection
- FastAPI backend server with `/search` and `/suggestions` endpoints
- React 19 + Vite 7 frontend dashboard with Recharts visualizations
- Search evaluation framework with P@K, R@K, NDCG metrics
- EDA: heatmap, demographic charts, severity distribution (Sphinx/Plotly)
- 50 high-risk drug interaction pairs configured
- ROR disproportionality analysis
- Vocabulary mismatch quantification (1,532 vs. 1)
- Live case retrieval with FAERS report IDs
- Montelukast psychiatric signal validation against FDA black box warning

### Planned

- Full FAERS database expansion (20M+ reports)
- Biomedical embedding model (PubMedBERT/BiomedBERT)
- EHR integration for real-time medication reconciliation
- Filtered search in Actian VectorAI DB (by demographics, outcomes)
- Clinical validation study with pharmacists
- Export functionality for clinical reports

---

## 1. Elevator Pitch

Every year, 250,000 Americans die from medical errors — the third leading cause of death. A huge chunk of those are preventable drug interactions. RxGuard is a semantic search engine for medication safety. Describe a patient's medication regimen in plain English, and the system retrieves dangerous interactions, contraindications, and real FDA adverse event reports — through deep semantic understanding, not keyword matching. Built on Actian VectorAI DB for production-scale semantic retrieval, with statistical validation via Sphinx, the entire system is an AI safety tool that protects humans from preventable harm.

---

## 2. Problem Statement

### The Gap

Current drug interaction checkers (Epocrates, Lexicomp, Micromedex) work on exact drug-name lookups in curated databases. They catch known, cataloged interactions between specific drug pairs.

What they miss:

- **Narrative adverse events**: A FAERS report describing "patient's blood sugar dropped dangerously after adding the new antibiotic" is a real signal about a metformin + fluoroquinolone interaction — described in natural language, not as a structured drug-drug pair
- **Brand vs. generic confusion**: "Glucophage" and "metformin" are the same drug but won't match in keyword search
- **Symptom-described interactions**: "I started feeling dizzy and my heart was racing after my new prescription" maps to tachycardia + orthostatic hypotension but contains no drug names
- **Context-dependent risk**: A drug combo might be fine for a 30-year-old but dangerous for a 75-year-old with kidney disease — current tools don't semantically search for demographically similar adverse event cases

### The Opportunity

The FDA FAERS database contains 20M+ adverse event reports dating back to 2004, with rich narrative text, patient demographics, drug lists, and outcomes. This is an untapped semantic goldmine. Nobody is doing vector search on FAERS narratives.

### Impact Numbers

- 250,000+ deaths/year from medical errors in the US (BMJ, 2016)
- 1.3 million ER visits/year from adverse drug events (CDC)
- 350,000+ adverse drug events in nursing homes/year
- $3.5 billion/year in extra medical costs from preventable adverse drug events
- FDA receives 1M+ adverse event reports annually

---

## 3. What RxGuard Does

### User Flow

1. **Input**: User describes a medication scenario in natural language
   - Example: "65-year-old female on warfarin and metformin, doctor wants to add ibuprofen for joint pain"
2. **Processing**: System parses the query, identifies drugs and context, then:
   - Searches vectorized FAERS reports for semantically similar adverse event cases
   - Retrieves relevant drug label warnings from DailyMed
   - Scores risk based on historical outcome severity
3. **Output**
   - **Top matching FAERS cases** with narratives showing what happened to similar patients
   - **Specific warnings** extracted from drug labels
   - **Demographic context**: "In patients over 60 taking this combination, 73% of reported adverse events involved GI bleeding"
   - **Recommendation**: severity level and suggested actions

### Example Output

```
QUERY: "65-year-old female on warfarin and metformin, doctor wants to add ibuprofen"


PRIMARY INTERACTION: Warfarin + Ibuprofen (NSAID)
- Risk: Major GI bleeding, increased INR
- FAERS matches: 4,231 reports involving warfarin + NSAID combinations
- Outcome severity: 12% resulted in hospitalization, 3% fatal

SIMILAR CASE RETRIEVED (Cosine Similarity: 0.94):
"67F on chronic warfarin therapy for AFib, prescribed ibuprofen 400mg
for osteoarthritis. Presented to ER 9 days later with melena and
hemoglobin of 6.2. INR was 8.3. Required 4 units pRBC transfusion."

SECONDARY FLAG: Metformin + Ibuprofen
- Risk: NSAIDs may reduce renal blood flow, impairing metformin clearance
- FAERS matches: 847 reports
- Lower severity but notable in patients with existing renal compromise

DEMOGRAPHIC CONTEXT:
- Female patients 60-75 on warfarin + NSAID: 2.3x higher bleeding risk
  vs. male patients (based on FAERS demographic analysis)

RECOMMENDATION: Consider acetaminophen as alternative analgesic.
If NSAID required, use lowest effective dose with PPI gastroprotection
and increased INR monitoring.
```

---

## 4. Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                        │
│  Streamlit Web App / React 19 Dashboard                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  QUERY PROCESSOR                         │
│  1. Extract drug names (regex + drug dictionary)         │
│  2. Extract patient context (age, sex, conditions)       │
│  3. Generate query embedding (sentence-transformers)     │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
┌──────────────┐ ┌───────────┐ ┌──────────────────┐
│ V1: KEYWORD  │ │ V2: TFIDF │ │ V3: VECTOR SEARCH│
│ Exact match  │ │ + Cosine  │ │ Actian VectorAI  │
│ (Baseline)   │ │ Similarity│ │ DB (HNSW)        │
└──────┬───────┘ └─────┬─────┘ └────────┬─────────┘
       │               │                │
       └───────────────┼────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 RESULTS RANKER                           │
│  1. Score by semantic similarity                         │
│  2. Weight by outcome severity (death > hospitalization) │
│  3. Weight by demographic match (age, sex similarity)    │
│  4. Generate risk score (1-10)                           │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│               RESPONSE GENERATOR                         │
│  Format results: risk score, matched cases, warnings,    │
│  demographic analysis, recommendations                   │
│  (LLM summarization via Gemini API)                      │
└─────────────────────────────────────────────────────────┘
```

### Data Pipeline

```
openFDA API                    DailyMed Drug Labels
     │                               │
     ▼                               ▼
┌───────────────┐              ┌────────────────┐
│ Data Collector│              │ Label Ingestion│
│ (50 drug      │              │ - warnings     │
│  interaction  │              │ - interactions │
│  pairs)       │              │ - contras      │
└───────┬───────┘              └───────┬────────┘
        │                              │
        ▼                              ▼
┌─────────────────────────────────────────────┐
│         TEXT PREPROCESSING                   │
│  Clean, deduplicate, normalize drug names   │
│  Build searchable document chunks            │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│      EMBEDDING GENERATION                    │
│  sentence-transformers (all-MiniLM-L6-v2)    │
│  384-dimensional vectors                     │
└──────────────────────┬──────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────┐
│         VECTOR STORAGE                       │
│  In-memory (development)                     │
│  Actian VectorAI DB (production)             │
└─────────────────────────────────────────────┘
```

### Frontend Architecture

```
App.jsx (React Router)
    ├── SearchPage.jsx
    │   ├── Type-ahead drug suggestions
    │   ├── Clinical query input form
    │   └── Submit to /api/search
    │
    └── RxGuardDashboard.jsx
        ├── Total adverse event reports
        ├── Outcome severity breakdown (deaths/hospitalizations)
        ├── Top reported reactions (bar chart)
        ├── Sex distribution (pie chart)
        ├── Age distribution (area chart)
        ├── Similar cases table with similarity scores
        └── AI analysis (Gemini-powered summary)
```

---

## 5. Three-Stage Search Evolution

Each stage demonstrates a limitation that motivates the next.

### V1 — Keyword Baseline

**Approach**: Exact string matching on drug names in FAERS data.

**Implementation**: `V1KeywordSearch` — pandas query filtering for exact drug name matches.

**Strengths**: Fast (<10ms), deterministic.

**Failures**:
- Misses brand names — "Coumadin" won't match "warfarin" reports
- Misses narrative descriptions — "the blood thinner" doesn't match "warfarin"
- Can't handle symptom-based queries — "patient is bleeding more easily" returns nothing

### V2 — TF-IDF + Cosine Similarity

**Approach**: Vectorize FAERS narratives with TF-IDF, rank by cosine similarity.

**Implementation**: `V2TFIDFSearch` — scikit-learn `TfidfVectorizer` with cosine similarity ranking.

**Strengths**: Better recall, captures word overlap patterns.

**Failures**:
- Misses deep semantic similarity — "blood sugar crashed" doesn't match "hypoglycemia"
- Weights rare words too heavily
- No medical context understanding

### V3 — Dense Embeddings + Actian VectorAI DB

**Approach**: Embed FAERS narratives with sentence-transformers, store in Actian VectorAI DB, retrieve via HNSW approximate nearest neighbor search.

**Implementation**: `V3VectorSearch` (in-memory) and `V3ActianVectorSearch` (Actian DB via gRPC).

**Strengths**:
- "blood sugar crashed" → retrieves "hypoglycemia" reports (zero word overlap)
- "Coumadin" → retrieves "warfarin" reports (brand/generic equivalence)
- "elderly woman on a blood thinner" → retrieves warfarin events in female patients 65+
- Demographic-aware retrieval

### Comparative Results

| Metric | V1: Keyword | V2: TF-IDF | V3: Vector |
|--------|------------|------------|------------|
| Handles brand/generic | No | Partial | Yes |
| Handles synonyms | No | Partial | Yes |
| Semantic understanding | No | No | Yes |
| Demographic-aware | No | No | Yes |
| Query latency | <10ms | ~200ms | ~150ms |

---

## 6. Data Sources

### Primary: FDA FAERS via openFDA API

**Endpoint**: `https://api.fda.gov/drug/event.json`

**Key fields**:
- `patient.reaction.reactionmeddrapt` — adverse reactions (MedDRA terms)
- `patient.drug[].medicinalproduct` — drug names
- `patient.drug[].drugindication` — indication
- `patient.drug[].drugcharacterization` — suspect (1), concomitant (2), interacting (3)
- `patient.drug[].openfda.generic_name` / `brand_name` — standardized names
- `patient.drug[].openfda.pharm_class_epc` — pharmacological class
- `serious`, `seriousnessdeath`, `seriousnesshospitalization` — outcome severity
- `patient.patientonsetage`, `patient.patientsex` — demographics

**Rate limits**: 40 req/min without key, 240 req/min with free API key.

**Data strategy**: Focus on 50 high-risk drug interaction pairs (statins, blood thinners, NSAIDs, SSRIs, ACE inhibitors, beta blockers, etc.) covering ~50K-100K reports.

### Secondary: DailyMed Drug Labels

Drug labels with structured "DRUG INTERACTIONS" and "WARNINGS" sections. Serves as ground truth for retrieval validation.

---

## 7. Tech Stack

### Backend (Python 3.12)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Web UI | Streamlit | Interactive demo application |
| REST API | FastAPI + Uvicorn | Production API server |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | 384-dim vector generation |
| Vector DB | Actian VectorAI DB | Production-scale HNSW search via gRPC |
| LLM | Google Generative AI (Gemini) | Natural language risk summaries |
| Data processing | pandas, NumPy, PyArrow | Data wrangling and storage |
| NLP | scikit-learn (TF-IDF), spaCy, regex | Text vectorization and extraction |
| Data access | requests + openFDA API | FAERS data collection |
| Visualization | Plotly | Backend charts and EDA |
| Validation | pydantic | Data model validation |

### Frontend (React 19)

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Framework | React 19.2 | UI components |
| Build | Vite 7.3 | Dev server and bundling |
| Routing | React Router DOM 7.13 | Page navigation |
| Charts | Recharts 3.7 | Dashboard visualizations |
| Linting | ESLint 9.39 | Code quality |

### Infrastructure

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Container | Docker + Docker Compose | Actian VectorAI DB deployment |
| Protocol | gRPC (port 50051) | Vector DB communication |
| Storage | Parquet files | Processed FAERS data |

---

## 8. Analyses

### Analysis 1: Adverse Event Clustering by Drug Class

Cluster FAERS adverse events by pharmacological drug class. Visualize which drug classes have the highest co-occurrence in serious adverse events.

**Output**: Heatmap of drug class interaction frequency x severity.

### Analysis 2: Demographic Risk Profiling

Model how adverse event severity varies by patient demographics:
- Do female patients on warfarin + NSAIDs have higher bleeding rates than males?
- Does age correlate with interaction severity for specific drug combinations?
- Are certain drug combos more dangerous for specific age brackets?

**Output**: Risk factor charts segmented by age/sex.

### Analysis 3: Temporal Trends

Analyze whether certain drug interactions are being reported more frequently over time. Detect spikes in reports after new drugs enter the market.

**Output**: Time series plots of adverse event reporting frequency.

### Analysis 4: Retrieval Quality Validation

Statistically validate vector search results against known interactions from DailyMed labels:
- Precision@K, Recall@K, NDCG
- V1 vs V2 vs V3 comparative metrics

**Output**: Performance comparison table and precision-recall curves.

### Analysis 5: Outcome Severity Distribution

For retrieved cases, distribution of outcomes: hospitalization, life-threatening, death, disability.

**Output**: Stacked bar charts by drug combination.

### Analysis 6: Signal Detection

- ROR (Reporting Odds Ratio) disproportionality analysis
- Vocabulary mismatch quantification across search engines
- Indication field analysis for pre-existing condition detection
- Montelukast psychiatric signal validation against FDA black box warning

---

## 9. Test Queries

### High-Severity Known Interactions

1. "Patient on warfarin, adding ibuprofen for pain" (major bleeding risk)
2. "Taking methotrexate and NSAIDs together" (renal failure risk)
3. "Lithium and ACE inhibitor combination" (lithium toxicity)
4. "SSRI with tramadol" (serotonin syndrome)
5. "Simvastatin with clarithromycin" (rhabdomyolysis)
6. "Metformin and contrast dye" (lactic acidosis)
7. "MAO inhibitor with tyramine-rich foods or decongestants" (hypertensive crisis)
8. "Potassium-sparing diuretic with ACE inhibitor" (hyperkalemia)
9. "Digoxin with amiodarone" (digoxin toxicity)
10. "Fluoroquinolone with corticosteroid" (tendon rupture)

### Synonym/Brand Name Tests (V1 should fail, V3 should pass)

11. "Coumadin and Advil" (= warfarin + ibuprofen)
12. "Glucophage with X-ray contrast" (= metformin + contrast dye)
13. "Lipitor and Biaxin" (= atorvastatin + clarithromycin)
14. "Prozac with Ultram" (= fluoxetine + tramadol)

### Natural Language / Symptom-Based Tests (V1 and V2 should fail, V3 should pass)

15. "My grandmother is on a blood thinner and her doctor wants to add a painkiller"
16. "Patient's blood sugar has been dropping since adding the antibiotic"
17. "Started new cholesterol medicine and now having severe muscle pain"
18. "Elderly patient on heart rhythm medication, experiencing vision changes"

### Demographic-Context Tests

19. "75-year-old male with kidney disease on metformin and lisinopril"
20. "Pregnant woman asking about ibuprofen safety"

---

## 10. Module Reference

### Backend Modules

| Module | Lines | Purpose |
|--------|-------|---------|
| `api.py` | ~700 | FastAPI server with `/search`, `/suggestions` endpoints |
| `app.py` | ~450 | Streamlit web application |
| `eval_search.py` | ~850 | Search evaluation and benchmarking |
| `query_processor.py` | ~120 | Drug extraction, demographics parsing, embedding |
| `search_engines.py` | ~130 | V1/V2/V3/V3Actian search classes |
| `results_ranker.py` | ~120 | Semantic + severity + demographic scoring |
| `response_generator.py` | ~200 | Response formatting + Gemini integration |
| `actian_vector_db.py` | ~220 | Actian VectorAI DB connection, collections, search |
| `config.py` | ~160 | 50 drug pairs, API settings, pipeline constants |
| `data_models.py` | ~30 | FAERSCase dataclass |
| `run_pipeline.py` | ~220 | Full FAERS pipeline runner |
| `run_pipeline_batched.py` | ~200 | Batched pipeline with volume stages |

### Data Pipeline Modules (`src/`)

| Module | Purpose |
|--------|---------|
| `data_collector.py` | openFDA API wrapper with rate limiting |
| `data_cleaner.py` | FAERS cleaning, normalization, deduplication |
| `document_builder.py` | Searchable document chunk creation |
| `vector_store.py` | Embedding generation + in-memory/Actian storage |
| `search.py` | Semantic search with demographic filters |
| `sphinx_eda.py` | EDA charts (heatmap, severity, demographics) |
| `dailymed_ingestion.py` | DailyMed drug label pipeline |
| `label_document_builder.py` | Drug label document creation |
| `label_vector_store.py` | Drug label vector storage |

### Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| App | `App.jsx` | React Router (`/home` → `/result`) |
| SearchPage | `SearchPage.jsx` | Query input with drug type-ahead |
| Dashboard | `rxguard_dashboard.jsx` | Visualizations + AI analysis |

---

## 11. Key Design Decisions

### Embedding Model: all-MiniLM-L6-v2

384-dimensional vectors. Processes ~2000 sentences/second on CPU. Good general-purpose semantic understanding. Trade-off: a biomedical model (PubMedBERT) would capture medical semantics better but is slower and larger.

### Risk Scoring Formula

```
risk_score = weighted_sum(
    semantic_similarity,           # cosine similarity of query vs. case embeddings
    outcome_severity_weight,       # death:10, hospitalization:7, serious:4, non-serious:1
    demographic_match_score,       # age similarity + sex match + condition overlap
    report_frequency               # FAERS report count for the drug pair
)
```

Normalized to 1-10 scale.

### Dual UI Strategy

- **Streamlit**: Rapid prototyping, built-in widgets, ideal for demos
- **FastAPI + React**: Production-grade, decoupled frontend/backend, better UX

### Actian VectorAI DB Fallback

The system auto-detects Actian DB availability. If unavailable, V3 falls back to in-memory sentence-transformer search. No code changes required.

### Batched Pipeline Design

FAERS ingestion uses pair-batch + volume-stage approach:
1. Process drug pairs in batches (default 10 pairs/batch)
2. Ramp volume per pair across stages (1K → 2.5K → 5K reports)
3. Each stage runs clean → build → embed on the full dataset
4. Cached pairs are skipped on resume

---

## 12. Presentation Framing

### SafetyKit Alignment

SafetyKit builds AI agents that protect platform users from harm using semantic AI beyond keyword matching. RxGuard applies the same paradigm to medication safety:

- **Platform safety → Patient safety**
- **Keyword blocklists → Semantic search**
- **Policy-backed explanations → Evidence-backed warnings**
- **Risk scoring → Risk scoring**
- **Human-in-the-loop → Clinician-in-the-loop**

Key phrase: "RxGuard applies the trust-and-safety paradigm to medication safety — using semantic AI to detect dangerous drug interactions that keyword-based systems miss."

### Judge Q&A

**Q: Doesn't this already exist?**
A: Existing tools check structured drug-drug pair databases. RxGuard adds a complementary layer — searching narrative text of real adverse event reports for patterns that structured databases haven't cataloged.

**Q: FAERS data has limitations — reports don't prove causation.**
A: Correct. FAERS is a signal detection tool. RxGuard presents cases as "similar reported experiences" — evidence to inform clinical judgment, not replace it. The FDA itself uses FAERS for post-market surveillance signals.

**Q: How do you handle false positives?**
A: (1) Rank by outcome severity — benign co-occurrences are deprioritized. (2) Metadata filtering by patient demographics reduces irrelevant matches. (3) Retrieval precision is validated against known interactions from DailyMed labels.

**Q: Why Actian VectorAI DB?**
A: Healthcare data has strict privacy requirements (HIPAA). Actian VectorAI DB is designed for edge/on-premises deployment — a hospital can run this entirely within their own infrastructure without sending patient data to the cloud. Zero per-query-fee model matters for high-volume clinical use.

---

## 13. One-Liner

**RxGuard: A semantic search engine for medication safety that retrieves dangerous drug interactions from FDA adverse event reports using vector embeddings — catching what keyword-based interaction checkers miss.**

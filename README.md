# RxGuard |  Drug Interaction Safety Intelligence

A semantic search engine for medication safety that retrieves dangerous drug interactions from FDA adverse event reports using vector embeddings — catching what keyword-based interaction checkers miss.

## Overview

RxGuard analyzes drug interaction risks using FAERS (FDA Adverse Event Reporting System) data and semantic search. Describe a patient's medication regimen in plain English, and the system retrieves dangerous interactions, contraindications, and real FDA adverse event cases — ranked by severity and matched by semantic meaning, not just keywords.

## Features

- **Natural Language Queries** — extract drugs, demographics, and conditions from free-text clinical descriptions
- **Multi-Engine Search** — four search backends with progressively better semantic understanding:
  - V1: Keyword exact match (baseline)
  - V2: TF-IDF + cosine similarity
  - V3: Vector search with sentence-transformers (in-memory)
  - V3Actian: Vector search with Actian VectorAI DB (production-scale)
- **Risk Scoring** — weighted by semantic similarity, outcome severity, and demographic match (1-10 scale)
- **Clinical Recommendations** — automated safety recommendations with alternative medication suggestions
- **LLM Summaries** — optional Gemini API integration for natural language risk explanations
- **React Dashboard** — interactive adverse event visualizations (Recharts), similar cases table, and AI analysis
- **Data Pipeline** — batched FAERS ingestion with DailyMed drug label integration

## Architecture

```
User Query (Natural Language)
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│                    QUERY PROCESSOR                       │
│  1. Extract drug names (regex + drug dictionary)         │
│  2. Extract patient context (age, sex, conditions)       │
│  3. Generate query embedding (sentence-transformers)     │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
   V1: Keyword   V2: TF-IDF   V3: Vector Search
   (exact match) (cosine sim)  (Actian VectorAI DB)
          │            │            │
          └────────────┼────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   RESULTS RANKER                         │
│  Semantic similarity + severity weighting +              │
│  demographic match → Risk score (1-10)                   │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌─────────────────────────────────────────────────────────┐
│                RESPONSE GENERATOR                        │
│  Risk score, matched cases, warnings, demographics,      │
│  recommendations + optional Gemini LLM summarization     │
└──────────────────────┬──────────────────────────────────┘
                       ▼
         React Dashboard / Streamlit UI
```

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+ (for frontend)
- Docker (optional, for Actian VectorAI DB)

### 1. Install Python dependencies

```bash
pip install -r requirements.txt
```

The first run downloads the sentence-transformer model (~90MB).

### 2. Set up Gemini API (optional)

Create a `.env` file in the project root:

```
GEMINI_API_KEY=your_api_key_here
```

Get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Run the application

**Option A: Streamlit UI**

```bash
streamlit run app.py
```

Opens at `http://localhost:8501`.

**Option B: FastAPI + React Frontend**

```bash
# Terminal 1 — backend
python -m uvicorn api:app --reload

# Terminal 2 — frontend
cd frontend && npm install && npm run dev
```

### 4. Set up Actian VectorAI DB (optional)

For production-scale vector search:

```bash
# Install the client
pip install actiancortex-0.1.0b1-py3-none-any.whl

# Start the database
docker compose up -d
```

Download the wheel from [Actian VectorAI DB Beta](https://github.com/hackmamba-io/actian-vectorAI-db-beta). The app auto-detects the database and falls back to in-memory search if unavailable.

## Usage

Enter a natural language query describing the patient and proposed drug combination:

```
65-year-old female on warfarin and metformin, doctor wants to add ibuprofen
```

**Example output:**

- **RISK SCORE**: 8.7/10 — HIGH RISK
- **Primary Interaction**: Warfarin + Ibuprofen (NSAID) — major GI bleeding, increased INR
- **FAERS matches**: 4,231 reports | 12% hospitalization, 3% fatal
- **Recommendation**: Consider acetaminophen as alternative. If NSAID required, use lowest effective dose with PPI gastroprotection and increased INR monitoring.

### More example queries

```
70-year-old male with diabetes on metformin, prescribed naproxen for arthritis
55-year-old female on warfarin, needs aspirin for heart protection
Patient on lithium and ACE inhibitor — risk assessment
```

## Data Pipeline

Load FAERS data in batches with configurable pair counts and volume stages:

```bash
python run_pipeline_batched.py                          # defaults: 10 pairs/batch, 1K→2.5K→5K
python run_pipeline_batched.py --pair-batch 5            # 5 pairs per batch
python run_pipeline_batched.py --stages 1000 5000 10000  # custom volume stages
python run_pipeline_batched.py --labels                  # include DailyMed label pipeline
```

Safe to stop and resume — cached pairs are skipped.

## Project Structure

```
hacklytics2026/
├── app.py                     # Streamlit application
├── api.py                     # FastAPI backend server
├── config.py                  # API settings, 50 drug interaction pairs
├── query_processor.py         # Query NLP and embedding generation
├── search_engines.py          # V1/V2/V3/V3Actian search engines
├── results_ranker.py          # Risk scoring and ranking
├── response_generator.py      # Response formatting + Gemini integration
├── actian_vector_db.py        # Actian VectorAI DB wrapper
├── data_models.py             # FAERSCase dataclass
├── sample_data.py             # Sample FAERS cases for testing
├── run_pipeline.py            # Full FAERS data pipeline
├── run_pipeline_batched.py    # Batched pipeline (pair batches + volume stages)
├── run_label_pipeline.py      # DailyMed drug label pipeline
├── eval_search.py             # Search evaluation and benchmarking
├── docker-compose.yml         # Actian VectorAI DB container
├── requirements.txt           # Python dependencies
├── src/
│   ├── data_collector.py      # openFDA API data collection
│   ├── data_cleaner.py        # FAERS cleaning and normalization
│   ├── document_builder.py    # Searchable document chunk builder
│   ├── vector_store.py        # Embedding generation and storage
│   ├── search.py              # Semantic search with filters
│   ├── sphinx_eda.py          # EDA charts and statistical analysis
│   ├── dailymed_ingestion.py  # DailyMed drug label ingestion
│   ├── label_document_builder.py  # Drug label document builder
│   └── label_vector_store.py  # Drug label vector storage
├── frontend/                  # React 19 + Vite 7 dashboard
│   ├── src/
│   │   ├── App.jsx            # Router component
│   │   ├── SearchPage.jsx     # Search input with type-ahead
│   │   └── rxguard_dashboard.jsx  # Results dashboard with charts
│   └── package.json
└── data/
    ├── raw/                   # Raw FAERS JSON from openFDA
    └── processed/             # Cleaned parquet files
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12, FastAPI, Streamlit |
| Frontend | React 19, Vite 7, Recharts, React Router |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2, 384-dim) |
| Vector DB | Actian VectorAI DB (HNSW, gRPC) |
| LLM | Google Gemini API |
| Data | openFDA API, DailyMed, pandas, PyArrow |
| NLP | scikit-learn (TF-IDF), spaCy, regex |
| Visualization | Recharts (frontend), Plotly (backend) |
| DevOps | Docker, Docker Compose |

## Deployment

### Local development

Run with Streamlit or FastAPI + React as described in Quick Start.

### Production (Actian VectorAI DB on remote server)

1. Provision a server (e.g., Vultr) with Docker installed
2. Clone the repo and run `docker compose up -d` to start Actian VectorAI DB
3. Open port 50051 for team access: `ufw allow 50051/tcp`
4. Set `ACTIAN_DB_HOST=<server-ip>:50051` in each team member's `.env`
5. Run the app with V3Actian search engine selected

For monitoring: `docker logs vectoraidb` | `docker stats vectoraidb`

## Disclaimer

This system is for research and educational purposes. It should not be used as the sole basis for clinical decision-making. Always consult with qualified healthcare professionals for medical advice.

## License

Hacklytics 2026.

# Drug Interaction Risk Assessment System

A comprehensive system for analyzing drug interaction risks using FAERS (FDA Adverse Event Reporting System) data and semantic search capabilities.

## 🎯 Features

- **Natural Language Query Processing**: Extract drugs, patient demographics, and medical conditions from free-text queries
- **Multiple Search Engines**: 
  - V1: Keyword exact match (baseline)
  - V2: TFIDF + Cosine Similarity
  - V3: Vector Search with sentence transformers (in-memory)
  - V3Actian: Vector Search with Actian VectorAI DB (production-scale, requires setup)
- **Intelligent Risk Scoring**: 
  - Semantic similarity matching
  - Outcome severity weighting
  - Demographic matching (age, sex, conditions)
  - FAERS report count integration
- **Clinical Recommendations**: Automated generation of safety recommendations
- **LLM Integration**: Optional Gemini API for natural language summarization

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│ USER INTERFACE │
│ Streamlit Web App — Natural Language Query Input │
└──────────────────────┬──────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ QUERY PROCESSOR │
│ 1. Extract drug names (NER / regex + drug dictionary) │
│ 2. Extract patient context (age, sex, conditions) │
│ 3. Generate query embedding (sentence-transformers) │
└──────────────────────┬──────────────────────────────────┘
 │
 ┌────────────┼────────────┐
 ▼ ▼ ▼
┌──────────────┐ ┌───────────┐ ┌──────────────────┐
│ V1: KEYWORD │ │ V2: TFIDF │ │ V3: VECTOR SEARCH│
│ Exact match │ │ + Cosine │ │ Embeddings │
│ (Baseline) │ │ Similarity│ │ (Recommended) │
└──────┬───────┘ └─────┬─────┘ └────────┬─────────┘
 │ │ │
 └───────────────┼────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ RESULTS RANKER │
│ 1. Score by semantic similarity │
│ 2. Weight by outcome severity (death > hospitalization) │
│ 3. Weight by demographic match (age, sex similarity) │
│ 4. Generate risk score (1-10) │
└──────────────────────┬──────────────────────────────────┘
 │
 ▼
┌─────────────────────────────────────────────────────────┐
│ RESPONSE GENERATOR │
│ Format results: risk score, matched cases, warnings, │
│ demographic analysis, recommendations │
│ (LLM summarization via Gemini API for natural language) │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Installation

1. **Clone the repository** (or navigate to project directory)

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Set up Gemini API key** (optional, for LLM features):
   - Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a `.env` file in the project root:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. **(Optional) Set up Actian VectorAI DB** for production-scale vector search:
   - See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions
   - Download the wheel file from [GitHub](https://github.com/hackmamba-io/actian-vectorAI-db-beta)
   - Install: `pip install actiancortex-0.1.0b1-py3-none-any.whl`
   - Start Docker: `docker compose up -d`

5. **Run the application**:
```bash
streamlit run app.py
```

## 📝 Usage

1. **Enter a natural language query** describing the patient and proposed drug combination
   - Example: "65-year-old female on warfarin and metformin, doctor wants to add ibuprofen"

2. **Select search engine version** (V3 recommended for best results)

3. **Click "Analyze Risk"** to get:
   - Risk score (1-10)
   - Risk level (LOW/MODERATE/HIGH)
   - Clinical summary
   - Recommendations
   - Similar cases from FAERS database

## 📊 Example Output

**Query**: "65-year-old female on warfarin and metformin, doctor wants to add ibuprofen"

**Result**:
- ⚠️ **RISK SCORE**: 8.7/10 — HIGH RISK
- **Primary Interaction**: Warfarin + Ibuprofen (NSAID)
  - Risk: Major GI bleeding, increased INR
  - FAERS matches: 4,231 reports
  - Outcome severity: 12% hospitalization, 3% fatal
- **Recommendation**: Consider acetaminophen as alternative. If NSAID required, use lowest effective dose with PPI gastroprotection and increased INR monitoring.

## 🔧 Configuration

- **Search Engine**: Choose between V1 (keyword), V2 (TFIDF), or V3 (vector search)
- **LLM Summarization**: Toggle Gemini API integration for natural language summaries

## 📁 Project Structure

```
hacklytics2026/
├── app.py                   # Main Streamlit application
├── config.py                # API settings, interaction pairs, pipeline constants
├── query_processor.py       # Query processing and embedding
├── search_engines.py        # V1 Keyword, V2 TFIDF, V3 Vector, V3Actian search
├── results_ranker.py        # Risk scoring and ranking
├── response_generator.py    # Response formatting and LLM integration
├── data_models.py           # FAERS case data models
├── sample_data.py           # Sample FAERS cases for testing
├── actian_vector_db.py      # Actian VectorAI DB wrapper
├── run_pipeline.py          # Full FAERS data pipeline runner
├── run_label_pipeline.py    # DailyMed drug label pipeline
├── docker-compose.yml       # Docker config for Actian VectorAI DB
├── requirements.txt         # Python dependencies
├── src/
│   ├── data_collector.py    # openFDA API data collection
│   ├── data_cleaner.py      # FAERS data cleaning and normalization
│   ├── document_builder.py  # Searchable document chunk builder
│   ├── vector_store.py      # Embedding generation and vector storage
│   ├── search.py            # Semantic search with filters
│   ├── sphinx_eda.py        # EDA charts (heatmap, severity, demographics)
│   ├── dailymed_ingestion.py    # DailyMed drug label ingestion
│   ├── label_document_builder.py # Drug label document builder
│   └── label_vector_store.py    # Drug label vector storage
└── data/
    ├── raw/                 # Raw FAERS JSON from openFDA
    └── processed/           # Cleaned parquet files
```

## 🧪 Testing

The system includes sample FAERS cases for testing. You can:
- View sample cases in the "View Sample FAERS Cases" expander
- Test with the example query pre-filled in the text area
- Try different patient scenarios and drug combinations

## 🔮 Future Enhancements

- Integration with real FAERS database
- Support for more drug names and conditions
- Advanced demographic risk modeling
- Export functionality for clinical reports
- Filtered search with Actian VectorAI DB (by demographics, outcomes, etc.)

## ⚠️ Disclaimer

This system is for research and educational purposes. It should not be used as the sole basis for clinical decision-making. Always consult with qualified healthcare professionals for medical advice.

## 📄 License

This project is part of Hacklytics 2026.

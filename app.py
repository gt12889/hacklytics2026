"""
Main Streamlit Application
Drug Interaction Risk Assessment System
"""
import streamlit as st
import numpy as np
from query_processor import QueryProcessor
from search_engines import V1KeywordSearch, V2TFIDFSearch, V3VectorSearch, V3ActianVectorSearch
from results_ranker import ResultsRanker
from response_generator import ResponseGenerator
from sample_data import get_sample_cases
from data_models import FAERSCase
from query_logger import QueryLogger

# Try to import Actian DB (optional)
try:
    from actian_vector_db import ActianVectorDB
    ACTIAN_AVAILABLE = True
except ImportError:
    ACTIAN_AVAILABLE = False

# Page configuration
st.set_page_config(
    page_title="Drug Interaction Risk Assessment",
    page_icon="💊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state
if 'cases' not in st.session_state:
    st.session_state.cases = get_sample_cases()
    st.session_state.query_processor = QueryProcessor()
    st.session_state.ranker = ResultsRanker()
    st.session_state.response_generator = ResponseGenerator()
    st.session_state.query_logger = QueryLogger()
    
    # Initialize search engines
    st.session_state.v1_search = V1KeywordSearch()
    
    st.session_state.v2_search = V2TFIDFSearch()
    st.session_state.v2_search.fit(st.session_state.cases)
    
    st.session_state.v3_search = V3VectorSearch(st.session_state.query_processor)
    st.session_state.v3_search.fit(st.session_state.cases)
    
    # Initialize Actian DB (if available)
    st.session_state.actian_db = None
    st.session_state.v3_actian_search = None
    if ACTIAN_AVAILABLE:
        try:
            st.session_state.actian_db = ActianVectorDB(
                host="localhost:50051",
                query_processor=st.session_state.query_processor
            )
            # Try to connect (will fail gracefully if DB not running)
            try:
                st.session_state.actian_db.connect()
                st.session_state.actian_db.ensure_collection()
                st.session_state.actian_db.load_cases(st.session_state.cases)
                st.session_state.v3_actian_search = V3ActianVectorSearch(st.session_state.actian_db)
                st.session_state.actian_connected = True
            except Exception as e:
                st.session_state.actian_connected = False
                st.session_state.actian_error = str(e)
        except Exception as e:
            st.session_state.actian_connected = False
            st.session_state.actian_error = str(e)

def main():
    st.title("💊 Drug Interaction Risk Assessment System")
    st.markdown("### Analyze drug interaction risks using FAERS data and semantic search")
    
    # Sidebar for configuration
    with st.sidebar:
        st.header("⚙️ Configuration")
        
        # Search engine options
        search_options = ["V3: Vector Search (In-Memory)", "V2: TFIDF + Cosine", "V1: Keyword Match"]
        if ACTIAN_AVAILABLE and st.session_state.get('actian_connected', False):
            search_options.insert(0, "V3Actian: Vector Search (Actian DB)")
        
        search_version = st.selectbox(
            "Search Engine Version",
            search_options,
            index=0
        )
        
        # Show Actian DB status
        if ACTIAN_AVAILABLE:
            st.markdown("---")
            if st.session_state.get('actian_connected', False):
                st.success("✅ Actian VectorAI DB Connected")
                stats = st.session_state.actian_db.get_collection_stats()
                if stats.get('exists'):
                    st.info(f"📊 Cases in DB: {stats.get('count', 0)}")
            else:
                st.warning("⚠️ Actian DB Not Connected")
                if st.session_state.get('actian_error'):
                    with st.expander("Error Details"):
                        st.code(st.session_state.actian_error)
                st.markdown("""
                **To use Actian DB:**
                1. Download the wheel file from [GitHub](https://github.com/hackmamba-io/actian-vectorAI-db-beta)
                2. Install: `pip install actiancortex-0.1.0b1-py3-none-any.whl`
                3. Start Docker: `docker compose up`
                """)
        
        use_llm = st.checkbox("Use LLM Summarization (Gemini)", value=True)
        use_label_fusion = st.checkbox(
            "Include Drug Label Warnings (DailyMed)",
            value=True,
            help="Show FDA drug label warnings alongside FAERS cases"
        )
        
        st.markdown("---")
        st.markdown("### 📊 System Architecture")
        st.markdown("""
        **Query Processor**
        - Drug extraction
        - Patient context
        - Embedding generation
        
        **Search Engine**
        - Semantic similarity
        - Case retrieval
        
        **Results Ranker**
        - Risk scoring (1-10)
        - Demographic matching
        - Outcome severity weighting
        
        **Response Generator**
        - Natural language summary
        - Clinical recommendations
        """)
    
    # Main query input
    st.markdown("---")
    st.subheader("🔍 Enter Patient Query")
    
    # Example query
    example_query = "65-year-old female on warfarin and metformin, doctor wants to add ibuprofen"
    
    query = st.text_area(
        "Natural Language Query",
        value=example_query,
        height=100,
        help="Enter a natural language description of the patient and proposed drug combination"
    )
    
    if st.button("🚀 Analyze Risk", type="primary", use_container_width=True):
        if not query.strip():
            st.error("Please enter a query")
            return
        
        # Initialize logger for this run
        logger = st.session_state.query_logger
        logger.start_run(query)
        
        with st.spinner("Processing query and searching cases..."):
            try:
                # Process query with timing
                with logger.time_stage("query_processing"):
                    processed = st.session_state.query_processor.process_query(query)
                logger.log_query_processing(processed)
                
                # Perform search based on version with timing
                with logger.time_stage("search"):
                    if "V3Actian" in search_version:
                        if st.session_state.v3_actian_search:
                            search_results = st.session_state.v3_actian_search.search(
                                processed['embedding'], 
                                top_k=10
                            )
                            actual_engine = "V3Actian"
                        else:
                            st.error("Actian VectorAI DB not available. Using in-memory search instead.")
                            search_results = st.session_state.v3_search.search(
                                processed['embedding'], 
                                top_k=10
                            )
                            actual_engine = "V3 (fallback)"
                    elif "V3" in search_version:
                        search_results = st.session_state.v3_search.search(
                            processed['embedding'], 
                            top_k=10
                        )
                        actual_engine = "V3"
                    elif "V2" in search_version:
                        search_results = st.session_state.v2_search.search(
                            processed['original_query'],
                            top_k=10
                        )
                        actual_engine = "V2"
                    else:  # V1
                        search_results = st.session_state.v1_search.search(
                            processed['drugs'],
                            st.session_state.cases,
                            top_k=10
                        )
                        actual_engine = "V1"
                
                logger.log_search(actual_engine, search_results)
                
                # Rank results with timing
                with logger.time_stage("ranking"):
                    ranked_results = st.session_state.ranker.rank_results(
                        search_results,
                        processed['context']
                    )
                logger.log_ranking(ranked_results)

                # Optional: search drug labels (DailyMed) for fusion
                label_hits = []
                if use_label_fusion:
                    try:
                        with logger.time_stage("label_search"):
                            from src.search import search_labels
                            label_hits = search_labels(
                                processed.get('original_query', query),
                                top_k=5
                            )
                    except Exception as e:
                        logger.log_error(
                            error_type=type(e).__name__,
                            error_message=str(e),
                            stage="label_search"
                        )
                else:
                    logger.log_timing("label_search", 0.0)

                # Generate response with timing
                with logger.time_stage("response_generation"):
                    response = st.session_state.response_generator.format_full_response(
                        query,
                        processed['drugs'],
                        processed['context'],
                        ranked_results,
                        use_llm=use_llm,
                        label_hits=label_hits
                    )
                logger.log_response(response)
                
            except Exception as e:
                logger.log_error(
                    error_type=type(e).__name__,
                    error_message=str(e),
                    stage="main_processing"
                )
                raise
            finally:
                # Save log file
                log_filepath = logger.save_run()
                if log_filepath:
                    st.session_state.last_log_file = log_filepath
        
        # Display results
        display_results(response, processed)
    
    # Show sample cases in expander
    with st.expander("📋 View Sample FAERS Cases"):
        st.markdown("### Available Cases in Database")
        for i, case in enumerate(st.session_state.cases[:5], 1):
            st.markdown(f"""
            **Case {i}**: {', '.join(case.drugs)}
            - {case.age}yo {case.sex}, {case.outcome_severity}
            - {case.description[:150]}...
            """)

def display_results(response: dict, processed: dict):
    """Display formatted results"""
    
    # Risk Score Header
    risk_score = response['risk_score']
    risk_level = response['risk_level']
    
    # Color coding for risk
    if risk_score >= 8.0:
        color = "🔴"
        risk_color = "red"
    elif risk_score >= 5.0:
        color = "🟠"
        risk_color = "orange"
    elif risk_score >= 3.0:
        color = "🟡"
        risk_color = "yellow"
    else:
        color = "🟢"
        risk_color = "green"
    
    st.markdown("---")
    col1, col2, col3 = st.columns([2, 1, 1])
    
    with col1:
        st.markdown(f"### {color} RISK ASSESSMENT")
    
    with col2:
        st.metric("Risk Score", f"{risk_score:.1f}/10")
    
    with col3:
        st.metric("Risk Level", risk_level)
    
    # Extracted information
    st.markdown("---")
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### 🔍 Extracted Information")
        st.write(f"**Drugs Identified**: {', '.join(response['drugs']) if response['drugs'] else 'None'}")
        context = response['query_context']
        st.write(f"**Age**: {context.get('age', 'Not specified')}")
        st.write(f"**Sex**: {context.get('sex', 'Not specified')}")
        st.write(f"**Conditions**: {', '.join(context.get('conditions', [])) if context.get('conditions') else 'None'}")
    
    with col2:
        st.markdown("#### 📊 Search Results")
        st.write(f"**Total Matches**: {response['total_matches']}")
        if top_cases := response.get('top_cases'):
            st.write(f"**Top Cases Retrieved**: {len(top_cases)}")
    
    # Summary
    st.markdown("---")
    st.markdown("#### 📝 Clinical Summary")
    st.info(response['summary'])
    
    # Recommendations
    st.markdown("---")
    st.markdown("#### 💡 Recommendations")
    st.warning(response['recommendations'])
    
    # Drug Label Warnings (optional fusion)
    if response.get('label_hits'):
        st.markdown("---")
        st.markdown("#### 📋 Drug Label Warnings (DailyMed)")
        for hit in response['label_hits'][:5]:
            section = hit.get('section', 'Label')
            drugs = hit.get('drugs', [])
            text = hit.get('text', '')
            score = hit.get('score', 0)
            st.markdown(f"**{section}** — {', '.join(drugs[:3])} (similarity: {score:.2f})")
            st.caption(text[:500] + ("..." if len(text) > 500 else ""))
            st.markdown("")

    # Top Similar Cases
    st.markdown("---")
    st.markdown("#### 🏥 Similar Cases Retrieved")
    
    if response['top_cases']:
        for i, case_summary in enumerate(response['top_cases'][:5], 1):
            st.markdown(case_summary)
            if i < len(response['top_cases']):
                st.markdown("---")
    else:
        st.info("No similar cases found in database.")
    
    # Architecture diagram
    with st.expander("📐 System Architecture"):
        st.markdown("""
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
        │ Exact match │ │ + Cosine │ │ Actian VectorAI │
        │ (Baseline) │ │ Similarity│ │ DB (RAG) │
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
        """)

if __name__ == "__main__":
    main()

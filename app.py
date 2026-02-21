"""
Main Streamlit Application
Drug Interaction Risk Assessment System
"""
import streamlit as st
import numpy as np
from query_processor import QueryProcessor
from search_engines import V1KeywordSearch, V2TFIDFSearch, V3VectorSearch
from results_ranker import ResultsRanker
from response_generator import ResponseGenerator
from sample_data import get_sample_cases
from data_models import FAERSCase

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
    
    # Initialize search engines
    st.session_state.v1_search = V1KeywordSearch()
    
    st.session_state.v2_search = V2TFIDFSearch()
    st.session_state.v2_search.fit(st.session_state.cases)
    
    st.session_state.v3_search = V3VectorSearch(st.session_state.query_processor)
    st.session_state.v3_search.fit(st.session_state.cases)

def main():
    st.title("💊 Drug Interaction Risk Assessment System")
    st.markdown("### Analyze drug interaction risks using FAERS data and semantic search")
    
    # Sidebar for configuration
    with st.sidebar:
        st.header("⚙️ Configuration")
        search_version = st.selectbox(
            "Search Engine Version",
            ["V3: Vector Search (Recommended)", "V2: TFIDF + Cosine", "V1: Keyword Match"],
            index=0
        )
        
        use_llm = st.checkbox("Use LLM Summarization (Gemini)", value=True)
        
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
        
        with st.spinner("Processing query and searching cases..."):
            # Process query
            processed = st.session_state.query_processor.process_query(query)
            
            # Perform search based on version
            if "V3" in search_version:
                search_results = st.session_state.v3_search.search(
                    processed['embedding'], 
                    top_k=10
                )
            elif "V2" in search_version:
                search_results = st.session_state.v2_search.search(
                    processed['original_query'],
                    top_k=10
                )
            else:  # V1
                search_results = st.session_state.v1_search.search(
                    processed['drugs'],
                    st.session_state.cases,
                    top_k=10
                )
            
            # Rank results
            ranked_results = st.session_state.ranker.rank_results(
                search_results,
                processed['context']
            )
            
            # Generate response
            response = st.session_state.response_generator.format_full_response(
                query,
                processed['drugs'],
                processed['context'],
                ranked_results,
                use_llm=use_llm
            )
        
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

# Quick Start Guide

## 🚀 Getting Started in 3 Steps

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

**Note**: The first run will download the sentence transformer model (~90MB), which may take a few minutes.

### 2. (Optional) Set Up Gemini API
For LLM-powered summaries, create a `.env` file:
```
GEMINI_API_KEY=your_api_key_here
```

Get your API key from: https://makersuite.google.com/app/apikey

### 3. Run the Application
```bash
streamlit run app.py
```

The app will open in your browser at `http://localhost:8501`

## 📝 Example Queries to Try

1. **High Risk Example** (pre-filled):
   ```
   65-year-old female on warfarin and metformin, doctor wants to add ibuprofen
   ```

2. **Another Example**:
   ```
   70-year-old male with diabetes on metformin, prescribed naproxen for arthritis
   ```

3. **Test Different Scenarios**:
   ```
   55-year-old female on warfarin, needs aspirin for heart protection
   ```

## 🔍 Understanding the Results

- **Risk Score (1-10)**: Overall risk assessment
  - 8.0-10.0: 🔴 HIGH RISK
  - 5.0-7.9: 🟠 MODERATE RISK
  - 3.0-4.9: 🟡 LOW-MODERATE RISK
  - 1.0-2.9: 🟢 LOW RISK

- **Similar Cases**: Retrieved from FAERS database with similarity scores
- **Recommendations**: Clinical guidance based on findings

## 🛠️ Troubleshooting

**Issue**: "Module not found" errors
- **Solution**: Make sure all dependencies are installed: `pip install -r requirements.txt`

**Issue**: Gemini API errors
- **Solution**: The app works without Gemini API. LLM features are optional. You can disable them in the sidebar.

**Issue**: Slow first run
- **Solution**: The sentence transformer model downloads on first use (~90MB). Subsequent runs will be faster.

## 📊 Search Engine Comparison

- **V3 (Vector Search)**: Best semantic understanding, recommended for most queries
- **V2 (TFIDF)**: Good keyword-based matching, faster than V3
- **V1 (Keyword)**: Fastest, but only exact matches

Try the same query with different engines to see the difference!

# RxGuard Serverless Deployment Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy RxGuard frontend to Vercel and backend to Render, both on free tiers, using demo/sample data mode (no Actian DB).

**Architecture:** Static React build served from Vercel CDN. Vercel rewrites proxy `/api/*` requests to a Render-hosted FastAPI backend. Backend runs in a Docker container on Render free tier using sample data corpus.

**Tech Stack:** Vercel (frontend CDN), Render (Docker container), FastAPI, React/Vite

---

### Task 1: Create trimmed requirements file for Render

**Files:**
- Create: `requirements-render.txt`

**Step 1: Create `requirements-render.txt`**

This file excludes packages not needed for the API server in demo mode:
- Remove `actiancortex` (beta wheel, won't install on Render)
- Remove `streamlit` (alternative UI, not used)
- Remove `plotly` (Streamlit charts only)
- Remove `spacy` (not imported by api.py or its dependencies)
- Keep everything else

```txt
sentence-transformers>=2.2.2
scikit-learn>=1.3.0
numpy>=1.24.0
pandas>=2.0.0
google-genai>=1.0.0
python-dotenv>=1.0.0
grpcio>=1.68.1
protobuf>=5.29.2
pydantic>=2.10.4
requests>=2.31.0
tqdm
pyarrow
fastapi
uvicorn[standard]
```

**Step 2: Commit**

```bash
git add requirements-render.txt
git commit -m "add trimmed requirements for Render deployment"
```

---

### Task 2: Create Dockerfile for Render backend

**Files:**
- Create: `Dockerfile`

**Step 1: Create `Dockerfile`**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements-render.txt .
RUN pip install --no-cache-dir -r requirements-render.txt

# Pre-download the sentence-transformer model so startup is fast
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy application code
COPY api.py config.py query_processor.py search_engines.py results_ranker.py \
     response_generator.py sample_data.py data_models.py actian_vector_db.py \
     query_logger.py eval_search.py ./
COPY src/ ./src/

# Create data directories (empty — demo mode uses sample_data.py)
RUN mkdir -p data/raw data/processed logs

# Render sets PORT env var
ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn api:app --host 0.0.0.0 --port ${PORT}"]
```

**Step 2: Create `.dockerignore`**

```
.venv/
venv/
__pycache__/
*.pyc
frontend/
data/raw/*.json
data/processed/*.parquet
logs/
.git/
.env
*.egg-info/
notebooks/
docs/
tests/
.streamlit/
app.py
run_pipeline*.py
run_label_pipeline.py
docker-compose.yml
```

**Step 3: Test Docker build locally**

Run: `docker build -t rxguard-api .`
Expected: Build completes successfully.

Run: `docker run --rm -p 8000:8000 rxguard-api`
Expected: Server starts, logs show "RxGuard Initialising components" and loads cases.

Verify: `curl http://localhost:8000/api/health`
Expected: `{"status":"ok"}` or similar.

**Step 4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "add Dockerfile for Render deployment"
```

---

### Task 3: Create render.yaml for Render blueprint

**Files:**
- Create: `render.yaml`

**Step 1: Create `render.yaml`**

```yaml
services:
  - type: web
    name: rxguard-api
    runtime: docker
    plan: free
    healthCheckPath: /api/health
    envVars:
      - key: GEMINI_API_KEY
        sync: false
      - key: FDA_API_KEY
        sync: false
```

**Step 2: Commit**

```bash
git add render.yaml
git commit -m "add render.yaml for one-click Render deploy"
```

---

### Task 4: Create vercel.json for frontend deployment

**Files:**
- Create: `frontend/vercel.json`

**Step 1: Create `frontend/vercel.json`**

The rewrites proxy `/api/*` to the Render backend. The user will replace the destination URL after deploying to Render.

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://rxguard-api.onrender.com/api/:path*"
    }
  ]
}
```

Note: The Render URL (`rxguard-api.onrender.com`) will be known after Task 5. Update this file with the actual URL.

**Step 2: Commit**

```bash
cd frontend
git add vercel.json
git commit -m "add vercel.json with API rewrite to Render backend"
```

---

### Task 5: Deploy backend to Render

**Step 1: Push branch to GitHub**

```bash
git push origin rd-brach-v2
```

**Step 2: Deploy on Render**

1. Go to https://dashboard.render.com
2. Click "New" → "Web Service"
3. Connect the GitHub repo `gt12889/hacklytics2026`
4. Select branch `rd-brach-v2`
5. Render auto-detects Dockerfile — confirm settings:
   - Name: `rxguard-api`
   - Plan: Free
   - Health check path: `/api/health`
6. (Optional) Add env vars: `GEMINI_API_KEY` for LLM features
7. Click "Deploy"

**Step 3: Verify**

Wait for deploy to complete (~5-10 min for first build, model download).
Visit: `https://rxguard-api.onrender.com/api/health`
Expected: JSON health response.

Note the URL — needed for Task 6.

---

### Task 6: Deploy frontend to Vercel

**Step 1: Update `frontend/vercel.json` with actual Render URL**

Replace the placeholder URL with the actual Render service URL from Task 5.

**Step 2: Deploy on Vercel**

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import the GitHub repo `gt12889/hacklytics2026`
4. Configure:
   - Framework Preset: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Click "Deploy"

**Step 3: Verify end-to-end**

1. Visit the Vercel URL
2. Landing page loads
3. Navigate to search
4. Submit a query: "65-year-old female on warfarin, considering ibuprofen"
5. Results dashboard renders with data

---

### Task 7: Commit final state and push

**Step 1: Final commit with any URL updates**

```bash
git add -A
git commit -m "finalize deployment config with live URLs"
git push origin rd-brach-v2
```

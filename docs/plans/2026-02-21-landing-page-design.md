# RxGuard Hackathon Landing Page — Design

**Date:** 2026-02-21
**Audience:** Hackathon judges
**Location:** New `/` route in existing React app (Vite/React router)
**Branch:** `rd-branch`

## Overview

Single-page scroll experience showcasing RxGuard's technical architecture, real-world impact, and linking to the live demo. Uses scroll animations, animated stat counters, and an interactive architecture diagram.

## Page Sections

### 1. Hero (full viewport, dark bg #0D3D3A)

- RxGuard brand in Space Mono (matching existing app)
- Tagline: "Semantic Drug Interaction Intelligence"
- Subtitle: one-liner about searching 20M+ FDA adverse event reports with vector embeddings
- Three animated counters (count up on load):
  - 250K+ annual deaths from medication errors
  - 20M+ FAERS reports searchable
  - 50+ drug interaction pairs tracked
- CTA button: "Try the Live Demo" -> `/home`
- Brand palette: #0D3D3A, #2A7D6F, #E8EBE4

### 2. The Problem (light bg #E8EBE4, fade-in on scroll)

- Heading: "The Gap in Drug Safety"
- Two-column layout:
  - Left: 3-4 sentences on why keyword checkers (Epocrates, Lexicomp) fail — miss natural language narratives, brand/generic confusion, symptom-based signals
  - Right: visual comparison — "Keyword Search" vs "Semantic Search" with a sample query showing how keyword returns nothing while RxGuard finds relevant cases

### 3. Architecture Diagram (dark bg, interactive, centerpiece)

- Heading: "How It Works"
- CSS/JSX pipeline diagram (no external library):
  ```
  Query -> NLP Processor -> [V1 Keyword | V2 TF-IDF | V3 Vector] -> Ranker -> Results + EDA
  ```
- Each node is clickable, expands to show technical details:
  - NLP Processor: spaCy + regex drug extraction, sentence-transformer embeddings (384-dim)
  - V1: Exact drug name matching — baseline
  - V2: TF-IDF + cosine similarity — better recall
  - V3: Dense vector search with all-MiniLM-L6-v2 — semantic understanding
  - Ranker: Multi-signal scoring (semantic similarity x severity weight x demographic match)
- Animated connection lines between nodes
- Non-selected nodes dim when one is expanded

### 4. Search Engine Evolution + Metrics (light bg, slide-in on scroll)

- Heading: "From Keywords to Semantics"
- Three-column card progression: V1 -> V2 -> V3
  - Engine name + one-line description
  - Key metric value (P@5, NDCG@10) from eval pipeline
  - Color indicator: red -> yellow -> green
- Below cards: grouped bar chart (Recharts) comparing P@5, R@10, NDCG@10, MRR across engines

### 5. Tech Stack (light bg, grid)

- Heading: "Built With"
- 3-4 column grid of tech badges:
  - FastAPI, React + Vite, sentence-transformers, Actian VectorAI DB
  - Google Gemini, spaCy + scikit-learn, Recharts, pandas + PyArrow
- Clean pill/badge style matching brand

### 6. CTA Footer (dark bg matching hero)

- Heading: "See It In Action"
- Large CTA button: "Launch RxGuard" -> `/home`
- Team credits / hackathon name

## Technical Details

- **Scroll animations:** IntersectionObserver-based fade/slide-in (no library needed)
- **Animated counters:** Reuse pattern from existing `StatCard` component
- **Architecture diagram:** Pure CSS/JSX with flexbox positioning and CSS transitions
- **Metrics chart:** Recharts `BarChart` (already a dependency)
- **Router change:** Make `/` the landing page, keep `/home` as search, `/result` as dashboard

## Files to Create/Modify

| File | Action |
|------|--------|
| `frontend/src/LandingPage.jsx` | CREATE — new landing page component |
| `frontend/src/App.jsx` | EDIT — update router: `/` -> LandingPage, keep `/home` and `/result` |

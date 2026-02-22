# Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single-page scroll landing page at `/` that showcases RxGuard to hackathon judges with animated stats, an interactive architecture diagram, metrics comparison, and a CTA to the live demo.

**Architecture:** One new React component (`LandingPage.jsx`) using inline styles (matching existing codebase convention), IntersectionObserver for scroll animations, and Recharts for the metrics chart. Router updated so `/` shows the landing page.

**Tech Stack:** React 19, Recharts (already installed), CSS transitions, IntersectionObserver API

---

### Task 0: Create branch and scaffold

**Files:**
- Create: `frontend/src/LandingPage.jsx`
- Modify: `frontend/src/App.jsx`

**Step 1: Create the branch**

```bash
cd /home/gt120/projects/hacklytics2026
git checkout -b rd-branch
```

**Step 2: Create empty LandingPage component**

Create `frontend/src/LandingPage.jsx` with a minimal placeholder:

```jsx
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: "100vh", background: "#0D3D3A", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ fontFamily: "Space Mono, monospace" }}>RxGuard Landing Page</h1>
    </div>
  );
}
```

**Step 3: Update router**

Modify `frontend/src/App.jsx`:
- Add import: `import LandingPage from "./LandingPage";`
- Add route: `<Route path="/" element={<LandingPage />} />`
- Change catch-all: `<Route path="*" element={<Navigate to="/" replace />} />`

Final `App.jsx`:
```jsx
import { Routes, Route, Navigate } from "react-router-dom";
import SearchPage from "./SearchPage";
import RxGuardDashboard from "./rxguard_dashboard";
import LandingPage from "./LandingPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<SearchPage />} />
      <Route path="/result" element={<RxGuardDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

**Step 4: Verify in browser**

Open `http://localhost:5173/` — should show the placeholder.

**Step 5: Commit**

```bash
git add frontend/src/LandingPage.jsx frontend/src/App.jsx
git commit -m "feat: scaffold landing page route"
```

---

### Task 1: Hero section with animated counters

**Files:**
- Modify: `frontend/src/LandingPage.jsx`

**Step 1: Build the hero**

Replace placeholder in `LandingPage.jsx` with the full hero section:

- Full-viewport dark bg (`#0D3D3A`)
- Google Fonts import for Space Mono + DM Sans (same `<style>` block pattern used in `rxguard_dashboard.jsx` and `SearchPage.jsx`)
- Brand name "RXGUARD" in Space Mono, 64px, letter-spacing 6
- Tagline: "Semantic Drug Interaction Intelligence" in DM Sans, 20px
- Subtitle: "Searching 20M+ FDA adverse event reports with vector embeddings to catch interactions keyword checkers miss."
- Three animated stat counters using the same `useState`/`useEffect`/`setInterval` pattern from `StatCard` in `rxguard_dashboard.jsx:98-112`:
  - `250000` — "Annual medication error deaths"
  - `20000000` — "FAERS reports searchable"
  - `50` — "Drug interaction pairs tracked"
- Display counters with `+` suffix, formatted with `toLocaleString()`
- CTA button: "Try the Live Demo" — `onClick={() => navigate("/home")}`
- Button styled like existing CTA in `SearchPage.jsx:290-326`: green gradient, white text, rounded, shadow, hover lift

**Step 2: Verify in browser**

Open `http://localhost:5173/` — hero should fill the viewport, counters should animate up, CTA should navigate to `/home`.

**Step 3: Commit**

```bash
git add frontend/src/LandingPage.jsx
git commit -m "feat: landing page hero with animated counters"
```

---

### Task 2: Scroll animation hook + Problem section

**Files:**
- Modify: `frontend/src/LandingPage.jsx`

**Step 1: Add `useScrollReveal` hook**

Add inside `LandingPage.jsx` (above the component):

```jsx
function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, visible];
}
```

Add `useRef` to the React imports at the top of the file.

**Step 2: Build the Problem section**

Below the hero `div`, add a new section with `ref` from `useScrollReveal`:

- Light bg (`#E8EBE4`), padding `80px 48px`
- Apply fade-in: `opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(40px)", transition: "all 0.8s ease"`
- Heading: "The Gap in Drug Safety" — 32px, bold, `#0D3D3A`
- Two-column grid (`gridTemplateColumns: "1fr 1fr"`, gap 48):
  - **Left column:** 3-4 sentences explaining the problem:
    - "Current tools like Epocrates and Lexicomp rely on curated keyword lookup databases."
    - "They miss interactions described in natural language — brand/generic confusion, symptom-based signals like 'blood sugar crashed' meaning hypoglycemia."
    - "RxGuard searches real FDA adverse event narratives semantically, finding signals that keyword matchers can't."
  - **Right column:** Visual comparison card with two sub-cards side by side:
    - "Keyword Search" card (light red bg `#fdecea`): shows query "72yo on blood thinners + pain med" with result "0 results found"
    - "RxGuard" card (light green bg `#e8f5e9`): shows same query with result "Found: Warfarin + Ibuprofen — 1,532 FAERS cases, 47 deaths"

**Step 3: Verify in browser**

Scroll down from hero — problem section should fade in when entering viewport.

**Step 4: Commit**

```bash
git add frontend/src/LandingPage.jsx
git commit -m "feat: landing page problem section with scroll reveal"
```

---

### Task 3: Interactive architecture diagram

**Files:**
- Modify: `frontend/src/LandingPage.jsx`

**Step 1: Build the architecture section**

New section below Problem:

- Dark bg (`#0D3D3A`), padding `80px 48px`, scroll-reveal
- Heading: "How It Works" — white, 32px
- `const [activeNode, setActiveNode] = useState(null)` for tracking expanded node

Pipeline data as a const:
```jsx
const PIPELINE_NODES = [
  { id: "query", label: "Query", detail: "Natural language patient scenario with drugs, age, conditions" },
  { id: "nlp", label: "NLP Processor", detail: "spaCy + regex drug extraction, sentence-transformer embeddings (all-MiniLM-L6-v2, 384-dim)" },
  { id: "v1", label: "V1 Keyword", detail: "Exact drug name matching against case database — fast baseline" },
  { id: "v2", label: "V2 TF-IDF", detail: "TF-IDF vectorization + cosine similarity — captures term importance" },
  { id: "v3", label: "V3 Vector", detail: "Dense embedding search — full semantic understanding of clinical narratives" },
  { id: "ranker", label: "Ranker", detail: "Multi-signal: semantic similarity x severity weight (death=10x) x demographic match" },
  { id: "results", label: "Results + EDA", detail: "Ranked cases, risk score, Sphinx EDA charts, Gemini-powered clinical summary" },
];
```

Layout: horizontal flexbox with nodes as boxes connected by arrows (`→` character or CSS border arrows).

Each node:
- Rounded box, border `2px solid #2A7D6F`, padding 12px 20px
- Label in Space Mono, 13px, white
- `cursor: pointer`, `onClick={() => setActiveNode(activeNode === id ? null : id)}`
- When `activeNode !== null && activeNode !== id`: `opacity: 0.3` (dim non-selected)
- When `activeNode === id`: expand below with detail text, green left border, slide-down transition

Search engines (V1, V2, V3) grouped vertically in a sub-container between NLP and Ranker to show they're parallel options.

Connection arrows: thin lines or `→` characters between nodes, styled with `#2A7D6F`.

**Step 2: Verify in browser**

Scroll to architecture section. Click nodes — detail should expand, others dim. Click again to collapse.

**Step 3: Commit**

```bash
git add frontend/src/LandingPage.jsx
git commit -m "feat: landing page interactive architecture diagram"
```

---

### Task 4: Search evolution + metrics chart

**Files:**
- Modify: `frontend/src/LandingPage.jsx`

**Step 1: Add Recharts import**

Add at top of file:
```jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
```

**Step 2: Build the metrics section**

New section below architecture:

- Light bg (`#E8EBE4`), padding `80px 48px`, scroll-reveal
- Heading: "From Keywords to Semantics" — 32px, `#0D3D3A`

Three-column card progression:
```jsx
const ENGINES = [
  { name: "V1", subtitle: "Keyword Match", desc: "Exact drug name lookup", color: "#ef4444", metrics: { "P@5": 0.60, "R@10": 0.40, "NDCG@10": 0.52, "MRR": 0.72 } },
  { name: "V2", subtitle: "TF-IDF", desc: "Term frequency + cosine similarity", color: "#f59e0b", metrics: { "P@5": 0.72, "R@10": 0.55, "NDCG@10": 0.64, "MRR": 0.81 } },
  { name: "V3", subtitle: "Vector Search", desc: "Semantic embedding similarity", color: "#22c55e", metrics: { "P@5": 0.88, "R@10": 0.75, "NDCG@10": 0.82, "MRR": 0.94 } },
];
```

Each card: white bg, rounded 16, shadow, padding 24. Shows engine name (large, colored), subtitle, description, and headline metric (NDCG@10) in large bold text.

Below cards: Recharts grouped `BarChart`:
- Data: `["P@5", "R@10", "NDCG@10", "MRR"].map(m => ({ metric: m, V1: ..., V2: ..., V3: ... }))`
- Three bars per group, colored red/yellow/green
- YAxis domain `[0, 1]`, formatted as percentage
- Height 300, responsive container
- Same tooltip/legend styling as existing dashboard charts

**Note:** Use placeholder metric values for now. These can be updated with real eval output later by reading from `context-dump.md` or running `eval_search.py`.

**Step 3: Verify in browser**

Scroll to metrics section. Cards should be visible, chart should render with colored bars.

**Step 4: Commit**

```bash
git add frontend/src/LandingPage.jsx
git commit -m "feat: landing page search evolution metrics"
```

---

### Task 5: Tech stack grid + CTA footer

**Files:**
- Modify: `frontend/src/LandingPage.jsx`

**Step 1: Build tech stack section**

New section below metrics:

- Light bg (`#E8EBE4`), padding `80px 48px`, scroll-reveal
- Heading: "Built With" — 32px, `#0D3D3A`
- Grid: `gridTemplateColumns: "repeat(4, 1fr)"`, gap 16

Tech items:
```jsx
const TECH_STACK = [
  { name: "FastAPI", role: "Backend API" },
  { name: "React + Vite", role: "Frontend" },
  { name: "sentence-transformers", role: "Embeddings" },
  { name: "Actian VectorAI DB", role: "Vector Storage" },
  { name: "Google Gemini", role: "NLP Summaries" },
  { name: "spaCy + scikit-learn", role: "Text Processing" },
  { name: "Recharts", role: "Data Visualization" },
  { name: "pandas + PyArrow", role: "Data Pipeline" },
];
```

Each badge: white bg, rounded 12, padding 16, centered text. Name in bold 14px `#0D3D3A`, role in 12px `#888`.

**Step 2: Build CTA footer**

Final section:

- Dark bg (`#0D3D3A`), padding `80px 48px`, text-align center
- Heading: "See It In Action" — white, 32px
- Subtitle: "Search real FDA data for drug interaction risks" — `#aaa`, 16px
- Large CTA button: "Launch RxGuard" — green gradient, white, rounded, shadow (same style as hero CTA)
- Below button: team credit line — "Built for Hacklytics 2026" — `#666`, 13px, margin-top 40

**Step 3: Verify in browser**

Full scroll-through: Hero → Problem → Architecture → Metrics → Tech Stack → CTA. All sections animate in. Both CTAs navigate to `/home`.

**Step 4: Build dist**

```bash
cd /home/gt120/projects/hacklytics2026/frontend
npx vite build
```

**Step 5: Commit**

```bash
git add frontend/src/LandingPage.jsx
git commit -m "feat: landing page tech stack and CTA footer"
```

---

### Task 6: Final polish and push

**Files:**
- All landing page files

**Step 1: Full visual review**

Open `http://localhost:5173/` and scroll through entire page checking:
- [ ] Hero counters animate smoothly
- [ ] All scroll reveals trigger correctly
- [ ] Architecture nodes expand/collapse
- [ ] Metrics chart renders with correct colors
- [ ] Both CTA buttons navigate to `/home`
- [ ] Responsive on smaller viewports (no horizontal overflow)

**Step 2: Push branch**

```bash
git push -u origin rd-branch
```

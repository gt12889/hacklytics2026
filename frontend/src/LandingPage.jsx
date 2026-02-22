import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ── Scroll Reveal Hook ───────────────────────────────────────────────────────
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

// ── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ end, label }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let current = 0;
    const duration = 1200;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      current += step;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end]);

  return (
    <div style={{ textAlign: "center", minWidth: 180 }}>
      <div style={{
        fontSize: 42,
        fontWeight: 700,
        fontFamily: "Space Mono, monospace",
        color: "#2A7D6F",
        lineHeight: 1.2,
      }}>
        {count.toLocaleString()}+
      </div>
      <div style={{
        fontSize: 14,
        color: "#aaa",
        fontFamily: "DM Sans, sans-serif",
        marginTop: 6,
      }}>
        {label}
      </div>
    </div>
  );
}

// ── Pipeline Data ────────────────────────────────────────────────────────────
const PIPELINE_NODES = [
  { id: "query", label: "Query", detail: "Natural language patient scenario with drugs, age, conditions" },
  { id: "nlp", label: "NLP Processor", detail: "spaCy + regex drug extraction, sentence-transformer embeddings (all-MiniLM-L6-v2, 384-dim)" },
  { id: "v1", label: "V1 Keyword", detail: "Exact drug name matching against case database -- fast baseline" },
  { id: "v2", label: "V2 TF-IDF", detail: "TF-IDF vectorization + cosine similarity -- captures term importance" },
  { id: "v3", label: "V3 Vector", detail: "Dense embedding search -- full semantic understanding of clinical narratives" },
  { id: "ranker", label: "Ranker", detail: "Multi-signal: semantic similarity x severity weight (death=10x) x demographic match" },
  { id: "results", label: "Results + EDA", detail: "Ranked cases, risk score, Sphinx EDA charts, Gemini-powered clinical summary" },
];

// ── Engine Data ──────────────────────────────────────────────────────────────
const ENGINES = [
  { name: "V1", subtitle: "Keyword Match", desc: "Exact drug name lookup", color: "#ef4444", ndcg: 0.52 },
  { name: "V2", subtitle: "TF-IDF", desc: "Term frequency + cosine similarity", color: "#f59e0b", ndcg: 0.64 },
  { name: "V3", subtitle: "Vector Search", desc: "Semantic embedding similarity", color: "#22c55e", ndcg: 0.82 },
];

// ── Chart Data ───────────────────────────────────────────────────────────────
const METRIC_DATA = [
  { metric: "P@5", V1: 0.60, V2: 0.72, V3: 0.88 },
  { metric: "R@10", V1: 0.40, V2: 0.55, V3: 0.75 },
  { metric: "NDCG@10", V1: 0.52, V2: 0.64, V3: 0.82 },
  { metric: "MRR", V1: 0.72, V2: 0.81, V3: 0.94 },
];

// ── Tech Stack Items ─────────────────────────────────────────────────────────
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

// ── Main Component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [activeNode, setActiveNode] = useState(null);

  // Scroll reveal hooks — one per section
  const [problemRef, problemVisible] = useScrollReveal();
  const [archRef, archVisible] = useScrollReveal();
  const [metricsRef, metricsVisible] = useScrollReveal();
  const [techRef, techVisible] = useScrollReveal();
  const [ctaRef, ctaVisible] = useScrollReveal();

  const fadeStyle = (visible) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "none" : "translateY(40px)",
    transition: "all 0.8s ease",
  });

  const ctaButtonStyle = {
    background: "linear-gradient(135deg, #2A7D6F, #0D3D3A)",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "16px 36px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
    boxShadow: "0 4px 14px rgba(42,125,111,0.35)",
    transition: "all 0.2s",
    letterSpacing: 0.5,
  };

  // Architecture diagram helpers
  const nodeStyle = (id) => ({
    border: "2px solid #2A7D6F",
    borderRadius: 10,
    padding: "12px 20px",
    fontFamily: "Space Mono, monospace",
    fontSize: 13,
    color: "white",
    cursor: "pointer",
    textAlign: "center",
    transition: "opacity 0.3s ease, background 0.3s ease",
    opacity: activeNode && activeNode !== id ? 0.3 : 1,
    background: activeNode === id ? "rgba(42,125,111,0.25)" : "transparent",
    position: "relative",
  });

  const arrowStyle = {
    color: "#2A7D6F",
    fontSize: 22,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    userSelect: "none",
    opacity: activeNode ? 0.3 : 1,
    transition: "opacity 0.3s ease",
  };

  function renderNode(node) {
    return (
      <div key={node.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={nodeStyle(node.id)}
          onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
        >
          {node.label}
        </div>
        <div style={{
          maxHeight: activeNode === node.id ? 120 : 0,
          overflow: "hidden",
          transition: "max-height 0.4s ease, opacity 0.4s ease",
          opacity: activeNode === node.id ? 1 : 0,
        }}>
          <div style={{
            marginTop: 10,
            borderLeft: "3px solid #2A7D6F",
            paddingLeft: 12,
            fontSize: 12,
            color: "#ccc",
            fontFamily: "DM Sans, sans-serif",
            lineHeight: 1.6,
            maxWidth: 220,
          }}>
            {node.detail}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", overflowX: "hidden", overflowY: "auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════════
          Section 1: Hero
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        minHeight: "100vh",
        background: "#0D3D3A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 48px",
        textAlign: "center",
      }}>
        <div style={{ animation: "slideUp 0.6s ease both" }}>
          <h1 style={{
            fontFamily: "Space Mono, monospace",
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "white",
            marginBottom: 16,
            lineHeight: 1.1,
          }}>
            RXGUARD
          </h1>
          <p style={{
            fontSize: 20,
            color: "#2A7D6F",
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 500,
            marginBottom: 16,
          }}>
            Semantic Drug Interaction Intelligence
          </p>
          <p style={{
            fontSize: 16,
            color: "#aaa",
            maxWidth: 620,
            margin: "0 auto 48px",
            lineHeight: 1.7,
          }}>
            Searching 20M+ FDA adverse event reports with vector embeddings to catch interactions keyword checkers miss.
          </p>
        </div>

        <div style={{
          display: "flex",
          gap: 56,
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: 48,
          animation: "slideUp 0.6s ease 0.2s both",
        }}>
          <AnimatedCounter end={250000} label="Annual medication error deaths" />
          <AnimatedCounter end={20000000} label="FAERS reports searchable" />
          <AnimatedCounter end={50} label="Drug interaction pairs tracked" />
        </div>

        <div style={{ animation: "slideUp 0.6s ease 0.4s both" }}>
          <button
            onClick={() => navigate("/home")}
            style={ctaButtonStyle}
            onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(42,125,111,0.45)"; }}
            onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(42,125,111,0.35)"; }}
          >
            Try the Live Demo
          </button>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          Section 2: Problem
      ════════════════════════════════════════════════════════════════════ */}
      <section
        ref={problemRef}
        style={{
          background: "#E8EBE4",
          padding: "96px 48px",
          ...fadeStyle(problemVisible),
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#0D3D3A",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 48,
            textAlign: "center",
          }}>
            The Gap in Drug Safety
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 48,
            alignItems: "start",
          }}>
            {/* Left: explanatory text */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ fontSize: 15, color: "#333", lineHeight: 1.8 }}>
                Traditional drug interaction databases rely on keyword matching -- exact drug names must appear in the query for a match. But clinicians and patients rarely describe medications that way. A question about "blood thinners and pain medication" returns nothing, even when thousands of Warfarin + Ibuprofen adverse events exist in the FDA database.
              </p>
              <p style={{ fontSize: 15, color: "#333", lineHeight: 1.8 }}>
                Brand names versus generic names create another blind spot. Patients say "Advil" while the database indexes "Ibuprofen." They mention "Coumadin" when records list "Warfarin." Keyword systems cannot bridge this gap without exhaustive synonym tables that are never complete.
              </p>
              <p style={{ fontSize: 15, color: "#333", lineHeight: 1.8 }}>
                Symptom-based signals are lost entirely. When a patient describes "easy bruising and dark stools after starting a new painkiller," keyword search has no mechanism to connect these clinical signs to known hemorrhagic adverse events. Semantic search understands the clinical meaning and surfaces the relevant cases.
              </p>
            </div>

            {/* Right: comparison cards */}
            <div style={{ display: "flex", gap: 20 }}>
              {/* Keyword Search card */}
              <div style={{
                flex: 1,
                background: "#fdecea",
                borderRadius: 14,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}>
                <div style={{
                  fontFamily: "Space Mono, monospace",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0D3D3A",
                }}>
                  Keyword Search
                </div>
                <div style={{
                  background: "white",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontSize: 13,
                  color: "#555",
                  lineHeight: 1.6,
                  fontFamily: "DM Sans, sans-serif",
                }}>
                  "72yo on blood thinners + pain med"
                </div>
                <div style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#d32f2f",
                  fontFamily: "DM Sans, sans-serif",
                }}>
                  0 results found
                </div>
              </div>

              {/* RxGuard card */}
              <div style={{
                flex: 1,
                background: "#e8f5e9",
                borderRadius: 14,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}>
                <div style={{
                  fontFamily: "Space Mono, monospace",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#0D3D3A",
                }}>
                  RxGuard
                </div>
                <div style={{
                  background: "white",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontSize: 13,
                  color: "#555",
                  lineHeight: 1.6,
                  fontFamily: "DM Sans, sans-serif",
                }}>
                  "72yo on blood thinners + pain med"
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#2e7d32",
                  fontFamily: "DM Sans, sans-serif",
                  lineHeight: 1.5,
                }}>
                  Found: Warfarin + Ibuprofen — 1,532 FAERS cases
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          Section 3: Architecture Diagram
      ════════════════════════════════════════════════════════════════════ */}
      <section
        ref={archRef}
        style={{
          background: "#0D3D3A",
          padding: "96px 48px",
          ...fadeStyle(archVisible),
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{
            fontSize: 32,
            fontWeight: 700,
            color: "white",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 56,
            textAlign: "center",
          }}>
            How It Works
          </h2>

          {/* Pipeline flow */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            flexWrap: "wrap",
          }}>
            {/* Query */}
            {renderNode(PIPELINE_NODES[0])}
            <div style={arrowStyle}>&rarr;</div>

            {/* NLP Processor */}
            {renderNode(PIPELINE_NODES[1])}
            <div style={arrowStyle}>&rarr;</div>

            {/* V1 / V2 / V3 stacked */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
              {renderNode(PIPELINE_NODES[2])}
              {renderNode(PIPELINE_NODES[3])}
              {renderNode(PIPELINE_NODES[4])}
            </div>
            <div style={arrowStyle}>&rarr;</div>

            {/* Ranker */}
            {renderNode(PIPELINE_NODES[5])}
            <div style={arrowStyle}>&rarr;</div>

            {/* Results + EDA */}
            {renderNode(PIPELINE_NODES[6])}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          Section 4: Metrics
      ════════════════════════════════════════════════════════════════════ */}
      <section
        ref={metricsRef}
        style={{
          background: "#E8EBE4",
          padding: "96px 48px",
          ...fadeStyle(metricsVisible),
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#0D3D3A",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 48,
            textAlign: "center",
          }}>
            From Keywords to Semantics
          </h2>

          {/* Engine cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 24,
            marginBottom: 48,
          }}>
            {ENGINES.map(eng => (
              <div key={eng.name} style={{
                background: "white",
                borderRadius: 16,
                boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
                padding: 24,
                textAlign: "center",
              }}>
                <div style={{
                  fontSize: 28,
                  fontWeight: 700,
                  fontFamily: "Space Mono, monospace",
                  color: eng.color,
                  marginBottom: 4,
                }}>
                  {eng.name}
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#0D3D3A",
                  marginBottom: 6,
                }}>
                  {eng.subtitle}
                </div>
                <div style={{
                  fontSize: 13,
                  color: "#888",
                  marginBottom: 20,
                  lineHeight: 1.5,
                }}>
                  {eng.desc}
                </div>
                <div style={{
                  fontSize: 13,
                  color: "#aaa",
                  fontWeight: 500,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}>
                  NDCG@10
                </div>
                <div style={{
                  fontSize: 36,
                  fontWeight: 700,
                  fontFamily: "Space Mono, monospace",
                  color: eng.color,
                }}>
                  {(eng.ndcg * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div style={{
            background: "white",
            borderRadius: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
            padding: 24,
          }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={METRIC_DATA} margin={{ left: 0, right: 20, top: 8, bottom: 8 }}>
                <XAxis dataKey="metric" tick={{ fontSize: 12, fill: "#555" }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#aaa" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 1]}
                  tickFormatter={v => `${(v * 100).toFixed(0)}%`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }}
                  formatter={(v, name) => [`${(v * 100).toFixed(1)}%`, name]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 11, color: "#555" }}>{v}</span>}
                />
                <Bar dataKey="V1" fill="#ef4444" name="V1 Keyword" radius={[4, 4, 0, 0]} />
                <Bar dataKey="V2" fill="#f59e0b" name="V2 TF-IDF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="V3" fill="#22c55e" name="V3 Vector" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          Section 5: Tech Stack
      ════════════════════════════════════════════════════════════════════ */}
      <section
        ref={techRef}
        style={{
          background: "#E8EBE4",
          padding: "0 48px 96px",
          ...fadeStyle(techVisible),
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#0D3D3A",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 40,
            textAlign: "center",
          }}>
            Built With
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 16,
          }}>
            {TECH_STACK.map(item => (
              <div key={item.name} style={{
                background: "white",
                borderRadius: 12,
                padding: 16,
                textAlign: "center",
                boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#0D3D3A",
                  fontFamily: "DM Sans, sans-serif",
                  marginBottom: 4,
                }}>
                  {item.name}
                </div>
                <div style={{
                  fontSize: 12,
                  color: "#888",
                  fontFamily: "DM Sans, sans-serif",
                }}>
                  {item.role}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          Section 6: CTA Footer
      ════════════════════════════════════════════════════════════════════ */}
      <section
        ref={ctaRef}
        style={{
          background: "#0D3D3A",
          padding: "80px 48px",
          textAlign: "center",
          ...fadeStyle(ctaVisible),
        }}
      >
        <h2 style={{
          fontSize: 32,
          fontWeight: 700,
          color: "white",
          fontFamily: "DM Sans, sans-serif",
          marginBottom: 16,
        }}>
          See It In Action
        </h2>
        <p style={{
          fontSize: 16,
          color: "#aaa",
          marginBottom: 36,
          lineHeight: 1.6,
        }}>
          Search real FDA data for drug interaction risks
        </p>
        <button
          onClick={() => navigate("/home")}
          style={ctaButtonStyle}
          onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(42,125,111,0.45)"; }}
          onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(42,125,111,0.35)"; }}
        >
          Launch RxGuard
        </button>
        <div style={{
          marginTop: 40,
          fontSize: 13,
          color: "#666",
          fontFamily: "DM Sans, sans-serif",
        }}>
          Built for Hacklytics 2026
        </div>
      </section>
    </div>
  );
}

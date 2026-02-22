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
  { name: "V1", subtitle: "Keyword Match", desc: "Exact drug name lookup", color: "#d32f2f", ndcg: 0.52 },
  { name: "V2", subtitle: "TF-IDF", desc: "Term frequency + cosine similarity", color: "#f57f17", ndcg: 0.64 },
  { name: "V3", subtitle: "Vector Search", desc: "Semantic embedding similarity", color: "#2A7D6F", ndcg: 0.82 },
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
    transition: "all 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
  });

  const ctaButtonStyle = {
    background: "linear-gradient(135deg, #2A7D6F, #0D3D3A)",
    color: "white",
    border: "none",
    borderRadius: "4rem",
    padding: "18px 44px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
    boxShadow: "0 4px 20px rgba(42,125,111,0.35)",
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    letterSpacing: 0.5,
  };

  const ctaSecondaryStyle = {
    background: "transparent",
    color: "rgba(255,255,255,0.8)",
    border: "1px solid rgba(255,255,255,0.25)",
    borderRadius: "4rem",
    padding: "16px 36px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "DM Sans, sans-serif",
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    letterSpacing: 0.5,
  };

  // Architecture diagram helpers
  const nodeStyle = (id) => ({
    border: activeNode === id ? "2px solid #2A7D6F" : "2px solid #c4d9d6",
    borderRadius: 12,
    padding: "14px 22px",
    fontFamily: "Space Mono, monospace",
    fontSize: 12,
    color: activeNode === id ? "white" : "rgba(255,255,255,0.85)",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    opacity: activeNode && activeNode !== id ? 0.3 : 1,
    background: activeNode === id ? "rgba(42,125,111,0.3)" : "rgba(255,255,255,0.05)",
    position: "relative",
    letterSpacing: 0.5,
  });

  const arrowStyle = {
    color: "#c4d9d6",
    fontSize: 20,
    fontWeight: 400,
    display: "flex",
    alignItems: "center",
    userSelect: "none",
    opacity: activeNode ? 0.2 : 0.6,
    transition: "opacity 0.3s ease",
  };

  function renderNode(node) {
    return (
      <div key={node.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div
          style={nodeStyle(node.id)}
          onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
          onMouseOver={e => { if (activeNode !== node.id) e.currentTarget.style.borderColor = "#2A7D6F"; }}
          onMouseOut={e => { if (activeNode !== node.id) e.currentTarget.style.borderColor = "#c4d9d6"; }}
        >
          {node.label}
        </div>
        <div style={{
          maxHeight: activeNode === node.id ? 140 : 0,
          overflow: "hidden",
          transition: "max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease",
          opacity: activeNode === node.id ? 1 : 0,
        }}>
          <div style={{
            marginTop: 12,
            borderLeft: "3px solid #2A7D6F",
            paddingLeft: 12,
            fontSize: 12,
            color: "rgba(255,255,255,0.6)",
            fontFamily: "DM Sans, sans-serif",
            lineHeight: 1.7,
            maxWidth: 220,
          }}>
            {node.detail}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", overflowX: "hidden", background: "#E8EBE4" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #E8EBE4; }
        ::-webkit-scrollbar-thumb { background: #c4d9d6; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #2A7D6F; }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════════
          Section 1: Hero
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0D3D3A 0%, #164a46 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 48px",
        textAlign: "center",
        position: "relative",
      }}>
        <div style={{ animation: "slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both", position: "relative", zIndex: 1 }}>
          <div style={{
            fontSize: 12,
            color: "#c4d9d6",
            fontFamily: "Space Mono, monospace",
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 24,
            animation: "fadeIn 1s ease 0.3s both",
          }}>
            Hacklytics 2026
          </div>
          <h1 style={{
            fontFamily: "Space Mono, monospace",
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "white",
            marginBottom: 20,
            lineHeight: 1.1,
          }}>
            RXGUARD
          </h1>
          <p style={{
            fontSize: 18,
            color: "#c4d9d6",
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 500,
            marginBottom: 20,
            letterSpacing: 1,
          }}>
            Semantic Drug Interaction Intelligence
          </p>
          <p style={{
            fontSize: 15,
            color: "rgba(255,255,255,0.55)",
            maxWidth: 560,
            margin: "0 auto 56px",
            lineHeight: 1.8,
          }}>
            Searching 20M+ FDA adverse event reports with vector embeddings to catch interactions keyword checkers miss.
          </p>
        </div>

        <div style={{ animation: "slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both", display: "flex", gap: 16, position: "relative", zIndex: 1 }}>
          <button
            onClick={() => navigate("/home")}
            style={ctaButtonStyle}
            onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(42,125,111,0.5)"; }}
            onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(42,125,111,0.35)"; }}
          >
            Try the Live Demo
          </button>
          <button
            onClick={() => {
              document.getElementById("problem-section")?.scrollIntoView({ behavior: "smooth" });
            }}
            style={ctaSecondaryStyle}
            onMouseOver={e => { e.currentTarget.style.borderColor = "#c4d9d6"; e.currentTarget.style.color = "white"; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
          >
            Learn More
          </button>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: "absolute",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          animation: "pulse 2s ease-in-out infinite",
        }}>
          <div style={{
            width: 24,
            height: 40,
            borderRadius: 12,
            border: "1.5px solid rgba(255,255,255,0.2)",
            display: "flex",
            justifyContent: "center",
            paddingTop: 8,
          }}>
            <div style={{
              width: 3,
              height: 8,
              borderRadius: 2,
              background: "#c4d9d6",
            }} />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          Section 2: Problem
      ════════════════════════════════════════════════════════════════════ */}
      <section
        id="problem-section"
        ref={problemRef}
        style={{
          background: "#E8EBE4",
          padding: "120px 48px",
          ...fadeStyle(problemVisible),
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            fontSize: 11,
            color: "#2A7D6F",
            fontFamily: "Space Mono, monospace",
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 16,
            textAlign: "center",
          }}>
            The Problem
          </div>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            color: "#0D3D3A",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 56,
            textAlign: "center",
          }}>
            The Gap in Drug Safety
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 56,
            alignItems: "start",
          }}>
            {/* Left: explanatory text */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <p style={{ fontSize: 15, color: "#333", lineHeight: 1.9 }}>
                Traditional drug interaction databases rely on keyword matching — exact drug names must appear in the query for a match. But clinicians and patients rarely describe medications that way. A question about "blood thinners and pain medication" returns nothing, even when thousands of adverse events exist in the FDA database.
              </p>
              <p style={{ fontSize: 15, color: "#333", lineHeight: 1.9 }}>
                Brand names versus generic names create another blind spot. Patients say "Advil" while the database indexes "Ibuprofen." Keyword systems cannot bridge this gap without exhaustive synonym tables that are never complete.
              </p>
              <p style={{ fontSize: 15, color: "#333", lineHeight: 1.9 }}>
                Symptom-based signals are lost entirely. When a patient describes "easy bruising and dark stools," keyword search has no mechanism to connect these clinical signs to known hemorrhagic adverse events. <span style={{ color: "#2A7D6F", fontWeight: 600 }}>Semantic search understands the clinical meaning.</span>
              </p>
            </div>

            {/* Right: comparison cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Keyword Search card */}
              <div style={{
                background: "#fdecea",
                borderRadius: 16,
                padding: 28,
                border: "1px solid #f5c6cb",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#d32f2f",
                  }} />
                  <div style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0D3D3A",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}>
                    Keyword Search
                  </div>
                </div>
                <div style={{
                  background: "white",
                  borderRadius: 10,
                  padding: "14px 16px",
                  fontSize: 13,
                  color: "#555",
                  lineHeight: 1.6,
                  fontFamily: "Space Mono, monospace",
                }}>
                  "72yo on blood thinners + pain med"
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#d32f2f",
                  fontFamily: "DM Sans, sans-serif",
                }}>
                  0 results found
                </div>
              </div>

              {/* RxGuard card */}
              <div style={{
                background: "#e8f5e9",
                borderRadius: 16,
                padding: 28,
                border: "1px solid #c4d9d6",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#2A7D6F",
                  }} />
                  <div style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0D3D3A",
                    letterSpacing: 1,
                    textTransform: "uppercase",
                  }}>
                    RxGuard Semantic
                  </div>
                </div>
                <div style={{
                  background: "white",
                  borderRadius: 10,
                  padding: "14px 16px",
                  fontSize: 13,
                  color: "#555",
                  lineHeight: 1.6,
                  fontFamily: "Space Mono, monospace",
                }}>
                  "72yo on blood thinners + pain med"
                </div>
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#2e7d32",
                  fontFamily: "DM Sans, sans-serif",
                  lineHeight: 1.6,
                }}>
                  Found: Warfarin + Ibuprofen — 1,532 FAERS cases, 47 deaths
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
          padding: "120px 48px",
          position: "relative",
          ...fadeStyle(archVisible),
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{
            fontSize: 11,
            color: "#c4d9d6",
            fontFamily: "Space Mono, monospace",
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 16,
            textAlign: "center",
          }}>
            Architecture
          </div>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            color: "white",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 16,
            textAlign: "center",
          }}>
            How It Works
          </h2>
          <p style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.45)",
            textAlign: "center",
            marginBottom: 64,
          }}>
            Click any node to explore the technical details
          </p>

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
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              alignItems: "center",
              padding: "16px 12px",
              border: "1px solid rgba(196,217,214,0.2)",
              borderRadius: 16,
              background: "rgba(42,125,111,0.08)",
            }}>
              <div style={{
                fontSize: 9,
                color: "#c4d9d6",
                fontFamily: "Space Mono, monospace",
                letterSpacing: 2,
                textTransform: "uppercase",
                marginBottom: 4,
              }}>
                Search Engines
              </div>
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
          padding: "120px 48px",
          ...fadeStyle(metricsVisible),
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            fontSize: 11,
            color: "#2A7D6F",
            fontFamily: "Space Mono, monospace",
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 16,
            textAlign: "center",
          }}>
            Performance
          </div>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            color: "#0D3D3A",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 56,
            textAlign: "center",
          }}>
            From Keywords to Semantics
          </h2>

          {/* Engine cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 20,
            marginBottom: 48,
          }}>
            {ENGINES.map(eng => (
              <div key={eng.name} style={{
                background: "white",
                border: "3px solid #0D3D3A",
                borderRadius: 20,
                padding: 32,
                textAlign: "center",
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              }}>
                <div style={{
                  fontSize: 32,
                  fontWeight: 700,
                  fontFamily: "Space Mono, monospace",
                  color: eng.color,
                  marginBottom: 6,
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
                  marginBottom: 24,
                  lineHeight: 1.5,
                }}>
                  {eng.desc}
                </div>
                <div style={{
                  fontSize: 10,
                  color: "#aaa",
                  fontWeight: 500,
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: 2,
                  fontFamily: "Space Mono, monospace",
                }}>
                  NDCG@10
                </div>
                <div style={{
                  fontSize: 40,
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
            borderRadius: 20,
            boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
            padding: 32,
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
                  contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", fontSize: 12 }}
                  formatter={(v, name) => [`${(v * 100).toFixed(1)}%`, name]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 11, color: "#555" }}>{v}</span>}
                />
                <Bar dataKey="V1" fill="#d32f2f" name="V1 Keyword" radius={[6, 6, 0, 0]} />
                <Bar dataKey="V2" fill="#f57f17" name="V2 TF-IDF" radius={[6, 6, 0, 0]} />
                <Bar dataKey="V3" fill="#2A7D6F" name="V3 Vector" radius={[6, 6, 0, 0]} />
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
          padding: "0 48px 120px",
          ...fadeStyle(techVisible),
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            fontSize: 11,
            color: "#2A7D6F",
            fontFamily: "Space Mono, monospace",
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 16,
            textAlign: "center",
          }}>
            Stack
          </div>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            color: "#0D3D3A",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 48,
            textAlign: "center",
          }}>
            Built With
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 12,
          }}>
            {TECH_STACK.map(item => (
              <div key={item.name} style={{
                background: "white",
                border: "1px solid #c4d9d6",
                borderRadius: 14,
                padding: "20px 16px",
                textAlign: "center",
                transition: "all 0.3s ease",
                cursor: "default",
                boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = "#2A7D6F"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(42,125,111,0.15)"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = "#c4d9d6"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)"; }}
              >
                <div style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#0D3D3A",
                  fontFamily: "DM Sans, sans-serif",
                  marginBottom: 6,
                }}>
                  {item.name}
                </div>
                <div style={{
                  fontSize: 11,
                  color: "#888",
                  fontFamily: "Space Mono, monospace",
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
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
          padding: "120px 48px 80px",
          textAlign: "center",
          ...fadeStyle(ctaVisible),
        }}
      >
        <h2 style={{
          fontSize: 40,
          fontWeight: 700,
          color: "white",
          fontFamily: "DM Sans, sans-serif",
          marginBottom: 16,
        }}>
          See It In Action
        </h2>
        <p style={{
          fontSize: 15,
          color: "rgba(255,255,255,0.55)",
          marginBottom: 44,
          lineHeight: 1.6,
        }}>
          Search real FDA data for drug interaction risks
        </p>
        <button
          onClick={() => navigate("/home")}
          style={{ ...ctaButtonStyle, padding: "20px 52px", fontSize: 16 }}
          onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(42,125,111,0.5)"; }}
          onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(42,125,111,0.35)"; }}
        >
          Launch RxGuard
        </button>
        <div style={{
          marginTop: 64,
          paddingTop: 32,
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}>
          <div style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.35)",
            fontFamily: "Space Mono, monospace",
            letterSpacing: 2,
          }}>
            Built for Hacklytics 2026
          </div>
        </div>
      </section>
    </div>
  );
}

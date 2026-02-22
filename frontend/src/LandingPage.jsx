import { useState, useEffect, useRef, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectCoverflow, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-coverflow";
import "swiper/css/navigation";
import FluidGlass from "./FluidGlass";

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
  { name: "V1", subtitle: "Keyword Match", desc: "Exact drug name lookup", color: "#0D3D3A" },
  { name: "V2", subtitle: "TF-IDF", desc: "Term frequency + cosine similarity", color: "#1A5C53" },
  { name: "V3", subtitle: "Vector Search", desc: "Semantic embedding similarity", color: "#2A7D6F" },
];

// ── Chart Data ───────────────────────────────────────────────────────────────
const METRIC_DATA = [
  { metric: "P@5", V1: 0.60, V2: 0.72, V3: 0.88 },
  { metric: "R@10", V1: 0.40, V2: 0.55, V3: 0.75 },
];

// ── Case Study Previews ──────────────────────────────────────────────────────
const CASE_PREVIEWS = [
  { name: "Vioxx", generic: "Rofecoxib", class: "COX-2 Inhibitor", years: "1999 → 2004", impact: "88,000–140,000 excess heart attacks", color: "#D4B896" },
  { name: "Baycol", generic: "Cerivastatin", class: "Statin", years: "1997 → 2001", impact: "52 deaths worldwide", color: "#C9B99A" },
  { name: "Darvocet", generic: "Propoxyphene", class: "Opioid Analgesic", years: "1957 → 2010", impact: "Deaths dropped 84% after withdrawal", color: "#DECCA8" },
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
  const [caseRef, caseVisible] = useScrollReveal();
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
    border: activeNode === id ? "3px solid #2A7D6F" : "3px solid #c4d9d6",
    borderRadius: 16,
    padding: "21px 33px",
    fontFamily: "Space Mono, monospace",
    fontSize: 18,
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
    fontSize: 60,
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
          maxHeight: activeNode === node.id ? 180 : 0,
          overflow: "hidden",
          transition: "max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease",
          opacity: activeNode === node.id ? 1 : 0,
        }}>
          <div style={{
            marginTop: 14,
            borderLeft: "3px solid #2A7D6F",
            paddingLeft: 14,
            fontSize: 14,
            color: "rgba(255,255,255,0.6)",
            fontFamily: "DM Sans, sans-serif",
            lineHeight: 1.7,
            maxWidth: 260,
          }}>
            {node.detail}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", overflowX: "clip", background: "#E8EBE4" }}>
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
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(12px); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #E8EBE4; }
        ::-webkit-scrollbar-thumb { background: #c4d9d6; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #2A7D6F; }
        .swiper-pagination-bullet { background: #c4d9d6; opacity: 0.4; }
        .swiper-pagination-bullet-active { background: #2A7D6F; opacity: 1; }
        .swiper-button-prev, .swiper-button-next { color: #2A7D6F; }
        .swiper-button-prev::after, .swiper-button-next::after { font-size: 20px; }
        .swiper { touch-action: auto !important; }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════════
          Section 1: Hero
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        height: "100vh",
        maxHeight: "100vh",
        boxSizing: "border-box",
        background: "linear-gradient(90deg, #E8EBE4 0%, #E8EBE4 50%, #0D3D3A 50%, #0D3D3A 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 48px 60px 48px",
        position: "relative",
        overflow: "clip",
      }}>
        {/* Two-column layout: text left, video right */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          gap: 48,
          position: "relative",
          zIndex: 1,
        }}>
          {/* Left column — text + CTAs */}
          <div style={{ flex: "1 1 50%", minWidth: 0 }}>
            <div style={{ animation: "slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
              <div style={{
                fontSize: 17,
                color: "#2A7D6F",
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
                fontSize: 92,
                fontWeight: 700,
                letterSpacing: 8,
                textTransform: "uppercase",
                color: "#0D3D3A",
                marginBottom: 20,
                lineHeight: 1.1,
              }}>
                RXGUARD
              </h1>
              <p style={{
                fontSize: 26,
                color: "#1A5C53",
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 500,
                marginBottom: 20,
                letterSpacing: 1,
              }}>
                Semantic Drug Interaction Intelligence
              </p>
              <p style={{
                fontSize: 22,
                color: "rgba(13,61,58,0.55)",
                maxWidth: 480,
                marginBottom: 48,
                lineHeight: 1.8,
              }}>
                Searching 20M+ FDA adverse event reports with vector embeddings to catch interactions keyword checkers miss.
              </p>
            </div>

            <div style={{ animation: "slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both" }}>
              <button
                onClick={() => navigate("/home")}
                style={ctaButtonStyle}
                onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(42,125,111,0.5)"; }}
                onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(42,125,111,0.35)"; }}
              >
                Try the Live Demo
              </button>
            </div>
          </div>

          {/* Right column — video */}
          <div style={{ flex: "1 1 50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            width: "min(572px, 46vw)",
            height: "min(572px, 46vw)",
            borderRadius: 24,
            background: "transparent",
            border: "none",
            padding: 0,
            animation: "fadeIn 1.2s ease 0.4s both",
          }}>
            <div style={{
              width: "100%",
              height: "100%",
              borderRadius: 24,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              WebkitMaskImage: "radial-gradient(ellipse 65% 65% at center, black 35%, transparent 85%)",
              maskImage: "radial-gradient(ellipse 65% 65% at center, black 35%, transparent 85%)",
            }}>
              <video
                src="/hero_bg.mp4"
                autoPlay
                loop
                muted
                playsInline
                onTimeUpdate={e => { if (e.target.currentTime >= 5) e.target.currentTime = 0; }}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  pointerEvents: "none",
                  display: "block",
                }}
              />
            </div>
          </div>
          </div>
        </div>

        {/* Bouncing scroll arrow */}
        <div
          onClick={() => document.getElementById("problem-section")?.scrollIntoView({ behavior: "smooth" })}
          style={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            animation: "bounce 1.5s ease-in-out infinite",
            cursor: "pointer",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2A7D6F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
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

            {/* Right: FluidGlass lens + comparison cards */}
            <div style={{ position: "relative" }}>
              <div style={{ height: 600, borderRadius: 20, overflow: "hidden" }}>
                <Suspense fallback={<div style={{ height: 600, background: "#e0ebe8", borderRadius: 20 }} />}>
                  <FluidGlass
                    mode="lens"
                    bgColor="#E8EBE4"
                    lensProps={{
                      scale: 0.25,
                      ior: 1.15,
                      thickness: 5,
                      chromaticAberration: 0.1,
                      anisotropy: 0.01,
                    }}
                  />
                </Suspense>
              </div>

              {/* Floating comparison cards on top of glass */}
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                width: "80%",
                pointerEvents: "none",
              }}>
                {/* Keyword Search card */}
                <div style={{
                  background: "rgba(245, 224, 224, 0.92)",
                  backdropFilter: "blur(8px)",
                  borderRadius: 16,
                  padding: 24,
                  border: "1px solid #d4a8a8",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C0392B" }} />
                    <div style={{
                      fontFamily: "Space Mono, monospace", fontSize: 12,
                      fontWeight: 700, color: "#C0392B",
                      letterSpacing: 1, textTransform: "uppercase",
                    }}>
                      Keyword Search
                    </div>
                  </div>
                  <div style={{
                    background: "rgba(255,255,255,0.8)", borderRadius: 10,
                    padding: "12px 14px", fontSize: 13, color: "#555",
                    lineHeight: 1.6, fontFamily: "Space Mono, monospace",
                  }}>
                    "72yo on blood thinners + pain med"
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#C0392B", fontFamily: "DM Sans, sans-serif" }}>
                    0 results found
                  </div>
                </div>

                {/* RxGuard card */}
                <div style={{
                  background: "rgba(224, 240, 237, 0.92)",
                  backdropFilter: "blur(8px)",
                  borderRadius: 16,
                  padding: 24,
                  border: "1px solid #c4d9d6",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2A7D6F" }} />
                    <div style={{
                      fontFamily: "Space Mono, monospace", fontSize: 12,
                      fontWeight: 700, color: "#0D3D3A",
                      letterSpacing: 1, textTransform: "uppercase",
                    }}>
                      RxGuard Semantic
                    </div>
                  </div>
                  <div style={{
                    background: "rgba(255,255,255,0.8)", borderRadius: 10,
                    padding: "12px 14px", fontSize: 13, color: "#555",
                    lineHeight: 1.6, fontFamily: "Space Mono, monospace",
                  }}>
                    "72yo on blood thinners + pain med"
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#2A7D6F", fontFamily: "DM Sans, sans-serif", lineHeight: 1.6 }}>
                    Found: Warfarin + Ibuprofen — 1,532 FAERS cases, 47 deaths
                  </div>
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
        <div style={{ maxWidth: 1300, margin: "0 auto", position: "relative", zIndex: 1 }}>
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

          {/* Pipeline flow — two rows */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
            {/* Row 1: Query → NLP → Search Engines */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
              {renderNode(PIPELINE_NODES[0])}
              <div style={arrowStyle}>&rarr;</div>
              {renderNode(PIPELINE_NODES[1])}
              <div style={arrowStyle}>&rarr;</div>
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                alignItems: "center",
                padding: "20px 16px",
                border: "1.5px solid rgba(196,217,214,0.2)",
                borderRadius: 20,
                background: "rgba(42,125,111,0.08)",
              }}>
                <div style={{
                  fontSize: 12,
                  color: "#c4d9d6",
                  fontFamily: "Space Mono, monospace",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}>
                  Search Engines
                </div>
                {renderNode(PIPELINE_NODES[2])}
                {renderNode(PIPELINE_NODES[3])}
                {renderNode(PIPELINE_NODES[4])}
              </div>
            </div>

            {/* Vertical arrow */}
            <div style={{ ...arrowStyle, fontSize: 60 }}>&darr;</div>

            {/* Row 2: Ranker → Results */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20 }}>
              {renderNode(PIPELINE_NODES[5])}
              <div style={arrowStyle}>&rarr;</div>
              {renderNode(PIPELINE_NODES[6])}
            </div>
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

          {/* Engine cards carousel */}
          <Swiper
            modules={[EffectCoverflow, Pagination, Autoplay]}
            effect="coverflow"
            centeredSlides
            slidesPerView="auto"
            initialSlide={1}
            simulateTouch={false}
            allowTouchMove={false}
            coverflowEffect={{ rotate: 0, stretch: 0, depth: 120, modifier: 2, slideShadows: false }}
            pagination={{ clickable: true }}
            autoplay={{ delay: 4000, disableOnInteraction: true }}
            style={{ paddingBottom: 48, marginBottom: 48 }}
          >
            {ENGINES.map(eng => (
              <SwiperSlide key={eng.name} style={{ width: 300 }}>
                <div style={{
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
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

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
                <Bar dataKey="V1" fill="#0D3D3A" name="V1 Keyword" radius={[6, 6, 0, 0]} />
                <Bar dataKey="V2" fill="#1A5C53" name="V2 TF-IDF" radius={[6, 6, 0, 0]} />
                <Bar dataKey="V3" fill="#2A7D6F" name="V3 Vector" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          Section 4b: Case Study Previews
      ════════════════════════════════════════════════════════════════════ */}
      <section
        ref={caseRef}
        style={{
          background: "#0D3D3A",
          padding: "120px 48px",
          ...fadeStyle(caseVisible),
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{
            fontSize: 11,
            color: "#c4d9d6",
            fontFamily: "Space Mono, monospace",
            letterSpacing: 3,
            textTransform: "uppercase",
            marginBottom: 16,
            textAlign: "center",
          }}>
            Case Studies
          </div>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            color: "white",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 56,
            textAlign: "center",
          }}>
            Drugs That Made History
          </h2>

          <Swiper
            modules={[Navigation, Pagination]}
            slidesPerView={1}
            spaceBetween={32}
            simulateTouch={false}
            allowTouchMove={false}
            navigation
            pagination={{ clickable: true }}
            breakpoints={{
              768: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            style={{ paddingBottom: 48 }}
          >
            {CASE_PREVIEWS.map(c => (
              <SwiperSlide key={c.name}>
                <div style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(196,217,214,0.2)",
                  borderRadius: 20,
                  padding: 32,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}>
                  <div style={{
                    fontSize: 28,
                    fontWeight: 700,
                    fontFamily: "Space Mono, monospace",
                    color: c.color,
                  }}>
                    {c.name}
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.5)",
                    fontFamily: "DM Sans, sans-serif",
                  }}>
                    {c.generic} &middot; {c.class}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: "#c4d9d6",
                    fontFamily: "Space Mono, monospace",
                    letterSpacing: 1,
                  }}>
                    {c.years}
                  </div>
                  <div style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.75)",
                    lineHeight: 1.7,
                    borderTop: "1px solid rgba(196,217,214,0.15)",
                    paddingTop: 16,
                  }}>
                    {c.impact}
                  </div>
                  <button
                    onClick={() => navigate("/case-studies")}
                    style={{
                      background: "transparent",
                      color: c.color,
                      border: `1px solid ${c.color}`,
                      borderRadius: "4rem",
                      padding: "10px 24px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "DM Sans, sans-serif",
                      transition: "all 0.3s ease",
                      alignSelf: "flex-start",
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = c.color; e.currentTarget.style.color = "#0D3D3A"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = c.color; }}
                  >
                    Read Full Study
                  </button>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button
              onClick={() => navigate("/case-studies")}
              style={ctaSecondaryStyle}
              onMouseOver={e => { e.currentTarget.style.borderColor = "#c4d9d6"; e.currentTarget.style.color = "white"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
            >
              View All Case Studies
            </button>
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
          padding: "0 48px 48px",
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
            Tech
          </div>
          <h2 style={{
            fontSize: 36,
            fontWeight: 700,
            color: "#0D3D3A",
            fontFamily: "DM Sans, sans-serif",
            marginBottom: 24,
            textAlign: "center",
          }}>
            Built With
          </h2>

          <Swiper
            modules={[Autoplay]}
            slidesPerView={4}
            spaceBetween={12}
            loop
            simulateTouch={false}
            allowTouchMove={false}
            autoplay={{ delay: 2500, disableOnInteraction: false }}
            breakpoints={{
              0: { slidesPerView: 2 },
              768: { slidesPerView: 3 },
              1024: { slidesPerView: 4 },
            }}
          >
            {TECH_STACK.map(item => (
              <SwiperSlide key={item.name}>
                <div style={{
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
              </SwiperSlide>
            ))}
          </Swiper>
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

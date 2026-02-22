import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ── Scroll Reveal Hook ───────────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, visible];
}

// ── Case Study Data ──────────────────────────────────────────────────────────
const CASE_STUDIES = [
  {
    id: "vioxx",
    drugName: "Vioxx",
    genericName: "Rofecoxib",
    drugClass: "COX-2 Inhibitor",
    indication: "Arthritis / Pain",
    color: "#D4B896",
    approvalYear: 1999,
    withdrawalYear: 2004,
    timeline: [
      { year: 1999, month: "May", event: "FDA Approval", type: "approval" },
      { year: 1999, month: "Aug", event: "First FAERS cardiac signals (7 serious cases in 3 months)", type: "signal" },
      { year: 2000, month: "Mar", event: "VIGOR study: 5x heart attack risk vs naproxen", type: "signal" },
      { year: 2001, month: "Feb", event: "FDA advisory committee meeting", type: "warning" },
      { year: 2004, month: "Sep", event: "Voluntary withdrawal after APPROVe trial", type: "withdrawal" },
    ],
    signalYears: 5,
    impactStat: "88,000\u2013140,000 excess heart attacks",
    faersReports: 12692,
    deaths: "~60,000 estimated",
    settlement: "$4.85 billion",
    rxguardReplay: {
      query: "65-year-old male with osteoarthritis, currently on aspirin. Prescribed Vioxx.",
      year: 2001,
      riskScore: 9.2,
      riskLevel: "HIGH RISK",
      flaggedReasons: [
        "FAERS: 7+ cardiac events within 3 months of launch",
        "VIGOR trial data: 5x MI risk vs naproxen",
        "Patient on aspirin \u2014 compounded cardiovascular risk",
      ],
      topOutcomes: { death: 31, hospitalized: 48, serious: 15, other: 6 },
      verdict: "RxGuard would have flagged this as HIGH RISK in 2001 \u2014 3 years before withdrawal.",
    },
  },
  {
    id: "baycol",
    drugName: "Baycol",
    genericName: "Cerivastatin",
    drugClass: "Statin (HMG-CoA Reductase Inhibitor)",
    indication: "High Cholesterol",
    color: "#C9B99A",
    approvalYear: 1997,
    withdrawalYear: 2001,
    timeline: [
      { year: 1997, month: "Jun", event: "FDA Approval", type: "approval" },
      { year: 2000, month: "Mar", event: "FAERS: cerivastatin = ~50% of all statin rhabdomyolysis reports", type: "signal" },
      { year: 2000, month: "Aug", event: "cerivastatin + gemfibrozil \u2192 10x rhabdomyolysis rate", type: "signal" },
      { year: 2001, month: "Jun", event: "FDA issues safety warning about gemfibrozil combo", type: "warning" },
      { year: 2001, month: "Aug", event: "Voluntary withdrawal \u2014 31 US deaths", type: "withdrawal" },
    ],
    signalYears: 3,
    impactStat: "52 deaths worldwide",
    faersReports: 1899,
    deaths: "31 US / 52 worldwide",
    settlement: "$1.18 billion",
    rxguardReplay: {
      query: "58-year-old male on gemfibrozil for triglycerides. Prescribed Baycol for cholesterol.",
      year: 2000,
      riskScore: 9.6,
      riskLevel: "HIGH RISK",
      flaggedReasons: [
        "FAERS: cerivastatin accounts for ~50% of all statin rhabdomyolysis reports",
        "Cerivastatin + gemfibrozil \u2192 10x higher rhabdomyolysis rate vs other statins",
        "12 of 31 US deaths involved the gemfibrozil combination",
      ],
      topOutcomes: { death: 22, hospitalized: 41, serious: 28, other: 9 },
      verdict: "RxGuard would have flagged this as HIGH RISK in 2000 \u2014 1 year before withdrawal.",
    },
  },
  {
    id: "darvocet",
    drugName: "Darvocet",
    genericName: "Propoxyphene + Acetaminophen",
    drugClass: "Opioid Analgesic",
    indication: "Pain Management",
    color: "#DECCA8",
    approvalYear: 1957,
    withdrawalYear: 2010,
    timeline: [
      { year: 1957, month: "", event: "FDA Approval", type: "approval" },
      { year: 1978, month: "", event: "First FDA review \u2014 overdose deaths mounting", type: "signal" },
      { year: 2006, month: "", event: "Public Citizen petition to ban propoxyphene", type: "signal" },
      { year: 2009, month: "Jan", event: "Europe withdraws propoxyphene", type: "warning" },
      { year: 2009, month: "Jul", event: "FDA adds black box warning for cardiac arrhythmia", type: "warning" },
      { year: 2010, month: "Nov", event: "FDA requests voluntary withdrawal", type: "withdrawal" },
    ],
    signalYears: 10,
    impactStat: "Deaths dropped 84% after withdrawal",
    faersReports: 4892,
    deaths: "580/year pre-withdrawal",
    settlement: "$122.5 million",
    rxguardReplay: {
      query: "70-year-old female on benzodiazepines for anxiety. Prescribed Darvocet for chronic pain.",
      year: 2006,
      riskScore: 8.8,
      riskLevel: "HIGH RISK",
      flaggedReasons: [
        "FAERS: decades of overdose death signals",
        "Propoxyphene + CNS depressant \u2192 compounded respiratory depression risk",
        "Cardiac arrhythmia signals accumulating through 2000s",
      ],
      topOutcomes: { death: 38, hospitalized: 32, serious: 20, other: 10 },
      verdict: "RxGuard would have flagged this as HIGH RISK in 2006 \u2014 4 years before withdrawal.",
    },
  },
];

// ── Timeline Event Dot Colors ────────────────────────────────────────────────
const EVENT_COLORS = {
  approval: "#4caf50",
  signal: "#DDD0B8",
  warning: "#D4B896",
  withdrawal: "#C4A77D",
};

const EVENT_LABELS = {
  approval: "Approval",
  signal: "Signal",
  warning: "Warning",
  withdrawal: "Withdrawal",
};

// ── Outcome Bar Component ────────────────────────────────────────────────────
function OutcomeBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <div style={{
        width: 90,
        fontSize: 11,
        color: "rgba(255,255,255,0.5)",
        fontFamily: "Space Mono, monospace",
        textAlign: "right",
      }}>
        {label}
      </div>
      <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 4, height: 8, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          background: color,
          borderRadius: 4,
          transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
        }} />
      </div>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: "rgba(255,255,255,0.8)",
        fontFamily: "Space Mono, monospace",
        minWidth: 28,
        textAlign: "right",
      }}>
        {value}%
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function CaseStudiesPage() {
  const navigate = useNavigate();
  const [heroRef, heroVisible] = useScrollReveal();

  const fadeStyle = (visible) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "none" : "translateY(40px)",
    transition: "all 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
  });

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
        @keyframes expandWidth {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(196, 167, 125, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(196, 167, 125, 0); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #E8EBE4; }
        ::-webkit-scrollbar-thumb { background: #c4d9d6; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #2A7D6F; }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════════
          Hero / Intro Section
      ════════════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        style={{
          background: "linear-gradient(180deg, #0D3D3A 0%, #164a46 100%)",
          padding: "100px 48px 80px",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Navigation */}
        <div style={{
          position: "absolute",
          top: 24,
          left: 48,
          right: 48,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 2,
        }}>
          <span
            onClick={() => navigate("/")}
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "white",
              fontFamily: "Space Mono, monospace",
              letterSpacing: 4,
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "opacity 0.2s",
            }}
            onMouseOver={e => e.currentTarget.style.opacity = "0.8"}
            onMouseOut={e => e.currentTarget.style.opacity = "1"}
          >
            RxGuard
          </span>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => navigate("/home")}
              style={{
                background: "transparent",
                color: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "4rem",
                padding: "8px 20px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
                transition: "all 0.2s",
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = "#c4d9d6"; e.currentTarget.style.color = "white"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            >
              Search
            </button>
            <button
              onClick={() => navigate("/analysis")}
              style={{
                background: "transparent",
                color: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "4rem",
                padding: "8px 20px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
                transition: "all 0.2s",
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = "#c4d9d6"; e.currentTarget.style.color = "white"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            >
              Analysis
            </button>
          </div>
        </div>

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
            Pharmacovigilance Case Studies
          </div>
          <h1 style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: 0.5,
            color: "white",
            marginBottom: 20,
            lineHeight: 1.1,
          }}>
            What if RxGuard existed years earlier?
          </h1>
          <p style={{
            fontSize: 15,
            color: "rgba(255,255,255,0.5)",
            maxWidth: 640,
            margin: "0 auto",
            lineHeight: 1.8,
          }}>
            Every major drug withdrawal was preceded by years of adverse event signals sitting in FDA databases.
            These three case studies show how semantic search over FAERS data could have caught danger signals
            years before regulators acted &mdash; potentially saving thousands of lives.
          </p>
        </div>

        {/* Legend */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 24,
          marginTop: 48,
          animation: "fadeIn 1s ease 0.6s both",
        }}>
          {Object.entries(EVENT_LABELS).map(([type, label]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: EVENT_COLORS[type],
              }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "Space Mono, monospace" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          Per-Drug Case Study Cards
      ════════════════════════════════════════════════════════════════════ */}
      {CASE_STUDIES.map((study, idx) => (
        <CaseStudyCard key={study.id} study={study} index={idx} />
      ))}

      {/* ════════════════════════════════════════════════════════════════════
          Bottom CTA
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{
        background: "#0D3D3A",
        padding: "100px 48px 80px",
        textAlign: "center",
      }}>
        <h2 style={{
          fontSize: 40,
          fontWeight: 700,
          color: "white",
          fontFamily: "DM Sans, sans-serif",
          marginBottom: 16,
        }}>
          Don't Wait for the Next Signal
        </h2>
        <p style={{
          fontSize: 15,
          color: "rgba(255,255,255,0.55)",
          marginBottom: 44,
          lineHeight: 1.6,
          maxWidth: 500,
          margin: "0 auto 44px",
        }}>
          These drugs were on the market for years while FAERS data showed clear danger.
          RxGuard searches 20M+ adverse event reports so you don't have to wait.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <button
            onClick={() => navigate("/home")}
            style={{
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
            }}
            onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(42,125,111,0.5)"; }}
            onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(42,125,111,0.35)"; }}
          >
            Try RxGuard on Today's Drugs
          </button>
          <button
            onClick={() => navigate("/analysis")}
            style={{
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
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = "#c4d9d6"; e.currentTarget.style.color = "white"; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
          >
            View System Analysis
          </button>
        </div>

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

// ── Individual Case Study Card ───────────────────────────────────────────────
function CaseStudyCard({ study, index }) {
  const [ref, visible] = useScrollReveal();
  const [replayVisible, setReplayVisible] = useState(false);
  const replayRef = useRef(null);

  useEffect(() => {
    const el = replayRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setReplayVisible(true); },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fadeStyle = {
    opacity: visible ? 1 : 0,
    transform: visible ? "none" : "translateY(40px)",
    transition: "all 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
  };

  // Calculate timeline positions
  const allYears = study.timeline.map(e => e.year);
  const minYear = Math.min(...allYears);
  const maxYear = Math.max(...allYears);
  const yearSpan = maxYear - minYear || 1;

  // Find first signal and withdrawal for "missed window"
  const firstSignal = study.timeline.find(e => e.type === "signal");
  const withdrawal = study.timeline.find(e => e.type === "withdrawal");
  const firstSignalPos = firstSignal ? ((firstSignal.year - minYear) / yearSpan) * 100 : 0;
  const withdrawalPos = withdrawal ? ((withdrawal.year - minYear) / yearSpan) * 100 : 100;

  // Outcome bar data
  const outcomes = study.rxguardReplay.topOutcomes;
  const maxOutcome = Math.max(outcomes.death, outcomes.hospitalized, outcomes.serious, outcomes.other);

  return (
    <section
      ref={ref}
      style={{
        background: index % 2 === 0 ? "#E8EBE4" : "#f0f2ed",
        padding: "80px 48px",
        ...fadeStyle,
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* ── Drug Header Bar ─────────────────────────────────────────── */}
        <div style={{
          background: study.color,
          borderRadius: "16px 16px 0 0",
          padding: "24px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}>
          <div>
            <div style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#0D3D3A",
              fontFamily: "Space Mono, monospace",
              letterSpacing: 2,
            }}>
              {study.drugName}
            </div>
            <div style={{
              fontSize: 14,
              color: "rgba(13,61,58,0.65)",
              fontFamily: "DM Sans, sans-serif",
              marginTop: 4,
            }}>
              {study.genericName} &middot; {study.drugClass}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontSize: 11,
              color: "rgba(13,61,58,0.5)",
              fontFamily: "Space Mono, monospace",
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 4,
            }}>
              {study.indication}
            </div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#0D3D3A",
              fontFamily: "Space Mono, monospace",
            }}>
              {study.approvalYear} &rarr; {study.withdrawalYear}
            </div>
          </div>
        </div>

        {/* ── Content Area ────────────────────────────────────────────── */}
        <div style={{
          background: "white",
          borderRadius: "0 0 16px 16px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          overflow: "hidden",
        }}>

          {/* ── Visual Timeline ─────────────────────────────────────── */}
          <div style={{ padding: "40px 32px 32px" }}>
            <div style={{
              fontSize: 11,
              color: study.color,
              fontFamily: "Space Mono, monospace",
              letterSpacing: 3,
              textTransform: "uppercase",
              marginBottom: 20,
            }}>
              Timeline
            </div>

            {/* Timeline track */}
            <div style={{ position: "relative", height: 120, marginBottom: 16 }}>
              {/* Base line */}
              <div style={{
                position: "absolute",
                top: 40,
                left: 0,
                right: 0,
                height: 3,
                background: "#e0e0e0",
                borderRadius: 2,
              }} />

              {/* Missed window highlight */}
              <div style={{
                position: "absolute",
                top: 32,
                left: `${firstSignalPos}%`,
                width: `${withdrawalPos - firstSignalPos}%`,
                height: 18,
                background: `${study.color}15`,
                border: `1px dashed ${study.color}40`,
                borderRadius: 4,
              }} />

              {/* "Missed Window" label */}
              {firstSignal && withdrawal && (
                <div style={{
                  position: "absolute",
                  top: 6,
                  left: `${firstSignalPos + (withdrawalPos - firstSignalPos) / 2}%`,
                  transform: "translateX(-50%)",
                  fontSize: 9,
                  color: study.color,
                  fontFamily: "Space Mono, monospace",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}>
                  {study.signalYears}yr missed window
                </div>
              )}

              {/* Event dots */}
              {study.timeline.map((evt, i) => {
                const pos = ((evt.year - minYear) / yearSpan) * 100;
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: `${pos}%`,
                      top: 34,
                      transform: "translateX(-50%)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      zIndex: 2,
                    }}
                  >
                    <div style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: EVENT_COLORS[evt.type],
                      border: "3px solid white",
                      boxShadow: `0 0 0 2px ${EVENT_COLORS[evt.type]}40`,
                      ...(evt.type === "withdrawal" ? { animation: "pulse 2s ease-in-out infinite" } : {}),
                    }} />
                    <div style={{
                      marginTop: 12,
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#333",
                      fontFamily: "Space Mono, monospace",
                      whiteSpace: "nowrap",
                    }}>
                      {evt.month ? `${evt.month} ` : ""}{evt.year}
                    </div>
                    <div style={{
                      marginTop: 2,
                      fontSize: 10,
                      color: "#777",
                      fontFamily: "DM Sans, sans-serif",
                      maxWidth: 140,
                      textAlign: "center",
                      lineHeight: 1.4,
                    }}>
                      {evt.event.length > 50 ? evt.event.slice(0, 47) + "..." : evt.event}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Full event descriptions below timeline */}
            <div style={{
              marginTop: 60,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              borderLeft: `3px solid ${study.color}30`,
              paddingLeft: 16,
            }}>
              {study.timeline.map((evt, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: EVENT_COLORS[evt.type],
                    marginTop: 4,
                    flexShrink: 0,
                  }} />
                  <div>
                    <span style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#0D3D3A",
                      fontFamily: "Space Mono, monospace",
                    }}>
                      {evt.month ? `${evt.month} ` : ""}{evt.year}
                    </span>
                    <span style={{
                      fontSize: 12,
                      color: "#555",
                      fontFamily: "DM Sans, sans-serif",
                      marginLeft: 8,
                    }}>
                      {evt.event}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RxGuard Replay Box ──────────────────────────────────── */}
          <div
            ref={replayRef}
            style={{
              margin: "0 32px 32px",
              background: "#0D3D3A",
              borderRadius: 16,
              padding: 32,
              opacity: replayVisible ? 1 : 0,
              transform: replayVisible ? "none" : "translateY(20px)",
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}>
              <div style={{
                fontSize: 11,
                color: "#c4d9d6",
                fontFamily: "Space Mono, monospace",
                letterSpacing: 3,
                textTransform: "uppercase",
              }}>
                RxGuard Replay
              </div>
              <div style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "Space Mono, monospace",
                background: "rgba(255,255,255,0.08)",
                borderRadius: 4,
                padding: "2px 8px",
              }}>
                Simulated {study.rxguardReplay.year}
              </div>
            </div>

            {/* Query */}
            <div style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: "14px 18px",
              marginBottom: 24,
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "Space Mono, monospace",
                letterSpacing: 1,
                marginBottom: 8,
              }}>
                QUERY &gt;
              </div>
              <div style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.85)",
                fontFamily: "Space Mono, monospace",
                lineHeight: 1.6,
              }}>
                {study.rxguardReplay.query}
              </div>
            </div>

            {/* Risk Score + Level */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              marginBottom: 24,
            }}>
              {/* Score gauge */}
              <div style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                border: `4px solid ${study.color}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <div style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: study.color,
                  fontFamily: "Space Mono, monospace",
                  lineHeight: 1,
                }}>
                  {study.rxguardReplay.riskScore}
                </div>
                <div style={{
                  fontSize: 8,
                  color: "rgba(255,255,255,0.4)",
                  fontFamily: "Space Mono, monospace",
                  letterSpacing: 1,
                }}>
                  / 10
                </div>
              </div>
              <div>
                <div style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: study.color,
                  fontFamily: "Space Mono, monospace",
                  letterSpacing: 2,
                }}>
                  {study.rxguardReplay.riskLevel}
                </div>
                <div style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "DM Sans, sans-serif",
                  marginTop: 4,
                }}>
                  Based on FAERS adverse event analysis
                </div>
              </div>
            </div>

            {/* Flagged reasons */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "Space Mono, monospace",
                letterSpacing: 1,
                marginBottom: 10,
              }}>
                FLAGGED REASONS
              </div>
              {study.rxguardReplay.flaggedReasons.map((reason, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  marginBottom: 8,
                }}>
                  <div style={{
                    color: study.color,
                    fontSize: 14,
                    fontWeight: 700,
                    marginTop: 1,
                    flexShrink: 0,
                  }}>
                    !
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.75)",
                    fontFamily: "DM Sans, sans-serif",
                    lineHeight: 1.6,
                  }}>
                    {reason}
                  </div>
                </div>
              ))}
            </div>

            {/* Outcome distribution bars */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "Space Mono, monospace",
                letterSpacing: 1,
                marginBottom: 10,
              }}>
                OUTCOME DISTRIBUTION
              </div>
              <OutcomeBar label="Death" value={outcomes.death} max={maxOutcome} color="#C4A77D" />
              <OutcomeBar label="Hospitalized" value={outcomes.hospitalized} max={maxOutcome} color="#D4B896" />
              <OutcomeBar label="Serious" value={outcomes.serious} max={maxOutcome} color="#DDD0B8" />
              <OutcomeBar label="Other" value={outcomes.other} max={maxOutcome} color="#E8DCC8" />
            </div>

            {/* Verdict */}
            <div style={{
              background: `${study.color}20`,
              border: `1px solid ${study.color}40`,
              borderRadius: 10,
              padding: "16px 20px",
            }}>
              <div style={{
                fontSize: 15,
                fontWeight: 700,
                color: "white",
                fontFamily: "DM Sans, sans-serif",
                lineHeight: 1.6,
              }}>
                {study.rxguardReplay.verdict}
              </div>
            </div>
          </div>

          {/* ── Impact Stats Row ────────────────────────────────────── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 1,
            background: "#f0f0f0",
            borderTop: "1px solid #f0f0f0",
          }}>
            {[
              { label: "Deaths", value: study.deaths },
              { label: "FAERS Reports", value: study.faersReports.toLocaleString() },
              { label: "Settlement", value: study.settlement },
              { label: "Signal Lag", value: `${study.signalYears} years` },
            ].map((stat, i) => (
              <div key={i} style={{
                background: "white",
                padding: "24px 20px",
                textAlign: "center",
              }}>
                <div style={{
                  fontSize: 10,
                  color: "#999",
                  fontFamily: "Space Mono, monospace",
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}>
                  {stat.label}
                </div>
                <div style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#0D3D3A",
                  fontFamily: "Space Mono, monospace",
                }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

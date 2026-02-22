import { useState, useEffect, Fragment } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_DATA = {
  query: {
    currentMed: "Warfarin",
    newPrescription: "Paroxetine",
    age: 83,
    sex: "Female",
    conditions: "COPD",
  },
  riskScore: 9,
  totalReports: 243,
  outcomes: {
    deaths: 18,
    hospitalized: 97,
    lifeThreatening: 34,
  },
  topReactions: [
    { name: "INR increased", count: 68 },
    { name: "Haemorrhage", count: 52 },
    { name: "Epistaxis", count: 41 },
    { name: "GI haemorrhage", count: 37 },
    { name: "Ecchymosis", count: 29 },
    { name: "Cerebral haemorrhage", count: 16 },
  ],
  sexSplit: [
    { name: "Female", value: 63 },
    { name: "Male", value: 37 },
  ],
  ageDistribution: [
    { range: "18-30", count: 3 },
    { range: "31-45", count: 9 },
    { range: "46-60", count: 28 },
    { range: "61-70", count: 54 },
    { range: "71-80", count: 87 },
    { range: "81+", count: 62 },
  ],
  similarCases: [
    {
      id: 1,
      age: 81,
      sex: "Female",
      drugs: "Warfarin, Paroxetine, Lisinopril",
      reactions: "INR increased, GI haemorrhage, Anaemia",
      outcome: "Hospitalized",
      similarity: 92,
      outcomeType: "hospitalized",
    },
    {
      id: 2,
      age: 85,
      sex: "Female",
      drugs: "Warfarin, Paroxetine",
      reactions: "Cerebral haemorrhage, INR increased",
      outcome: "Fatal",
      similarity: 88,
      outcomeType: "death",
    },
    {
      id: 3,
      age: 79,
      sex: "Female",
      drugs: "Warfarin, Paroxetine, Omeprazole",
      reactions: "Haemorrhage, Ecchymosis, Epistaxis",
      outcome: "Hospitalized",
      similarity: 85,
      outcomeType: "hospitalized",
    },
    {
      id: 4,
      age: 82,
      sex: "Female",
      drugs: "Warfarin, Paroxetine, Amlodipine",
      reactions: "INR increased, Haemorrhage, Dizziness",
      outcome: "Life-threatening",
      similarity: 81,
      outcomeType: "lifethreat",
    },
    {
      id: 5,
      age: 77,
      sex: "Female",
      drugs: "Warfarin, Paroxetine",
      reactions: "Epistaxis, Ecchymosis, INR increased",
      outcome: "Hospitalized",
      similarity: 78,
      outcomeType: "hospitalized",
    },
  ],
  alternatives: [
    { drugName: "Sertraline", drugClass: "SSRI antidepressant",
      whySafer: "Weaker CYP2C9 inhibition than paroxetine, resulting in less INR elevation when co-administered with warfarin.",
      monitoring: "INR check at 1 and 4 weeks after initiation; monitor for bruising or bleeding signs",
      relativeRisk: "lower",
      source: "https://pubmed.ncbi.nlm.nih.gov/16364050/",
      sourceLabel: "Sayal et al., J Clin Psychiatry 2006" },
    { drugName: "Citalopram", drugClass: "SSRI antidepressant",
      whySafer: "Minimal CYP2C9 and CYP2C19 inhibition; lower pharmacokinetic interaction potential with warfarin.",
      monitoring: "Baseline and follow-up INR at 2 weeks; watch for serotonin-mediated platelet effects",
      relativeRisk: "lower",
      source: "https://pubmed.ncbi.nlm.nih.gov/11041620/",
      sourceLabel: "Priskorn et al., Br J Clin Pharmacol 1997" },
    { drugName: "Mirtazapine", drugClass: "Tetracyclic antidepressant (NaSSA)",
      whySafer: "Non-SSRI mechanism avoids serotonin-mediated platelet inhibition; negligible CYP2C9 interaction with warfarin.",
      monitoring: "Sedation and weight gain; routine INR monitoring is generally sufficient",
      relativeRisk: "much-lower",
      source: "https://pubmed.ncbi.nlm.nih.gov/10071079/",
      sourceLabel: "Anttila & Leinonen, Int Clin Psychopharmacol 1999" },
  ],
  summary: "The combination of **Warfarin** and **Paroxetine** presents a **HIGH** risk for bleeding complications. Paroxetine is a potent inhibitor of CYP2C9, the primary enzyme responsible for warfarin metabolism, which can lead to significantly elevated INR and increased bleeding risk.\n\nFAERS data shows **243 adverse event reports** for this combination, with **40% resulting in hospitalization** and **7.4% in fatalities** \u2014 predominantly in elderly female patients over 70. The risk is particularly elevated in patients aged 81+ with comorbidities such as COPD.\n\n**Key concerns for this patient:**\n- Age 83 places her in the highest-risk demographic for warfarin-SSRI bleeding events\n- COPD may require concomitant medications that further elevate bleeding risk\n- Paroxetine\u2019s strong CYP2C9 inhibition can raise warfarin levels by 30\u201350%\n\n**Recommendation:** Strongly consider **mirtazapine** or **sertraline** as alternatives. If paroxetine is clinically necessary, reduce warfarin dose by 25\u201330%, check INR within 3\u20135 days, and monitor weekly for the first month.",
  labelHits: [
    { rank: 1, score: 0.91, doc_id: "warfarin-003", text: "Drugs that inhibit CYP2C9 (e.g., paroxetine, fluconazole) may increase the anticoagulant effect of warfarin by increasing warfarin plasma concentrations. Close monitoring of INR is recommended when starting or stopping CYP2C9 inhibitors.", drugs: ["warfarin", "paroxetine"], section: "DRUG INTERACTIONS", generic_name: "warfarin sodium", source: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e0b7c3a1-dbb6-4a3e-862b-50df25843b24", sourceLabel: "DailyMed \u2014 Warfarin Sodium Label" },
    { rank: 2, score: 0.84, doc_id: "paroxetine-001", text: "Drugs that interfere with hemostasis (including warfarin): Serotonin release by platelets plays an important role in hemostasis. Co-administration of paroxetine with warfarin may result in increased bleeding.", drugs: ["paroxetine", "warfarin"], section: "WARNINGS AND PRECAUTIONS", generic_name: "paroxetine hydrochloride", source: "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=584c6299-faf8-42de-9e2c-25a56ab7cd80", sourceLabel: "DailyMed \u2014 Paroxetine HCl Label" },
  ],
  faersSource: "faers_real",
  pipeline: {
    stages: [
      { name: "NLP Processing", key: "query_processing", duration_ms: 118.7, detail: "Extracted 2 drugs, parsed age/sex/conditions", tech: "spaCy + regex" },
      { name: "Vector Search", key: "search", duration_ms: 201.4, detail: "V3 engine, 38 raw results from 243 cases", tech: "all-MiniLM-L6-v2" },
      { name: "Results Ranking", key: "ranking", duration_ms: 39.8, detail: "Ranked 38 cases by similarity \u00d7 severity \u00d7 demographics", tech: "Multi-signal ranker" },
      { name: "DailyMed Labels", key: "label_search", duration_ms: 387.2, detail: "Found 2 FDA label matches (DRUG INTERACTIONS, WARNINGS)", tech: "Semantic label search" },
      { name: "Gemini Analysis", key: "response_generation", duration_ms: 3124.6, detail: "Generated clinical summary + 3 safer alternatives", tech: "Gemini 2.5 Flash" },
    ],
    total_ms: 3871.7,
    engine_used: "V3",
    drugs_extracted: ["warfarin", "paroxetine"],
    embedding_dim: 384,
    cases_searched: 243,
    cases_ranked: 38,
  },
};

const SEX_COLORS = ["#2A7D6F", "#0D3D3A"];

// ── Logic Badge ───────────────────────────────────────────────────────────────

function LogicBadge({ label, color = "#2A7D6F", bg = "#e0f2ef" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: bg, color, borderRadius: 20,
      padding: "2px 10px", fontSize: 10, fontWeight: 700,
      fontFamily: "Space Mono, monospace",
      letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

// ── Pipeline Summary Card ─────────────────────────────────────────────────────

const STAGE_ICONS = {
  query_processing: "Rx",
  search: "S",
  ranking: "R",
  label_search: "L",
  response_generation: "AI",
};

function PipelineSummaryCard({ pipeline }) {
  if (!pipeline || !pipeline.stages) return null;
  const [expanded, setExpanded] = useState(false);

  const dColor = (ms) => ms == null ? "#aaa" : ms < 500 ? "#2e7d32" : ms <= 2000 ? "#f57f17" : "#e65100";
  const dBg = (ms) => ms == null ? "#f5f5f5" : ms < 500 ? "#e8f5e9" : ms <= 2000 ? "#fff8e1" : "#fff3e0";

  return (
    <div style={{
      background: "white", borderRadius: 16,
      boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
      padding: "20px 28px", marginBottom: 28,
      animation: "slideUp 0.4s ease 0.1s both",
    }}>
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, cursor: "pointer" }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#2A7D6F", textTransform: "uppercase", letterSpacing: 1, fontFamily: "DM Sans, sans-serif" }}>
            Processing Pipeline
          </div>
          <span style={{ fontFamily: "Space Mono, monospace", fontSize: 11, color: "#888" }}>
            {pipeline.total_ms ? `${(pipeline.total_ms / 1000).toFixed(1)}s total` : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LogicBadge label={`${pipeline.engine_used} Engine`} />
          <span style={{ fontSize: 11, color: "#aaa", transition: "transform 0.3s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>&#9660;</span>
        </div>
      </div>

      {/* Horizontal stage flow */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
        {pipeline.stages.map((stage, i) => (
          <Fragment key={stage.key}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 90, flex: "1 1 0" }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: dBg(stage.duration_ms),
                border: `2px solid ${dColor(stage.duration_ms)}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "Space Mono, monospace",
                fontSize: 12, fontWeight: 700,
                color: dColor(stage.duration_ms),
                marginBottom: 6,
              }}>
                {STAGE_ICONS[stage.key] || "?"}
              </div>
              <div style={{ fontSize: 10, fontWeight: 600, color: "#0D3D3A", textAlign: "center", lineHeight: 1.3, fontFamily: "DM Sans, sans-serif" }}>
                {stage.name}
              </div>
              <div style={{ fontFamily: "Space Mono, monospace", fontSize: 11, fontWeight: 700, color: dColor(stage.duration_ms), marginTop: 2 }}>
                {stage.duration_ms != null ? `${Math.round(stage.duration_ms)}ms` : "--"}
              </div>
            </div>
            {i < pipeline.stages.length - 1 && (
              <div style={{ color: "#c4d9d6", fontSize: 18, padding: "0 2px", fontWeight: 400, userSelect: "none", marginBottom: 20 }}>&rarr;</div>
            )}
          </Fragment>
        ))}
      </div>

      {/* Collapsible detail */}
      <div style={{ maxHeight: expanded ? 300 : 0, overflow: "hidden", transition: "max-height 0.4s ease" }}>
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #e8ebe4", display: "flex", flexDirection: "column", gap: 6 }}>
          {pipeline.stages.map(stage => (
            <div key={stage.key} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, fontFamily: "DM Sans, sans-serif" }}>
              <span style={{ fontWeight: 700, color: "#0D3D3A", minWidth: 130 }}>{stage.name}</span>
              <span style={{ color: "#555" }}>{stage.detail}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "#aaa", marginTop: 6, fontFamily: "Space Mono, monospace" }}>
            Drugs: {pipeline.drugs_extracted?.join(", ")} | Cases searched: {pipeline.cases_searched} | Embedding: {pipeline.embedding_dim}-dim | Ranked: {pipeline.cases_ranked}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon, delay }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    const duration = 1200;
    const step = Math.ceil(end / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setDisplayed(end); clearInterval(timer); }
      else setDisplayed(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      border: "3px solid #0D3D3A",
      padding: "20px",
      flex: 1,
      minWidth: 180,
      animation: `slideUp 0.5s ease ${delay}s both`,
    }}>
      <div style={{
        color: "#0D3D3A",
        fontSize: 17,
        fontWeight: 600,
        fontFamily: "DM Sans, sans-serif",
        letterSpacing: 0.3,
        marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontSize: 32,
        fontWeight: 700,
        color: "#0D3D3A",
        fontFamily: "Inter, DM Sans, sans-serif",
        lineHeight: 1.2,
      }}>{displayed.toLocaleString()}</div>
      <div style={{
        fontSize: 14,
        color: color,
        marginTop: 4,
        fontFamily: "DM Sans, sans-serif",
      }}>{sub}</div>
    </div>
  );
}

function SectionCard({ title, subtitle, children, style = {} }) {
  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
      padding: 24,
      ...style,
    }}>
      {title && <div style={{
        marginBottom: 16,
        fontSize: 16,
        fontWeight: 700,
        color: "#0D3D3A",
        fontFamily: "DM Sans, sans-serif",
      }}>{title}</div>}
      {subtitle && <div style={{
        fontSize: 12,
        color: "#aaa",
        marginTop: 2,
        fontFamily: "DM Sans, sans-serif",
      }}>{subtitle}</div>}
      {children}
    </div>
  );
}

function OutcomeBadge({ type }) {
  const map = {
    death: { label: "Fatal", bg: "#fdecea", color: "#d32f2f" },
    hospitalized: { label: "Hospitalized", bg: "#e3f2fd", color: "#1565c0" },
    lifethreat: { label: "Life-Threatening", bg: "#fff8e1", color: "#f57f17" },
  };
  const s = map[type] || { label: type, bg: "#f5f5f5", color: "#666" };
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius: 20, padding: "3px 10px",
      fontSize: 11, fontWeight: 600, fontFamily: "DM Sans, sans-serif",
    }}>{s.label}</span>
  );
}

function SimilarityBar({ value }) {
  // Gradient from light (#c4d9d6) to brand green (#2A7D6F)
  const pct = Math.min(Math.max(value, 0), 100) / 100;
  const r = Math.round(196 - 154 * pct);
  const g = Math.round(217 - 92 * pct);
  const b = Math.round(214 - 103 * pct);
  const color = `rgb(${r},${g},${b})`;
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}>
      <div style={{
        flex: 1,
        background: "#f0f0f0",
        borderRadius: 4,
        height: 6,
        overflow: "hidden",
      }}>
        <div style={{
          width: `${value}%`,
          background: color,
          height: "100%",
          borderRadius: 4,
          transition: "width 1s ease",
        }} />
      </div>
      <span style={{
        fontSize: 12,
        fontWeight: 700,
        color,
        fontFamily: "Space Mono, monospace",
        minWidth: 36,
      }}>{value}%</span>
    </div>
  );
}

function LabelSectionBadge({ section, drugName }) {
  const colorMap = {
    "BOXED WARNING": { bg: "#fdecea", color: "#d32f2f" },
    "WARNINGS": { bg: "#fff8e1", color: "#f57f17" },
    "WARNINGS AND PRECAUTIONS": { bg: "#fff8e1", color: "#f57f17" },
    "DRUG INTERACTIONS": { bg: "#fff3e0", color: "#e65100" },
  };
  const s = colorMap[section?.toUpperCase()] || { bg: "#e8f5e9", color: "#2e7d32" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: s.bg, color: s.color,
      borderRadius: 20, padding: "3px 10px",
      fontSize: 11, fontWeight: 600, fontFamily: "DM Sans, sans-serif",
    }}>
      {section}{drugName ? ` \u2014 ${drugName}` : ""}
    </span>
  );
}

function AlternativeCard({ alt, delay }) {
  const riskColorMap = {
    "much-lower": { bg: "#e8f5e9", color: "#2e7d32", label: "Much Lower Risk" },
    "lower": { bg: "#fff8e1", color: "#f57f17", label: "Lower Risk" },
    "similar": { bg: "#fff3e0", color: "#e65100", label: "Similar Risk" },
  };
  const risk = riskColorMap[alt.relativeRisk] || riskColorMap["lower"];

  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
      padding: 20,
      flex: "1 1 300px",
      animation: `slideUp 0.5s ease ${delay}s both`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0D3D3A", fontFamily: "DM Sans, sans-serif" }}>
            {alt.drugName}
          </div>
          <div style={{ fontSize: 12, color: "#888", fontFamily: "DM Sans, sans-serif" }}>
            {alt.drugClass}
          </div>
        </div>
        <span style={{
          background: risk.bg, color: risk.color,
          borderRadius: 20, padding: "4px 12px",
          fontSize: 11, fontWeight: 600, fontFamily: "DM Sans, sans-serif",
          whiteSpace: "nowrap",
        }}>{risk.label}</span>
      </div>
      <div style={{ fontSize: 13, color: "#333", lineHeight: 1.6, marginBottom: 12, fontFamily: "DM Sans, sans-serif" }}>
        {alt.whySafer}
      </div>
      <div style={{
        background: "#f5f7f5",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 12,
        color: "#555",
        lineHeight: 1.5,
        fontFamily: "DM Sans, sans-serif",
      }}>
        <span style={{ fontWeight: 600, color: "#0D3D3A" }}>Monitoring: </span>
        {alt.monitoring}
      </div>
    </div>
  );
}

function FormattedSummary({ text }) {
  if (!text) return null;

  // Parse **bold** markers into <strong> elements
  const parseBold = (str) => {
    const parts = str.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i} style={{ color: "#0D3D3A" }}>{part}</strong> : part
    );
  };

  const lines = text.split("\n");
  const elements = [];
  let bulletBuffer = [];

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    elements.push(
      <ul key={`ul-${elements.length}`} style={{ margin: "6px 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
        {bulletBuffer.map((b, i) => (
          <li key={i} style={{ fontSize: 14, color: "#333", lineHeight: 1.6 }}>{parseBold(b)}</li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed === "") {
      flushBullets();
      elements.push(<div key={`sp-${i}`} style={{ height: 8 }} />);
    } else if (trimmed.startsWith("- ")) {
      bulletBuffer.push(trimmed.slice(2));
    } else {
      flushBullets();
      elements.push(
        <div key={`ln-${i}`} style={{ fontSize: 14, color: "#0D3D3A", lineHeight: 1.7 }}>
          {parseBold(trimmed)}
        </div>
      );
    }
  });
  flushBullets();

  return <div style={{ fontFamily: "DM Sans, sans-serif" }}>{elements}</div>;
}

function ClinicalInsightItem({ title, description }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{
        width: 28, height: 28, minWidth: 28,
        borderRadius: 8,
        background: "#e8f5e9",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14,
      }}>
        <span style={{ color: "#2e7d32" }}>✓</span>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#0D3D3A", fontFamily: "DM Sans, sans-serif", marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5, fontFamily: "DM Sans, sans-serif" }}>
          {description}
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function RxGuardDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedCase, setExpandedCase] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);
  const d = location.state?.data || MOCK_DATA;
  const parsed = location.state?.parsed || {
    age: 83,
    sex: 2,
    preexisting_conditions: ["COPD"],
    current_medications: ["Warfarin"],
    prescribed_medications: ["Paroxetine"],
  };

  const onNewSearch = () => navigate("/home");

  return (
    <div style={{
      minHeight: "100vh",
      background: "#E8EBE4",
      fontFamily: "DM Sans, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #f1f1f1; } ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
      `}</style>

      {/* Main content */}
      <div style={{ padding: "32px 48px 48px" }}>

        {/* Brand */}
        <div style={{ marginBottom: 32 }}>
          <Link to="/home" style={{ textDecoration: "none", cursor: "pointer", display: "inline-block", transition: "opacity 0.2s" }} onMouseOver={e => e.currentTarget.style.opacity = "0.8"} onMouseOut={e => e.currentTarget.style.opacity = "1"}>
            <span style={{ fontSize: 48, fontWeight: 700, color: "#0D3D3A", fontFamily: "Space Mono, monospace", letterSpacing: 4, textTransform: "uppercase" }}>RxGuard</span>
          </Link>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 32, animation: "slideUp 0.4s ease both" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: "#0D3D3A", lineHeight: 1.1 }}>
                  Drug Interaction Risk Summary
                </div>
              </div>
            </div>
            <button style={{
              background: "linear-gradient(135deg, #2A7D6F, #0D3D3A)",
              color: "white", border: "none", borderRadius: 10,
              padding: "12px 24px", fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "DM Sans, sans-serif",
              boxShadow: "0 4px 14px rgba(42,125,111,0.4)",
              transition: "all 0.2s",
            }}
            onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
            onClick={onNewSearch}
            >
              New Search
            </button>
          </div>
        </div>

        {/* Gemini Parsed Patient Info */}
        {parsed && (
          <div style={{
            background: "white",
            borderRadius: 16,
            padding: "20px 28px",
            marginBottom: 28,
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            borderLeft: "4px solid #2A7D6F",
            animation: "slideUp 0.4s ease both",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#2A7D6F", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
              Patient Summary
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 32px", fontSize: 14, color: "#0D3D3A" }}>
              {parsed.age != null && (
                <div><span style={{ color: "#888" }}>Age: </span><strong>{parsed.age}</strong></div>
              )}
              {parsed.sex != null && (
                <div><span style={{ color: "#888" }}>Sex: </span><strong>{parsed.sex === 1 ? "Male" : parsed.sex === 2 ? "Female" : "Unknown"}</strong></div>
              )}
              {parsed.preexisting_conditions?.length > 0 && (
                <div><span style={{ color: "#888" }}>Conditions: </span><strong>{Array.isArray(parsed.preexisting_conditions) ? parsed.preexisting_conditions.join(", ") : String(parsed.preexisting_conditions)}</strong></div>
              )}
              {parsed.current_medications?.length > 0 && (
                <div><span style={{ color: "#888" }}>Current Meds: </span><strong>{Array.isArray(parsed.current_medications) ? parsed.current_medications.join(", ") : String(parsed.current_medications)}</strong></div>
              )}
              {parsed.prescribed_medications?.length > 0 && (
                <div><span style={{ color: "#888" }}>Prescribed: </span><strong>{Array.isArray(parsed.prescribed_medications) ? parsed.prescribed_medications.join(", ") : String(parsed.prescribed_medications)}</strong></div>
              )}
            </div>
          </div>
        )}

        {/* Pipeline Summary */}
        <PipelineSummaryCard pipeline={d.pipeline} />

        {/* Gemini Error Banner */}
        {d.geminiError && (
          <div style={{
            background: "#fff3e0",
            borderRadius: 12,
            padding: "14px 20px",
            marginBottom: 20,
            borderLeft: "4px solid #e65100",
            display: "flex",
            alignItems: "center",
            gap: 12,
            animation: "slideUp 0.4s ease both",
          }}>
            <span style={{ fontSize: 20 }}>&#9888;</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e65100", fontFamily: "DM Sans, sans-serif", marginBottom: 2 }}>
                Gemini AI Unavailable
              </div>
              <div style={{ fontSize: 12, color: "#bf360c", fontFamily: "DM Sans, sans-serif", lineHeight: 1.5 }}>
                {d.geminiError}. FAERS statistics and case data are still available below.
              </div>
            </div>
          </div>
        )}

        {/* Clinical Analysis */}
        {d.summary && (
          <div style={{
            background: "white",
            borderRadius: 16,
            padding: "20px 28px",
            marginBottom: 28,
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            borderLeft: "4px solid #2A7D6F",
            animation: "slideUp 0.45s ease both",
          }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#2A7D6F", textTransform: "uppercase", letterSpacing: 1 }}>
                Clinical Analysis
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <LogicBadge label="Gemini 2.5 Flash" color="#1565c0" bg="#e3f2fd" />
                <LogicBadge label="DailyMed Labels" color="#e65100" bg="#fff3e0" />
                <LogicBadge label="FDA FAERS" color="#2e7d32" bg="#e8f5e9" />
              </div>
            </div>

            {/* A. Risk Assessment */}
            <div style={{ marginBottom: 20 }}>
              <ClinicalInsightItem
                title={
                  (d.riskScore ?? 0) >= 8 ? "Avoid — High Risk Interaction"
                  : (d.riskScore ?? 0) >= 5 ? "Caution — Moderate Risk Interaction"
                  : (d.riskScore ?? 0) >= 3 ? "Investigate — Low-Moderate Risk"
                  : "Monitor — Lower Risk Interaction"
                }
                description={
                  (d.riskScore ?? 0) >= 8 ? "This combination carries significant clinical risk. Strongly consider alternatives or implement close monitoring protocols."
                  : (d.riskScore ?? 0) >= 5 ? "This interaction poses moderate risk. Dose adjustment, additional monitoring, or alternative agents may be warranted."
                  : (d.riskScore ?? 0) >= 3 ? "Some interaction potential exists. Review patient-specific factors and monitor as clinically appropriate."
                  : "Standard precautions apply. Routine monitoring is generally sufficient."
                }
              />

              {/* FDA Label Text Excerpts */}
              {d.labelHits && d.labelHits.length > 0 && (
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                  {d.labelHits.map((hit, i) => (
                    <div key={i} style={{
                      background: hit.section === "BOXED WARNING" ? "#fdecea" : "#fff8e1",
                      borderLeft: `3px solid ${hit.section === "BOXED WARNING" ? "#d32f2f" : "#f57f17"}`,
                      borderRadius: "0 8px 8px 0",
                      padding: "10px 14px",
                    }}>
                      <div style={{
                        fontSize: 11, fontWeight: 700,
                        color: hit.section === "BOXED WARNING" ? "#d32f2f" : "#f57f17",
                        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
                      }}>
                        {hit.section} — {hit.generic_name}
                      </div>
                      <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5, fontStyle: "italic", fontFamily: "DM Sans, sans-serif" }}>
                        &ldquo;{hit.text}&rdquo;
                      </div>
                      {hit.source && (
                        <a href={hit.source} target="_blank" rel="noopener noreferrer" style={{
                          fontSize: 11, color: "#2A7D6F", fontFamily: "DM Sans, sans-serif",
                          textDecoration: "none", marginTop: 4, display: "inline-block",
                        }}
                        onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                        onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
                        >
                          Source: {hit.sourceLabel || hit.source}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* B. Gemini Clinical Narrative */}
            <div style={{ borderTop: "1px solid #e8ebe4", paddingTop: 16, marginBottom: 20 }}>
              <FormattedSummary text={d.summary} />
            </div>

            {/* C. Safer Alternatives (integrated) */}
            {d.alternatives && d.alternatives.length > 0 && (
              <div style={{ borderTop: "1px solid #e8ebe4", paddingTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0D3D3A", textTransform: "uppercase", letterSpacing: 1 }}>
                    Safer Alternatives to {d.query?.newPrescription || "Prescribed Drug"}
                  </div>
                  <LogicBadge label="Gemini Generated" color="#1565c0" bg="#e3f2fd" />
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {d.alternatives.map((alt, i) => {
                    const riskColorMap = {
                      "much-lower": { bg: "#e8f5e9", color: "#2e7d32", label: "Much Lower Risk" },
                      "lower": { bg: "#fff8e1", color: "#f57f17", label: "Lower Risk" },
                      "similar": { bg: "#fff3e0", color: "#e65100", label: "Similar Risk" },
                    };
                    const risk = riskColorMap[alt.relativeRisk] || riskColorMap["lower"];
                    return (
                      <div key={i} style={{
                        padding: "12px 0",
                        borderTop: i > 0 ? "1px solid #f0f0f0" : "none",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#0D3D3A", fontFamily: "DM Sans, sans-serif" }}>
                            {alt.drugName} + {d.query?.currentMed || "Current Med"}
                          </span>
                          <span style={{
                            background: risk.bg, color: risk.color,
                            borderRadius: 20, padding: "2px 10px",
                            fontSize: 11, fontWeight: 600, fontFamily: "DM Sans, sans-serif",
                            whiteSpace: "nowrap",
                          }}>● {risk.label}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#2e7d32", lineHeight: 1.5, fontFamily: "DM Sans, sans-serif", marginBottom: 2 }}>
                          ✓ Pro: {alt.whySafer}
                        </div>
                        <div style={{ fontSize: 13, color: "#d32f2f", lineHeight: 1.5, fontFamily: "DM Sans, sans-serif" }}>
                          ✗ Con: {alt.monitoring}
                        </div>
                        {alt.source && (
                          <a href={alt.source} target="_blank" rel="noopener noreferrer" style={{
                            fontSize: 11, color: "#2A7D6F", fontFamily: "DM Sans, sans-serif",
                            textDecoration: "none", marginTop: 4, display: "inline-block",
                          }}
                          onMouseOver={e => e.currentTarget.style.textDecoration = "underline"}
                          onMouseOut={e => e.currentTarget.style.textDecoration = "none"}
                          >
                            Source: {alt.sourceLabel || alt.source}
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Stat Cards */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0D3D3A", fontFamily: "DM Sans, sans-serif", textTransform: "uppercase", letterSpacing: 1 }}>Adverse Event Statistics</span>
          <LogicBadge
            label={d.faersSource === "gemini_estimate" ? "Gemini Estimate" : "FDA FAERS"}
            color={d.faersSource === "gemini_estimate" ? "#1565c0" : "#2e7d32"}
            bg={d.faersSource === "gemini_estimate" ? "#e3f2fd" : "#e8f5e9"}
          />
        </div>
        <div style={{ display: "flex", gap: 24, marginBottom: 28, flexWrap: "wrap" }}>
          <StatCard label="Total Reports" value={d.totalReports} sub="FDA adverse event reports" color="#2A7D6F" icon="📊" delay={0.1} />
          <StatCard label="Deaths" value={d.outcomes.deaths} sub={d.totalReports ? `${((d.outcomes.deaths/d.totalReports)*100).toFixed(1)}% of reports` : "No data"} color="#2A7D6F" icon="💀" delay={0.2} />
          <StatCard label="Hospitalized" value={d.outcomes.hospitalized} sub={d.totalReports ? `${((d.outcomes.hospitalized/d.totalReports)*100).toFixed(1)}% of reports` : "No data"} color="#2A7D6F" icon="🏥" delay={0.3} />
          <StatCard label="Life-Threatening" value={d.outcomes.lifeThreatening} sub={d.totalReports ? `${((d.outcomes.lifeThreatening/d.totalReports)*100).toFixed(1)}% of reports` : "No data"} color="#2A7D6F" icon="⚡" delay={0.4} />
          <StatCard label="Other / Non-Serious" value={d.totalReports ? Math.max(0, d.totalReports - d.outcomes.deaths - d.outcomes.hospitalized - d.outcomes.lifeThreatening) : 0} sub={d.totalReports ? `${(Math.max(0, (1 - (d.outcomes.deaths + d.outcomes.hospitalized + d.outcomes.lifeThreatening) / d.totalReports)) * 100).toFixed(1)}% of reports` : "No data"} color="#2A7D6F" icon="📋" delay={0.5} />
        </div>

        {/* Charts Row — only show when we have report data */}
        {d.totalReports > 0 && d.topReactions && d.topReactions.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 28 }}>

            {/* Top Reactions */}
            <SectionCard title="Top Reported Reactions" subtitle={`Across ${d.totalReports.toLocaleString()} matched reports`}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={d.topReactions} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#555" }} axisLine={false} tickLine={false} width={140} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }}
                    labelStyle={{ color: "#0D3D3A", fontWeight: 700, marginBottom: 2 }}
                    itemStyle={{ color: "#555" }}
                    formatter={(v) => [`${v} reports`]}
                    cursor={false}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} onMouseEnter={(_, i) => setHoveredBar(i)} onMouseLeave={() => setHoveredBar(null)}>
                    {d.topReactions.map((_, i) => (
                      <Cell key={i} fill={hoveredBar === i ? "#0D3D3A" : "#2A7D6F"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            {/* Sex Split */}
            <SectionCard title="Sex Distribution" subtitle="Among matched cases">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={d.sexSplit} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                    {d.sexSplit.map((_, i) => <Cell key={i} fill={SEX_COLORS[i]} />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={10} formatter={(v) => <span style={{ fontSize: 12, color: "#555" }}>{v}</span>} />
                  <Tooltip formatter={(v) => [`${v}%`]} contentStyle={{ borderRadius: 8, border: "none", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>
        )}

        {/* Age Distribution — only show when we have data */}
        {d.totalReports > 0 && d.ageDistribution && d.ageDistribution.some(a => a.count > 0) && (
          <div style={{ marginBottom: 28 }}>
            <SectionCard title="Age Distribution of Matched Reports" subtitle="Hover to see exact counts">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={d.ageDistribution} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2A7D6F" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#2A7D6F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "none", fontSize: 12 }} formatter={(v) => [`${v} reports`]} />
                  <Area type="monotone" dataKey="count" stroke="#2A7D6F" strokeWidth={2} fill="url(#ageGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>
        )}

        {/* Similar Cases Table */}
        <SectionCard title={<div style={{ display: "flex", alignItems: "center", gap: 10 }}><span>Most Similar Patient Cases</span><LogicBadge label="V3 Vector + Ranker" /></div>} subtitle="Ranked by semantic similarity to your patient profile">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                  {["Match", "Age / Sex", "Drugs on File", "Reactions", "Outcome", "Similarity"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, color: "#aaa", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.similarCases.map((c, i) => (
                  <>
                    <tr
                      key={c.id}
                      onClick={() => setExpandedCase(expandedCase === c.id ? null : c.id)}
                      style={{
                        borderBottom: "1px solid #f5f5f5", cursor: "pointer",
                        background: expandedCase === c.id ? "#eaf3f1" : "white",
                        transition: "background 0.2s",
                      }}
                    >
                      <td style={{ padding: "14px 12px", fontSize: 13, fontWeight: 700, color: "#2A7D6F", fontFamily: "Space Mono, monospace" }}>#{i + 1}</td>
                      <td style={{ padding: "14px 12px", fontSize: 13, color: "#333" }}>{c.age}y · {c.sex}</td>
                      <td style={{ padding: "14px 12px", fontSize: 12, color: "#555", maxWidth: 200 }}>{c.drugs}</td>
                      <td style={{ padding: "14px 12px", fontSize: 12, color: "#555", maxWidth: 360 }}>{c.reactions}</td>
                      <td style={{ padding: "14px 12px" }}><OutcomeBadge type={c.outcomeType} /></td>
                      <td style={{ padding: "14px 12px", minWidth: 140 }}><SimilarityBar value={c.similarity} /></td>
                    </tr>
                    {expandedCase === c.id && (
                      <tr key={`exp-${c.id}`} style={{ background: "#eaf3f1" }}>
                        <td colSpan={6} style={{ padding: "0 12px 16px 12px" }}>
                          <div style={{ background: "white", borderRadius: 10, padding: 16, border: "1px solid #c4d9d6", fontSize: 13, color: "#0D3D3A", lineHeight: 1.8 }}>
                            <div><strong>Full Drug List:</strong> {c.drugs}</div>
                            <div><strong>All Reactions:</strong> {c.reactions}</div>
                            <div><strong>Patient:</strong> {c.age} year old {c.sex}</div>
                            <div><strong>Outcome:</strong> <OutcomeBadge type={c.outcomeType} /></div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* ── Sphinx EDA Section ─────────────────────────────────────────── */}
        {d.severityByPair && d.severityByPair.length > 0 && (
          <>
            <div style={{
              borderTop: "2px solid #c4d9d6",
              marginTop: 40,
              marginBottom: 28,
              paddingTop: 28,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#0D3D3A", lineHeight: 1.2 }}>
                    Sphinx EDA
                  </div>
                  <LogicBadge label="Statistical Analysis" color="#0D3D3A" bg="#e0e5e3" />
                </div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
                  Exploratory data analysis across co-occurring drugs in matched cases
                </div>
              </div>
              <button
                onClick={() => navigate("/analysis")}
                style={{
                  background: "white",
                  color: "#0D3D3A",
                  border: "2px solid #0D3D3A",
                  borderRadius: 10,
                  padding: "10px 20px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                  transition: "all 0.2s",
                }}
                onMouseOver={e => { e.currentTarget.style.background = "#0D3D3A"; e.currentTarget.style.color = "white"; }}
                onMouseOut={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#0D3D3A"; }}
              >
                View System Analysis
              </button>
            </div>

            {/* Severity Distribution by Drug Pair */}
            {d.severityByPair && d.severityByPair.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <SectionCard title="Severity Distribution by Drug Pair" subtitle="Top 15 interaction pairs for this search">
                  <ResponsiveContainer width="100%" height={Math.max(400, d.severityByPair.length * 36)}>
                    <BarChart
                      data={d.severityByPair}
                      layout="vertical"
                      margin={{ left: 140, right: 20, top: 8, bottom: 8 }}
                    >
                      <XAxis type="number" tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="pair" tick={{ fontSize: 11, fill: "#555" }} axisLine={false} tickLine={false} width={140} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }}
                        formatter={(v, name) => [`${v} reports`, name]}
                      />
                      <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: "#555" }}>{v}</span>} />
                      <Bar dataKey="death" stackId="sev" fill="#0D3D3A" name="Death" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="lifeThreatening" stackId="sev" fill="#1A5C53" name="Life-Threatening" />
                      <Bar dataKey="hospitalization" stackId="sev" fill="#2A7D6F" name="Hospitalization" />
                      <Bar dataKey="other" stackId="sev" fill="#c4d9d6" name="Other" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </SectionCard>
              </div>
            )}

            {/* Demographic Risk Profile */}
            {d.demographicRisk && d.demographicRisk.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <SectionCard title="Demographic Risk Profile" subtitle="Mean severity by age group and sex for this drug pair">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={d.demographicRisk} margin={{ left: 0, right: 20, top: 8, bottom: 8 }}>
                      <XAxis dataKey="ageGroup" tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} label={{ value: "Mean Severity", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#aaa" } }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }}
                        formatter={(v, name, props) => {
                          const countKey = name + "Count";
                          const count = props.payload[countKey];
                          return [`${v.toFixed(2)} (n=${count})`, name.charAt(0).toUpperCase() + name.slice(1)];
                        }}
                      />
                      <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: "#555" }}>{v.charAt(0).toUpperCase() + v.slice(1)}</span>} />
                      <Bar dataKey="male" fill="#2A7D6F" name="male" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="female" fill="#6BB5A8" name="female" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </SectionCard>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_DATA = {
  query: {
    currentMed: "Warfarin",
    newPrescription: "Ibuprofen",
    age: 72,
    sex: "Female",
    conditions: "Atrial fibrillation, Chronic kidney disease",
  },
  totalReports: 1532,
  outcomes: {
    deaths: 47,
    hospitalized: 312,
    lifeThreatening: 89,
  },
  topReactions: [
    { name: "Renal failure", count: 210 },
    { name: "GI haemorrhage", count: 163 },
    { name: "INR increased", count: 152 },
    { name: "Acute kidney injury", count: 142 },
    { name: "Anaemia", count: 98 },
    { name: "Hyperkalaemia", count: 67 },
  ],
  sexSplit: [
    { name: "Female", value: 57 },
    { name: "Male", value: 43 },
  ],
  ageDistribution: [
    { range: "18-30", count: 12 },
    { range: "31-45", count: 34 },
    { range: "46-60", count: 89 },
    { range: "61-70", count: 198 },
    { range: "71-80", count: 312 },
    { range: "81+", count: 187 },
  ],
  similarCases: [
    {
      id: 1,
      age: 74,
      sex: "Female",
      drugs: "Warfarin, Ibuprofen",
      reactions: "Renal failure, INR increased",
      outcome: "Hospitalized",
      similarity: 89,
      outcomeType: "hospitalized",
    },
    {
      id: 2,
      age: 69,
      sex: "Female",
      drugs: "Warfarin, Lisinopril, Ibuprofen",
      reactions: "Acute kidney injury, Anaemia",
      outcome: "Fatal",
      similarity: 84,
      outcomeType: "death",
    },
    {
      id: 3,
      age: 78,
      sex: "Female",
      drugs: "Warfarin, Ibuprofen",
      reactions: "GI haemorrhage, Renal failure",
      outcome: "Life-threatening",
      similarity: 81,
      outcomeType: "lifethreat",
    },
    {
      id: 4,
      age: 71,
      sex: "Female",
      drugs: "Warfarin, Ibuprofen, Atorvastatin",
      reactions: "INR increased, GI haemorrhage",
      outcome: "Hospitalized",
      similarity: 76,
      outcomeType: "hospitalized",
    },
    {
      id: 5,
      age: 75,
      sex: "Female",
      drugs: "Warfarin, Ibuprofen",
      reactions: "Renal failure, Hyperkalaemia",
      outcome: "Hospitalized",
      similarity: 72,
      outcomeType: "hospitalized",
    },
  ],
};

const SEX_COLORS = ["#2A7D6F", "#0D3D3A"];

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

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function RxGuardDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedCase, setExpandedCase] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);
  const d = location.state?.data || MOCK_DATA;
  const parsed = location.state?.parsed || null;

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
                <div><span style={{ color: "#888" }}>Conditions: </span><strong>{parsed.preexisting_conditions.join(", ")}</strong></div>
              )}
              {parsed.current_medications?.length > 0 && (
                <div><span style={{ color: "#888" }}>Current Meds: </span><strong>{parsed.current_medications.join(", ")}</strong></div>
              )}
              {parsed.prescribed_medications?.length > 0 && (
                <div><span style={{ color: "#888" }}>Prescribed: </span><strong>{parsed.prescribed_medications.join(", ")}</strong></div>
              )}
            </div>
          </div>
        )}

        {/* Stat Cards */}
        <div style={{ display: "flex", gap: 24, marginBottom: 28, flexWrap: "wrap" }}>
          <StatCard label="Total Reports" value={d.totalReports} sub="Serious events only" color="#2A7D6F" icon="📊" delay={0.1} />
          <StatCard label="Deaths" value={d.outcomes.deaths} sub={`${((d.outcomes.deaths/d.totalReports)*100).toFixed(1)}% of reports`} color="#2A7D6F" icon="💀" delay={0.2} />
          <StatCard label="Hospitalized" value={d.outcomes.hospitalized} sub={`${((d.outcomes.hospitalized/d.totalReports)*100).toFixed(1)}% of reports`} color="#2A7D6F" icon="🏥" delay={0.3} />
          <StatCard label="Life-Threatening" value={d.outcomes.lifeThreatening} sub={`${((d.outcomes.lifeThreatening/d.totalReports)*100).toFixed(1)}% of reports`} color="#2A7D6F" icon="⚡" delay={0.4} />
        </div>

        {/* Severity Distribution */}
        {d.severityBreakdown && d.severityBreakdown.some(s => s.count > 0) && (
          <div style={{ marginBottom: 28 }}>
            <SectionCard title="Severity Distribution" subtitle="Risk profile for this drug pair">
              <ResponsiveContainer width="100%" height={100}>
                <BarChart
                  data={[d.severityBreakdown.reduce((acc, s) => ({ ...acc, [s.severity]: s.count }), {})]}
                  layout="vertical"
                  margin={{ left: 0, right: 20, top: 8, bottom: 8 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey={() => ""} hide />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }}
                    formatter={(v, name) => [`${v} reports`, name]}
                  />
                  <Bar dataKey="death" stackId="sev" fill="#d32f2f" name="Death" radius={[4, 0, 0, 4]} />
                  <Bar dataKey="life-threatening" stackId="sev" fill="#ff7f0e" name="Life-Threatening" />
                  <Bar dataKey="hospitalization" stackId="sev" fill="#1f77b4" name="Hospitalization" />
                  <Bar dataKey="other" stackId="sev" fill="#aec7e8" name="Other" radius={[0, 4, 4, 0]} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: "#555" }}>{v}</span>} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>
        )}

        {/* Charts Row */}
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

        {/* Age Distribution */}
        <div style={{ marginBottom: 28 }}>
          <SectionCard title="Age Distribution of Matched Reports" subtitle="Hover to see exact counts">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={d.ageDistribution} margin={{ left: 0, right: 20 }}>
                <defs>
                  <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2A7D6F" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2A7D6F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "none", fontSize: 12 }} formatter={(v) => [`${v} reports`]} />
                <Area type="monotone" dataKey="count" stroke="#2A7D6F" strokeWidth={2} fill="url(#ageGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* Similar Cases Table */}
        <SectionCard title="Most Similar Patient Cases" subtitle="Ranked by semantic similarity to your patient profile">
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
                <div style={{ fontSize: 28, fontWeight: 700, color: "#0D3D3A", lineHeight: 1.2 }}>
                  Sphinx EDA
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
          </>
        )}

        {/* ── Sphinx Stats & Retrieval Eval (below EDA) ─────────────────── */}

        {/* Severity Distribution */}
        {d.severityBreakdown && d.severityBreakdown.some(s => s.count > 0) && (
          <div style={{ marginBottom: 28 }}>
            <SectionCard title="Severity Distribution" subtitle="Risk profile for this drug pair">
              <ResponsiveContainer width="100%" height={100}>
                <BarChart
                  data={[d.severityBreakdown.reduce((acc, s) => ({ ...acc, [s.severity]: s.count }), {})]}
                  layout="vertical"
                  margin={{ left: 0, right: 20, top: 8, bottom: 8 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey={() => ""} hide />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }}
                    formatter={(v, name) => [`${v} reports`, name]}
                  />
                  <Bar dataKey="death" stackId="sev" fill="#0D3D3A" name="Death" radius={[4, 0, 0, 4]} />
                  <Bar dataKey="life-threatening" stackId="sev" fill="#1A5C53" name="Life-Threatening" />
                  <Bar dataKey="hospitalization" stackId="sev" fill="#2A7D6F" name="Hospitalization" />
                  <Bar dataKey="other" stackId="sev" fill="#c4d9d6" name="Other" radius={[0, 4, 4, 0]} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: "#555" }}>{v}</span>} />
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

      </div>
    </div>
  );
}

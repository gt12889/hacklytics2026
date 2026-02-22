import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const ENGINE_COLORS = { V1: "#0D3D3A", V2: "#1A5C53", V3: "#2A7D6F", "V3+R": "#8ECFC0" };

const PRESET_QUERIES = [
  { label: "72F Warfarin + Ibuprofen", query: "72-year-old female on Warfarin, adding Ibuprofen" },
  { label: "65M Metformin + Ibuprofen", query: "65-year-old male taking Metformin, considering Ibuprofen" },
  { label: "80F Coumadin + Advil", query: "80-year-old female on Coumadin, prescribed Advil" },
];

function OutcomeBadge({ type }) {
  const map = {
    death: { label: "Fatal", bg: "#e0ecea", color: "#0D3D3A" },
    hospitalized: { label: "Hospitalized", bg: "#e3f2ed", color: "#1A5C53" },
    lifethreat: { label: "Life-Threatening", bg: "#e8f0ee", color: "#2A7D6F" },
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
  const pct = Math.min(Math.max(value, 0), 100) / 100;
  const r = Math.round(196 - 154 * pct);
  const g = Math.round(217 - 92 * pct);
  const b = Math.round(214 - 103 * pct);
  const color = `rgb(${r},${g},${b})`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, background: "#f0f0f0", borderRadius: 4, height: 5, overflow: "hidden" }}>
        <div style={{ width: `${value}%`, background: color, height: "100%", borderRadius: 4 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "Space Mono, monospace", minWidth: 32 }}>{value}%</span>
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
        marginTop: -8,
        marginBottom: 16,
        fontFamily: "DM Sans, sans-serif",
      }}>{subtitle}</div>}
      {children}
    </div>
  );
}

export default function AnalysisPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [compareQuery, setCompareQuery] = useState("");
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState(null);

  async function handleCompare(e) {
    e.preventDefault();
    if (!compareQuery.trim()) return;
    setCompareLoading(true);
    setCompareError(null);
    setCompareData(null);
    try {
      const res = await fetch("/api/search-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: compareQuery }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error (${res.status})`);
      }
      const d = await res.json();
      setCompareData(d);
    } catch (err) {
      setCompareError(err.message || "Failed to fetch comparison results");
      setCompareData(null);
    }
    setCompareLoading(false);
  }

  useEffect(() => {
    fetch("/api/analysis")
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#E8EBE4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "DM Sans, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#0D3D3A", marginBottom: 12 }}>Loading Analysis...</div>
          <div style={{ fontSize: 14, color: "#888" }}>Precomputed analyses are being loaded</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#E8EBE4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "DM Sans, sans-serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#0D3D3A", marginBottom: 12 }}>Analysis Unavailable</div>
          <button
            onClick={() => navigate("/home")}
            style={{
              background: "linear-gradient(135deg, #2A7D6F, #0D3D3A)",
              color: "white", border: "none", borderRadius: 10,
              padding: "12px 24px", fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "DM Sans, sans-serif",
            }}
          >Back to Search</button>
        </div>
      </div>
    );
  }

  const heatmap = data.heatmap;
  const retrievalEval = data.retrievalEval;

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

      <div style={{ padding: "32px 48px 48px" }}>

        {/* Brand + Navigation */}
        <div style={{ marginBottom: 32, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span onClick={() => navigate("/home")} style={{ fontSize: 48, fontWeight: 700, color: "#0D3D3A", fontFamily: "Space Mono, monospace", letterSpacing: 4, textTransform: "uppercase", cursor: "pointer", transition: "opacity 0.2s" }} onMouseOver={e => e.currentTarget.style.opacity = "0.8"} onMouseOut={e => e.currentTarget.style.opacity = "1"}>RxGuard</span>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => navigate("/case-studies")}
              style={{
                background: "transparent",
                color: "#0D3D3A", border: "2px solid #c4d9d6", borderRadius: 10,
                padding: "12px 24px", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                transition: "all 0.2s",
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = "#2A7D6F"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = "#c4d9d6"; e.currentTarget.style.transform = "translateY(0)"; }}
            >Case Studies</button>
            <button
              onClick={() => navigate("/home")}
              style={{
                background: "linear-gradient(135deg, #2A7D6F, #0D3D3A)",
                color: "white", border: "none", borderRadius: 10,
                padding: "12px 24px", fontSize: 14, fontWeight: 600,
                cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                boxShadow: "0 4px 14px rgba(42,125,111,0.4)",
                transition: "all 0.2s",
              }}
              onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
            >Back to Search</button>
          </div>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 32, animation: "slideUp 0.4s ease both" }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#0D3D3A", lineHeight: 1.1 }}>
            System Analysis
          </div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
            Dataset-level insights precomputed across the full corpus
          </div>
        </div>

        {/* Drug Co-occurrence Heatmap */}
        {heatmap && (() => {
          const { drugs, matrix } = heatmap;
          const n = drugs.length;
          const cellSize = Math.max(28, Math.min(40, 700 / n));
          const labelWidth = 100;

          const severityColor = (val) => {
            if (val == null) return "#f5f5f5";
            const t = Math.min(val / 4, 1);
            const r = Math.round(232 - 219 * t);
            const g = Math.round(235 - 174 * t);
            const b = Math.round(228 - 170 * t);
            return `rgb(${r},${g},${b})`;
          };

          return (
            <div style={{ marginBottom: 28, animation: "slideUp 0.5s ease 0.1s both" }}>
              <SectionCard title="Drug Co-occurrence Heatmap" subtitle="Color = mean severity for this drug pair across the full corpus">
                <div style={{ overflowX: "auto", paddingTop: 8 }}>
                  <div style={{ display: "inline-block" }}>
                    {/* X-axis labels */}
                    <div style={{ display: "flex", marginLeft: labelWidth }}>
                      {drugs.map((drug, i) => (
                        <div key={i} style={{
                          width: cellSize, textAlign: "center", fontSize: 9,
                          fontWeight: 600, color: "#555",
                          transform: "rotate(-45deg)", transformOrigin: "center bottom",
                          whiteSpace: "nowrap", height: 60, display: "flex",
                          alignItems: "flex-end", justifyContent: "center",
                        }}>{drug}</div>
                      ))}
                    </div>
                    {/* Rows */}
                    {matrix.map((row, ri) => (
                      <div key={ri} style={{ display: "flex", alignItems: "center" }}>
                        <div style={{
                          width: labelWidth, fontSize: 10, fontWeight: 600,
                          color: "#555", textAlign: "right", paddingRight: 6,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{drugs[ri]}</div>
                        {row.map((val, ci) => (
                          <div
                            key={ci}
                            style={{
                              width: cellSize, height: cellSize,
                              background: ri === ci ? "#e0e0e0" : severityColor(val),
                              border: "1px solid #fff",
                              borderRadius: 2,
                              cursor: val != null && ri !== ci ? "pointer" : "default",
                              position: "relative",
                            }}
                            onMouseEnter={() => val != null && ri !== ci && setHoveredCell({ ri, ci, val })}
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            {hoveredCell && hoveredCell.ri === ri && hoveredCell.ci === ci && (
                              <div style={{
                                position: "absolute", bottom: "110%", left: "50%",
                                transform: "translateX(-50%)", background: "#0D3D3A",
                                color: "white", padding: "4px 8px", borderRadius: 6,
                                fontSize: 11, whiteSpace: "nowrap", zIndex: 10,
                                pointerEvents: "none",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                              }}>
                                {drugs[ri]} + {drugs[ci]}: {val.toFixed(2)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                    {/* Legend */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, marginLeft: labelWidth }}>
                      <span style={{ fontSize: 10, color: "#888" }}>Low</span>
                      <div style={{
                        width: 120, height: 10, borderRadius: 4,
                        background: "linear-gradient(to right, #E8EBE4, #8ECFC0, #2A7D6F, #0D3D3A)",
                      }} />
                      <span style={{ fontSize: 10, color: "#888" }}>High Severity</span>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          );
        })()}

        {/* Retrieval Engine Comparison */}
        {retrievalEval && retrievalEval.engines && (
          <div style={{ marginBottom: 28, animation: "slideUp 0.5s ease 0.2s both" }}>
            <SectionCard
              title="Retrieval Engine Comparison"
              subtitle={`Averaged across ${retrievalEval.queryCount} test queries`}
            >
              {/* Metrics Table */}
              <div style={{ overflowX: "auto", marginBottom: 24 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                      {["Engine", "P@5", "P@10", "R@5", "R@10", "NDCG@5", "NDCG@10", "MRR"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: h === "Engine" ? "left" : "right", fontSize: 11, color: "#aaa", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {retrievalEval.engines.map(eng => (
                      <tr key={eng.engine} style={{
                        borderBottom: "1px solid #f5f5f5",
                        background: "white",
                      }}>
                        <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, color: "#0D3D3A", fontFamily: "Space Mono, monospace" }}>
                          {eng.engine}
                        </td>
                        {["P@5", "P@10", "R@5", "R@10", "NDCG@5", "NDCG@10", "MRR"].map(m => (
                          <td key={m} style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontFamily: "Space Mono, monospace", color: "#333" }}>
                            {eng.metrics[m] != null ? (eng.metrics[m] * 100).toFixed(1) + "%" : "\u2014"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Grouped Bar Chart */}
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={["P@5", "R@10", "NDCG@10", "MRR"].map(m => ({
                    metric: m,
                    V1: (retrievalEval.engines.find(e => e.engine === "V1")?.metrics[m] || 0),
                    V2: (retrievalEval.engines.find(e => e.engine === "V2")?.metrics[m] || 0),
                    V3: (retrievalEval.engines.find(e => e.engine === "V3")?.metrics[m] || 0),
                    "V3+R": (retrievalEval.engines.find(e => e.engine === "V3+R")?.metrics[m] || 0),
                  }))}
                  margin={{ left: 0, right: 20, top: 8, bottom: 8 }}
                >
                  <XAxis dataKey="metric" tick={{ fontSize: 12, fill: "#555" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }}
                    formatter={(v, name) => [`${(v * 100).toFixed(1)}%`, name]}
                  />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, color: "#555" }}>{v}</span>} />
                  <Bar dataKey="V1" fill="#0D3D3A" name="V1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="V2" fill="#1A5C53" name="V2" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="V3" fill="#2A7D6F" name="V3" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="V3+R" fill="#8ECFC0" name="V3+R" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>
        )}

        {/* ── Try a Query: Per-Query Comparison ────────────────────────── */}
        <div style={{
          borderTop: "2px solid #c4d9d6",
          marginTop: 12,
          paddingTop: 28,
          animation: "slideUp 0.5s ease 0.3s both",
        }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#0D3D3A", lineHeight: 1.2, marginBottom: 4 }}>
            Try a Query
          </div>
          <div style={{ fontSize: 13, color: "#888", marginBottom: 20 }}>
            Compare how all 4 retrieval engines perform on a single query
          </div>

          {/* Query input */}
          <form onSubmit={handleCompare} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            <input
              type="text"
              value={compareQuery}
              onChange={e => setCompareQuery(e.target.value)}
              placeholder="e.g. 72-year-old female on Warfarin, adding Ibuprofen"
              style={{
                flex: 1,
                padding: "12px 16px",
                fontSize: 14,
                fontFamily: "DM Sans, sans-serif",
                border: "2px solid #c4d9d6",
                borderRadius: 12,
                outline: "none",
                background: "white",
                color: "#0D3D3A",
                transition: "border-color 0.2s",
              }}
              onFocus={e => e.target.style.borderColor = "#2A7D6F"}
              onBlur={e => e.target.style.borderColor = "#c4d9d6"}
            />
            <button
              type="submit"
              disabled={compareLoading || !compareQuery.trim()}
              style={{
                background: compareLoading ? "#aaa" : "linear-gradient(135deg, #2A7D6F, #0D3D3A)",
                color: "white",
                border: "none",
                borderRadius: 12,
                padding: "12px 28px",
                fontSize: 14,
                fontWeight: 600,
                cursor: compareLoading ? "wait" : "pointer",
                fontFamily: "DM Sans, sans-serif",
                boxShadow: "0 4px 14px rgba(42,125,111,0.3)",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {compareLoading ? "Comparing..." : "Compare"}
            </button>
          </form>

          {/* Preset chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
            {PRESET_QUERIES.map((pq, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCompareQuery(pq.query)}
                style={{
                  background: compareQuery === pq.query ? "#0D3D3A" : "#f0f4f3",
                  color: compareQuery === pq.query ? "white" : "#0D3D3A",
                  border: "1px solid #c4d9d6",
                  borderRadius: 20,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                  transition: "all 0.2s",
                }}
                onMouseOver={e => { if (compareQuery !== pq.query) e.currentTarget.style.background = "#e0ebe8"; }}
                onMouseOut={e => { if (compareQuery !== pq.query) e.currentTarget.style.background = "#f0f4f3"; }}
              >
                {pq.label}
              </button>
            ))}
          </div>

          {/* Error display */}
          {compareError && (
            <div style={{
              background: "#e0ecea",
              border: "1px solid #a8c9c4",
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 13,
              color: "#0D3D3A",
              marginBottom: 20,
            }}>
              {compareError}
            </div>
          )}

          {/* Comparison Results */}
          {compareData && compareData.engines && (() => {
            const hasMetrics = compareData.engines.some(e => e.metrics != null);
            const metricNames = ["P@5", "P@10", "R@5", "R@10", "NDCG@5", "NDCG@10", "MRR"];
            const drugLabel = compareData.query.drugs?.length >= 2
              ? `${compareData.query.currentMed} + ${compareData.query.newPrescription}`
              : compareData.query.drugs?.join(", ") || "";

            return (
              <>
                {/* Subtitle */}
                <div style={{ fontSize: 13, color: "#555", marginBottom: 16 }}>
                  {drugLabel && <strong>{drugLabel}</strong>}
                  {compareData.relevantCount != null
                    ? <> &mdash; {compareData.relevantCount} relevant cases in corpus of {compareData.corpusSize}</>
                    : <> &mdash; corpus of {compareData.corpusSize} cases</>
                  }
                </div>

                {/* Per-query metrics table + chart */}
                {hasMetrics ? (
                  <div style={{ marginBottom: 28 }}>
                    <SectionCard title="Per-Query Metrics" subtitle={`Ground truth: ${compareData.relevantCount} relevant cases`}>
                      <div style={{ overflowX: "auto", marginBottom: 24 }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ borderBottom: "2px solid #f0f0f0" }}>
                              {["Engine", ...metricNames].map(h => (
                                <th key={h} style={{ padding: "8px 12px", textAlign: h === "Engine" ? "left" : "right", fontSize: 11, color: "#aaa", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {compareData.engines.map(eng => (
                              <tr key={eng.engine} style={{ borderBottom: "1px solid #f5f5f5" }}>
                                <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 700, fontFamily: "Space Mono, monospace", color: ENGINE_COLORS[eng.engine] || "#0D3D3A" }}>
                                  {eng.engine}
                                </td>
                                {metricNames.map(m => (
                                  <td key={m} style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontFamily: "Space Mono, monospace", color: "#333" }}>
                                    {eng.metrics && eng.metrics[m] != null ? (eng.metrics[m] * 100).toFixed(1) + "%" : "\u2014"}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Per-query bar chart */}
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={["P@5", "R@10", "NDCG@10", "MRR"].map(m => ({
                            metric: m,
                            V1: compareData.engines.find(e => e.engine === "V1")?.metrics?.[m] || 0,
                            V2: compareData.engines.find(e => e.engine === "V2")?.metrics?.[m] || 0,
                            V3: compareData.engines.find(e => e.engine === "V3")?.metrics?.[m] || 0,
                            "V3+R": compareData.engines.find(e => e.engine === "V3+R")?.metrics?.[m] || 0,
                          }))}
                          margin={{ left: 0, right: 20, top: 8, bottom: 8 }}
                        >
                          <XAxis dataKey="metric" tick={{ fontSize: 12, fill: "#555" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: "#aaa" }} axisLine={false} tickLine={false} domain={[0, 1]} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontSize: 12 }}
                            formatter={(v, name) => [`${(v * 100).toFixed(1)}%`, name]}
                          />
                          <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ fontSize: 11, color: "#555" }}>{v}</span>} />
                          <Bar dataKey="V1" fill={ENGINE_COLORS.V1} name="V1" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="V2" fill={ENGINE_COLORS.V2} name="V2" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="V3" fill={ENGINE_COLORS.V3} name="V3" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="V3+R" fill={ENGINE_COLORS["V3+R"]} name="V3+R" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </SectionCard>
                  </div>
                ) : (
                  <div style={{
                    background: "#e8f0ee",
                    border: "1px solid #b0d4cc",
                    borderRadius: 10,
                    padding: "12px 16px",
                    fontSize: 13,
                    color: "#1A5C53",
                    marginBottom: 28,
                  }}>
                    No ground-truth data for this drug pair &mdash; metrics unavailable. Results are still shown below.
                  </div>
                )}

                {/* Side-by-side results — 4-column grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 16,
                  marginBottom: 28,
                }}>
                  {compareData.engines.map(eng => {
                    const color = ENGINE_COLORS[eng.engine] || "#0D3D3A";
                    return (
                      <div key={eng.engine} style={{
                        background: "white",
                        borderRadius: 14,
                        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                        overflow: "hidden",
                      }}>
                        {/* Colored header */}
                        <div style={{
                          background: color,
                          color: "white",
                          padding: "10px 14px",
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: "Space Mono, monospace",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}>
                          <span>{eng.engine}</span>
                          <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>{eng.results.length} results</span>
                        </div>
                        {/* Results list */}
                        <div style={{ padding: "8px 10px", maxHeight: 560, overflowY: "auto" }}>
                          {eng.results.map(r => (
                            <div key={r.rank} style={{
                              padding: "8px 6px",
                              borderBottom: "1px solid #f5f5f5",
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "Space Mono, monospace" }}>#{r.rank}</span>
                                <OutcomeBadge type={r.outcomeType} />
                              </div>
                              <div style={{ fontSize: 11, color: "#555", marginBottom: 3 }}>{r.drugs}</div>
                              <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{r.age}y &middot; {r.sex}</div>
                              <SimilarityBar value={r.similarity} />
                            </div>
                          ))}
                          {eng.results.length === 0 && (
                            <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "#aaa" }}>No results</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>

      </div>
    </div>
  );
}

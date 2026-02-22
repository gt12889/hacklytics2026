import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [examples, setExamples] = useState([]);

  useEffect(() => {
    fetch("/api/suggestions")
      .then(res => res.json())
      .then(d => setExamples(d.examples || []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const [searchRes, parseRes] = await Promise.all([
        fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, engine: "v3" }),
        }),
        fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: query }),
        }),
      ]);
      if (!searchRes.ok) {
        const detail = await searchRes.json().catch(() => ({}));
        throw new Error(detail.detail || `Server error ${searchRes.status}`);
      }
      const data = await searchRes.json();
      const parsed = parseRes.ok ? await parseRes.json().catch(() => null) : null;
      navigate("/result", { state: { data, parsed } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#E8EBE4",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "DM Sans, sans-serif",
      padding: "40px 24px",
      position: "relative",
    }}>
      <Link
        to="/"
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "#0D3D3A",
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "DM Sans, sans-serif",
          transition: "opacity 0.2s",
        }}
        onMouseOver={e => e.currentTarget.style.opacity = "0.6"}
        onMouseOut={e => e.currentTarget.style.opacity = "1"}
      >
        <span style={{ fontSize: 24 }}>&larr;</span>
      </Link>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ marginBottom: 48, textAlign: "center" }}>
        <Link to="/home" style={{ textDecoration: "none", cursor: "pointer", display: "inline-block", transition: "opacity 0.2s" }} onMouseOver={e => e.currentTarget.style.opacity = "0.8"} onMouseOut={e => e.currentTarget.style.opacity = "1"}>
          <div style={{ fontSize: 52, fontWeight: 700, color: "#0D3D3A", fontFamily: "Space Mono, monospace", letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>
            RxGuard
          </div>
        </Link>
        <div style={{ fontSize: 14, color: "#2A7D6F", fontFamily: "DM Sans, sans-serif", letterSpacing: 1 }}>
          Adverse event intelligence, powered by FDA data
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "white",
          borderRadius: 20,
          boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
          padding: "40px 48px",
          width: "100%",
          maxWidth: 960,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0D3D3A", marginBottom: 8, lineHeight: 1.3 }}>
            Provide your patient's clinical background and the medication you're considering.
          </div>
          <div style={{ fontSize: 14, color: "#888" }}>
            Include age, gender, current medications, preexisting conditions, proposed prescription.
          </div>
        </div>

        <textarea
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="e.g. 72-year-old female with atrial fibrillation and chronic kidney disease, currently on Warfarin. Considering adding Ibuprofen for arthritis pain management."
          required
          rows={9}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 18px",
            fontSize: 15,
            fontFamily: "DM Sans, sans-serif",
            border: "2px solid #e0e5e3",
            borderRadius: 10,
            outline: "none",
            color: "#0D3D3A",
            transition: "border-color 0.2s",
            background: loading ? "#f0f0f0" : "#fafafa",
            resize: "vertical",
            lineHeight: 1.6,
          }}
          onFocus={e => e.target.style.borderColor = "#2A7D6F"}
          onBlur={e => e.target.style.borderColor = "#e0e5e3"}
        />

        {examples.length > 0 && !loading && (
          <div>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
              Try an example
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {examples.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setQuery(ex.query)}
                  style={{
                    background: query === ex.query ? "#0D3D3A" : "#f0f4f3",
                    color: query === ex.query ? "white" : "#0D3D3A",
                    border: "1px solid #c4d9d6",
                    borderRadius: 20,
                    padding: "6px 14px",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "DM Sans, sans-serif",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={e => { if (query !== ex.query) { e.currentTarget.style.background = "#e0ebe8"; } }}
                  onMouseOut={e => { if (query !== ex.query) { e.currentTarget.style.background = "#f0f4f3"; } }}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: "#fdecea", color: "#d32f2f",
            borderRadius: 8, padding: "10px 14px",
            fontSize: 13, fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading
              ? "#aaa"
              : "linear-gradient(135deg, #2A7D6F, #0D3D3A)",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "14px 24px",
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "DM Sans, sans-serif",
            boxShadow: loading ? "none" : "0 4px 14px rgba(42,125,111,0.35)",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
          onMouseOver={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
        >
          {loading && (
            <span style={{
              width: 18, height: 18,
              border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "white",
              borderRadius: "50%",
              display: "inline-block",
              animation: "spin 0.6s linear infinite",
            }} />
          )}
          {loading ? "Analyzing ..." : "Analyze Adverse Event Risk"}
        </button>
      </form>
    </div>
  );
}

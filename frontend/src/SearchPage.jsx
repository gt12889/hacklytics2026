import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Type-ahead state
  const [drugList, setDrugList] = useState([]);
  const [examples, setExamples] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const textareaRef = useRef(null);

  // Fetch suggestions on mount
  useEffect(() => {
    fetch("/api/suggestions")
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setDrugList(data.drugs || []);
        setExamples(data.examples || []);
      })
      .catch(() => {}); // non-critical
  }, []);

  function getCurrentWord(text, cursorPos) {
    let start = cursorPos;
    while (start > 0 && /[a-zA-Z]/.test(text[start - 1])) start--;
    return { word: text.slice(start, cursorPos), start, end: cursorPos };
  }

  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    const cursor = e.target.selectionStart;
    const { word } = getCurrentWord(val, cursor);
    if (word.length >= 2) {
      const lower = word.toLowerCase();
      const matches = drugList.filter(d => d.startsWith(lower)).slice(0, 6);
      if (matches.length > 0) {
        setSuggestions(matches);
        setSelectedIdx(-1);
        setShowDropdown(true);
        return;
      }
    }
    setShowDropdown(false);
  }

  function acceptSuggestion(drugName) {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const { start, end } = getCurrentWord(query, cursor);
    const capitalized = drugName.charAt(0).toUpperCase() + drugName.slice(1);
    const newQuery = query.slice(0, start) + capitalized + query.slice(end);
    setQuery(newQuery);
    setShowDropdown(false);
    const newCursor = start + capitalized.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newCursor, newCursor);
    });
  }

  function handleKeyDown(e) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(prev => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === "Enter" && selectedIdx >= 0) {
      e.preventDefault();
      acceptSuggestion(suggestions[selectedIdx]);
    } else if (e.key === "Tab" && selectedIdx >= 0) {
      e.preventDefault();
      acceptSuggestion(suggestions[selectedIdx]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowDropdown(false);
    }
  }

  function handleBlur(e) {
    e.target.style.borderColor = "#e0e5e3";
    setTimeout(() => setShowDropdown(false), 150);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Call both endpoints in parallel
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
    }}>
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

        <div style={{ position: "relative" }}>
          <textarea
            ref={textareaRef}
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
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
            onBlur={handleBlur}
          />

          {showDropdown && suggestions.length > 0 && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 4,
              background: "white",
              borderRadius: 10,
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              border: "1px solid #e0e5e3",
              zIndex: 10,
              overflow: "hidden",
            }}>
              {suggestions.map((drug, i) => (
                <div
                  key={drug}
                  onMouseDown={() => acceptSuggestion(drug)}
                  onMouseEnter={() => setSelectedIdx(i)}
                  style={{
                    padding: "10px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: i === selectedIdx ? "#eaf3f1" : "white",
                    transition: "background 0.1s",
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 14,
                    color: "#0D3D3A",
                  }}
                >
                  <span style={{
                    fontFamily: "Space Mono, monospace",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#2A7D6F",
                    background: "#eaf3f1",
                    padding: "2px 6px",
                    borderRadius: 4,
                    letterSpacing: 1,
                  }}>Rx</span>
                  {drug.charAt(0).toUpperCase() + drug.slice(1)}
                </div>
              ))}
            </div>
          )}
        </div>

        {examples.length > 0 && !query && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#888", fontWeight: 500 }}>Try an example:</span>
            {examples.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setQuery(ex.query)}
                style={{
                  background: "#eaf3f1",
                  border: "1px solid #c4d9d6",
                  borderRadius: 20,
                  padding: "6px 14px",
                  fontSize: 13,
                  fontFamily: "DM Sans, sans-serif",
                  color: "#0D3D3A",
                  cursor: "pointer",
                  fontWeight: 500,
                  transition: "all 0.15s",
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = "#2A7D6F";
                  e.currentTarget.style.color = "white";
                  e.currentTarget.style.borderColor = "#2A7D6F";
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = "#eaf3f1";
                  e.currentTarget.style.color = "#0D3D3A";
                  e.currentTarget.style.borderColor = "#c4d9d6";
                }}
              >
                {ex.label}
              </button>
            ))}
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

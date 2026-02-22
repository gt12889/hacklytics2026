export default function SearchPage({ onSearch }) {
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
      `}</style>

      <div style={{ marginBottom: 48, textAlign: "center" }}>
        <div style={{ fontSize: 52, fontWeight: 700, color: "#0D3D3A", fontFamily: "Space Mono, monospace", letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>
          RxGuard
        </div>
        <div style={{ fontSize: 14, color: "#2A7D6F", fontFamily: "DM Sans, sans-serif", letterSpacing: 1 }}>
          Adverse event intelligence, powered by FDA data
        </div>
      </div>

      <form
        onSubmit={e => { e.preventDefault(); onSearch(); }}
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
          placeholder="e.g. 72-year-old female with atrial fibrillation and chronic kidney disease, currently on Warfarin. Considering adding Ibuprofen for arthritis pain management."
          required
          rows={9}
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
            background: "#fafafa",
            resize: "vertical",
            lineHeight: 1.6,
          }}
          onFocus={e => e.target.style.borderColor = "#2A7D6F"}
          onBlur={e => e.target.style.borderColor = "#e0e5e3"}
        />

        <button
          type="submit"
          style={{
            background: "linear-gradient(135deg, #2A7D6F, #0D3D3A)",
            color: "white",
            border: "none",
            borderRadius: 10,
            padding: "14px 24px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            boxShadow: "0 4px 14px rgba(42,125,111,0.35)",
            transition: "all 0.2s",
          }}
          onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
        >
          Analyze Adverse Event Risk
        </button>
      </form>
    </div>
  );
}

import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0D3D3A 0%, #1A5C53 50%, #2A7D6F 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Sans', sans-serif",
        padding: 24,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Mono:wght@700&display=swap');
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .notfound-home-btn:hover {
          background: #1A5C53 !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(42, 125, 111, 0.4);
        }
        .notfound-search-btn:hover {
          background: rgba(255,255,255,0.15) !important;
          transform: translateY(-2px);
        }
      `}</style>

      <div
        style={{
          maxWidth: 520,
          width: "100%",
          textAlign: "center",
          animation: "fadeInUp 0.6s ease-out",
        }}
      >
        <h1
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 120,
            color: "rgba(232, 235, 228, 0.12)",
            margin: 0,
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          404
        </h1>

        <h2
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: 30,
            color: "#E8EBE4",
            margin: "-10px 0 12px",
            letterSpacing: "-0.02em",
          }}
        >
          Page not found
        </h2>

        <p
          style={{
            fontSize: 17,
            color: "rgba(232, 235, 228, 0.7)",
            margin: "0 0 36px",
            lineHeight: 1.6,
          }}
        >
          The page you&#39;re looking for doesn&#39;t exist or has been moved.
          Let&#39;s get you back on track.
        </p>

        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <button
              className="notfound-home-btn"
              style={{
                background: "#2A7D6F",
                color: "#E8EBE4",
                border: "none",
                borderRadius: 10,
                padding: "14px 32px",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer",
                transition: "all 0.25s ease",
              }}
            >
              &larr; Back to Home
            </button>
          </Link>

          <Link to="/home" style={{ textDecoration: "none" }}>
            <button
              className="notfound-search-btn"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#E8EBE4",
                border: "1px solid rgba(232, 235, 228, 0.2)",
                borderRadius: 10,
                padding: "14px 32px",
                fontSize: 15,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: "pointer",
                transition: "all 0.25s ease",
              }}
            >
              Go to Search
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

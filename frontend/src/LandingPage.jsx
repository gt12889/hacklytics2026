import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: "100vh", background: "#0D3D3A", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ fontFamily: "Space Mono, monospace" }}>RxGuard Landing Page</h1>
    </div>
  );
}

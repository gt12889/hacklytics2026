import { Routes, Route, Navigate } from "react-router-dom";
import SearchPage from "./SearchPage";
import RxGuardDashboard from "./rxguard_dashboard";
import LandingPage from "./LandingPage";
import AnalysisPage from "./AnalysisPage";
import CaseStudiesPage from "./CaseStudiesPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/home" element={<SearchPage />} />
      <Route path="/result" element={<RxGuardDashboard />} />
      <Route path="/analysis" element={<AnalysisPage />} />
      <Route path="/case-studies" element={<CaseStudiesPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

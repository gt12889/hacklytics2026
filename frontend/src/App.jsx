import { useState } from "react";
import RxGuardDashboard from "./rxguard_dashboard";
import SearchPage from "./SearchPage";

export default function App() {
  const [page, setPage] = useState("search");

  if (page === "search") {
    return <SearchPage onSearch={() => setPage("dashboard")} />;
  }
  return <RxGuardDashboard onNewSearch={() => setPage("search")} />;
}

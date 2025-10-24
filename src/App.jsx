// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import ActivityLog from "./pages/ActivityLog";
import Boats from "./pages/Boats";
import Vendors from "./pages/Vendors";
import MarinaActivity from "./pages/MarinaActivity";
import Users from "./pages/Users";
import EconomicValueDashboard from "./pages/EconomicValueDashboard";
import SiteSettings from "./pages/SiteSettings";

/* ---------- Tenant context ---------- */
export const TenantContext = React.createContext({ tenantId: "", setTenantId: () => {} });
export const useTenant = () => React.useContext(TenantContext);

/* ---------- API helper (reads VITE_API_BASE_URL) ---------- */
const API_BASE = (
  import.meta?.env?.VITE_API_BASE_URL ||     // <-- your .env
  import.meta?.env?.VITE_API_BASE ||         // optional legacy
  "http://localhost:4000"                    // sensible default for your logs
).replace(/\/$/, "");

async function api(path, params = {}) {
  const url = new URL(API_BASE + path, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), { credentials: "include" });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  if (!ct.includes("application/json")) {
    const txt = await res.text();
    throw new Error(`Expected JSON from ${url.pathname}, got ${ct}. ${txt?.startsWith("<!doctype") ? "Check VITE_API_BASE_URL or proxy." : ""}`);
  }
  return res.json();
}

export default function App() {
  const [marinas, setMarinas] = React.useState([]);
  const [selectedSiteId, setSelectedSiteId] = React.useState("");
  const [loadErr, setLoadErr] = React.useState("");

  // Load marinas from backend (no hardcoded list)
  React.useEffect(() => {
    let alive = true;
    setLoadErr("");
    api("/api/marinas")
      .then((data) => {
        if (!alive) return;
        const items = data?.items || data || [];
        const normalized = items.map((m) => ({
          id: m.slug || String(m.id),
          name: m.name || m.display_name || "Untitled",
        }));
        setMarinas(normalized);
        const def = normalized.find((m) => m.id === "f3") || normalized[0];
        setSelectedSiteId(def ? def.id : "");
      })
      .catch((e) => {
        if (!alive) return;
        setLoadErr(e.message || "Failed to load marinas");
        console.error("Failed to load marinas:", e);
      });
    return () => { alive = false; };
  }, []);

  const handleChangeSite = (site) => {
    if (site.id === "__create__") {
      alert("TODO: Open 'Create new site' dialog");
      return;
    }
    setSelectedSiteId(site.id);
  };

  const currentSiteName =
    marinas.find((s) => s.id === selectedSiteId)?.name || "Select site";

  return (
    <TenantContext.Provider value={{ tenantId: selectedSiteId, setTenantId: setSelectedSiteId }}>
      <BrowserRouter>
        <Sidebar />

        <div className="min-h-screen bg-slate-50 pl-[260px] dark:bg-[hsl(var(--background))]">
          <Topbar
            siteName={currentSiteName}
            Marinas={marinas}
            selectedSiteId={selectedSiteId}
            onChangeSite={handleChangeSite}
            onOpenSettings={() => console.log("Settings opened")}
            onOpenNotifications={() => console.log("Notifications opened")}
            onOpenProfile={() => console.log("Profile opened")}
          />

          {loadErr && (
            <div className="mx-6 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              {loadErr}
            </div>
          )}

          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/activity" element={<ActivityLog apiBase={API_BASE} />} />
            <Route path="/boats" element={<Boats apiBase={API_BASE} />} />
            <Route path="/vendors" element={<Vendors apiBase={API_BASE} />} />
            <Route path="/marina-activity" element={<MarinaActivity />} />
            <Route path="/settings" element={<SiteSettings />} />
            <Route path="/users" element={<Users />} />
            <Route path="/economic-value" element={<EconomicValueDashboard apiBase={API_BASE} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TenantContext.Provider>
  );
}

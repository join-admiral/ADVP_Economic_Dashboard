// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useTenant } from "../App";

// logos (same assets as Topbar)
import lightLogo from "../components/images/headerLogo.svg";
import darkLogo from "../components/images/headerLogoDark.svg";

/* ---------------------------- tiny UI primitives ---------------------------- */
const Card = ({ className = "", children, title, right }) => (
  <div className={`relative rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 shadow-xl shadow-slate-200/50 backdrop-blur-sm overflow-hidden ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
    <div className="relative">
      {(title || right) && (
        <div className="flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-sm px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            {title}
          </h3>
          {right}
        </div>
      )}
      {children}
    </div>
  </div>
);

const StatCard = ({ label, value }) => (
  <div className="group relative rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-5 shadow-xl shadow-slate-200/50 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-blue-200/40 hover:-translate-y-1">
    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    <div className="relative">
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{label}</div>
      <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600">
        {value}
      </div>
    </div>
  </div>
);

const Dot = ({ className = "" }) => (
  <span className={`inline-block h-2.5 w-2.5 rounded-full ${className}`} />
);

/* --------------------------------- helpers --------------------------------- */
const fmtTimeHM = (date) =>
  new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const fmtHM = (mins) => {
  const h = Math.floor((mins || 0) / 60);
  const m = Math.max(0, (mins || 0) % 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
};

// observe dark / light change (same behavior as Topbar)
function useDarkModeFlag() {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "dark") return true;
      if (stored === "light") return false;
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();

    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const mediaCb = () => update();
    media?.addEventListener?.("change", mediaCb);

    const storageCb = () => update();
    window.addEventListener("storage", storageCb);

    return () => {
      obs.disconnect();
      media?.removeEventListener?.("change", mediaCb);
      window.removeEventListener("storage", storageCb);
    };
  }, []);

  return isDark;
}

/* ---------------------------- data fetching hook ---------------------------- */
function useDashboardData({ apiBase, tenantKey, autoRefresh }) {
  const [state, setState] = useState({
    metrics: {
      active_vendors: 0,
      checkins: 0,
      checkouts: 0,
      total_vendors_today: 0,
      avg_time_on_site_mins: 0,
    },
    hourly: [],
    feed: [],
    topVendors: [],
    topVessels: [],
    error: "",
    loading: false,
  });

  useEffect(() => {
    if (!tenantKey) return;
    let alive = true;

    const base = (apiBase || "").replace(/\/$/, "");
    const headers = { "X-Tenant-Id": String(tenantKey) };

    const fetchActivity = (path) => {
      const sep = path.includes("?") ? "&" : "?";
      const url = `${base}${path}${sep}tenantId=${encodeURIComponent(tenantKey)}`;
      return fetch(url, { credentials: "include", headers }).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        return j;
      });
    };

    const fetchEconomics = (path) => {
      const sep = path.includes("?") ? "&" : "?";
      const url = `${base}${path}${sep}tenantId=${encodeURIComponent(tenantKey)}`;
      return fetch(url, { credentials: "include", headers }).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
        return j;
      });
    };

    async function load() {
      try {
        if (!alive) return;
        setState((s) => ({ ...s, loading: true, error: "" }));

        const [m, h, f, v, b] = await Promise.all([
          fetchActivity(`/api/activity/metrics`),
          fetchActivity(`/api/activity/hourly`),
          fetchActivity(`/api/activity/feed?limit=10`),
          fetchEconomics(`/api/economics/vendors`),
          fetchEconomics(`/api/economics/vessels`),
        ]);

        if (!alive) return;
        setState({
          metrics: m || state.metrics,
          hourly: h?.items || [],
          feed: f?.items || [],
          topVendors: (v?.items || []).map((x) => x.company_name).filter(Boolean).slice(0, 3),
          topVessels: (b?.items || []).map((x) => x.boat_name).filter(Boolean).slice(0, 3),
          loading: false,
          error: "",
        });
      } catch (e) {
        if (!alive) return;
        setState((s) => ({ ...s, loading: false, error: e?.message || "Load failed" }));
      }
    }

    load();

    if (autoRefresh) {
      const id = setInterval(load, 60000);
      return () => {
        alive = false;
        clearInterval(id);
      };
    }
    return () => {
      alive = false;
    };
  }, [apiBase, tenantKey, autoRefresh]);

  return state;
}

/* --------------------------------- page ----------------------------------- */
export default function Dashboard() {
  const { tenantId } = useTenant();
  const tenantKey = tenantId || undefined;

  const API_BASE = (
    import.meta?.env?.VITE_API_BASE_URL ||
    import.meta?.env?.VITE_API_BASE ||
    "http://localhost:4000"
  ).replace(/\/$/, "");

  const [autoRefresh, setAutoRefresh] = useState(false);
  const isDark = useDarkModeFlag();

  const { metrics, hourly, feed, topVendors, topVessels } = useDashboardData({
    apiBase: API_BASE,
    tenantKey,
    autoRefresh,
  });

  const chartLegend = (
    <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
      <div className="flex items-center gap-2">
        <Dot className="bg-slate-400 shadow-sm" />
        Active Vendors
      </div>
      <div className="flex items-center gap-2">
        <Dot className="bg-orange-500 shadow-sm shadow-orange-500/30" />
        Check-ins
      </div>
      <div className="flex items-center gap-2">
        <Dot className="bg-gray-500 shadow-sm" />
        Check-outs
      </div>
    </div>
  );

  return (
    <div className="px-5 py-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen">
      {process.env.NODE_ENV !== "production" && (
        <div className="mb-3 text-[11px] text-slate-400 font-mono">
          tenantId sent: <code>{String(tenantKey || "—")}</code>
        </div>
      )}

      {/* top stats row — 3 stat boxes + logo column */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 items-center">
        <StatCard label="Active Vendors" value={metrics.active_vendors} />
        <StatCard label="Check-ins" value={metrics.checkins} />
        <StatCard label="Check-outs" value={metrics.checkouts} />

        {/* logo now aligned in the same row as the 3 boxes */}
        <div className="flex justify-center items-center p-4 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 shadow-xl shadow-slate-200/50">
          <img
            src={isDark ? darkLogo : lightLogo}
            alt="Logo"
            className="h-12 md:h-14 xl:h-16 w-auto object-contain"
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* left column span 3 */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          {/* chart */}
          <Card
            title="Today's Vendor Activity (7AM - 7PM)"
            right={
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {chartLegend}
                <label className="ml-3 inline-flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="accent-blue-600 w-4 h-4 cursor-pointer"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                  <span className="font-semibold text-slate-600 group-hover:text-blue-600 transition-colors">
                    Auto refresh
                  </span>
                </label>
              </div>
            }
          >
            <div className="px-5 pb-5 pt-4">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                {new Date().toLocaleDateString(undefined, {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
              </div>
              <div className="h-[300px] min-w-full">
                <ResponsiveContainer key={hourly?.length || 0} width="100%" height="100%">
                  <ComposedChart data={hourly || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} stroke="#cbd5e1" />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                      stroke="#cbd5e1"
                      domain={[0, "dataMax + 1"]}
                      label={{
                        value: "Active Vendors",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#64748b",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }}
                      stroke="#cbd5e1"
                      domain={[0, "dataMax + 1"]}
                      label={{
                        value: "Check-ins/Check-outs",
                        angle: -90,
                        position: "insideRight",
                        fill: "#64748b",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    />
                    <Tooltip
                      wrapperStyle={{ outline: "none" }}
                      contentStyle={{ 
                        borderRadius: 12, 
                        borderColor: "#cbd5e1",
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(8px)",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                      }}
                    />

                    {/* Bars = Active Vendors */}
                    <Bar
                      yAxisId="left"
                      dataKey="active"
                      fill="url(#barGradient)"
                      stroke="#9CA3AF"
                      barSize={28}
                      radius={[6, 6, 0, 0]}
                    />

                    {/* Lines = checkins & checkouts */}
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="checkins"
                      stroke="#fb923c"
                      strokeWidth={3}
                      dot={{ r: 5, strokeWidth: 2, fill: "#fff", stroke: "#fb923c" }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="checkouts"
                      stroke="#888888"
                      strokeWidth={3}
                      dot={{ r: 5, strokeWidth: 2, fill: "#fff", stroke: "#888888" }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                    />
                    
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9CA3AF" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#9CA3AF" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Activity Feed */}
          <Card title="Activity Feed" right={<div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today</div>}>
            <ul className="divide-y divide-slate-200/60">
              {feed.map((ev) => (
                <li key={ev.id} className="px-5 py-4 hover:bg-blue-50/30 transition-colors duration-150">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <img
                        alt={ev.vendor}
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                          ev.vendor || "A"
                        )}`}
                        className="mt-0.5 h-11 w-11 rounded-full border-2 border-slate-200 shadow-md"
                      />
                      <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-800 leading-relaxed">
                        <span className="font-bold text-slate-900">{ev.vendor || "—"}</span>{" "}
                        <span className="text-slate-600">from</span>{" "}
                        <span className="font-semibold text-blue-600">{ev.company || "—"}</span>{" "}
                        <span className="text-slate-600">{ev.action}</span>{" "}
                        <span className="font-semibold text-slate-900">{ev.target || "—"}</span>{" "}
                        <button
                          className="ml-2 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-blue-300 transition-all duration-150 shadow-sm"
                          onClick={() => alert("Edit details")}
                        >
                          Edit Details
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Dot className="bg-emerald-500 shadow-sm shadow-emerald-500/30" />
                        {new Date(ev.at).toLocaleDateString()} {fmtTimeHM(ev.at)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {!feed.length && (
                <li className="px-5 py-8 text-sm text-slate-500 text-center">
                  No activity yet for the selected day.
                </li>
              )}
            </ul>
          </Card>
        </div>

        {/* right rail — details */}
        <div className="flex flex-col gap-6">
          <Card title="Total Vendors Today">
            <div className="px-5 py-6 text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-blue-600">
              {metrics.total_vendors_today ?? 0}
            </div>
          </Card>

          <Card title="Avg. Time on Site">
            <div className="px-5 py-6 text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-purple-600">
              {fmtHM(metrics.avg_time_on_site_mins)}
            </div>
          </Card>

          <Card title="Most Active Vendors">
            <ol className="px-5 py-3 text-sm text-slate-800 space-y-2">
              {topVendors.map((name, i) => (
                <li key={`${name}-${i}`} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-blue-50/40 transition-colors duration-150">
                  <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white shadow-md shadow-blue-500/30">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-slate-800">{name}</span>
                </li>
              ))}
              {!topVendors.length && <li className="py-3 text-slate-500 text-center">No vendors.</li>}
            </ol>
          </Card>

          <Card title="Most Active Vessels">
            <ol className="px-5 py-3 text-sm text-slate-800 space-y-2">
              {topVessels.map((name, i) => (
                <li key={`${name}-${i}`} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-emerald-50/40 transition-colors duration-150">
                  <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-xs font-bold text-white shadow-md shadow-emerald-500/30">
                    {i + 1}
                  </span>
                  <span className="font-semibold text-slate-800">{name}</span>
                </li>
              ))}
              {!topVessels.length && <li className="py-3 text-slate-500 text-center">No vessels.</li>}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
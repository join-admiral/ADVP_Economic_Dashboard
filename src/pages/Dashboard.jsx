// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import {
  ComposedChart,
  Bar,               // ⬅️ added
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
  <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
    {(title || right) && (
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {right}
      </div>
    )}
    {children}
  </div>
);

const StatCard = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
  </div>
);

const Dot = ({ className = "" }) => (
  <span className={`inline-block h-2 w-2 rounded-full ${className}`} />
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
    <div className="flex items-center gap-4 text-xs text-slate-600">
      <div className="flex items-center gap-2">
        <Dot className="bg-slate-400/70" />
        Active Vendors
      </div>
      <div className="flex items-center gap-2">
        <Dot className="bg-orange-500/80" />
        Check-ins
      </div>
      <div className="flex items-center gap-2">
        <Dot className="bg-gray-500/80" /> {/* was slate-800; now neutral gray to match line */}
        Check-outs
      </div>
    </div>
  );

  return (
    <div className="px-5 py-4">
      {process.env.NODE_ENV !== "production" && (
        <div className="mb-2 text-[11px] text-slate-400">
          tenantId sent: <code>{String(tenantKey || "—")}</code>
        </div>
      )}

      {/* top stats row — 3 stat boxes + logo column */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 items-center">
        <StatCard label="Active Vendors" value={metrics.active_vendors} />
        <StatCard label="Check-ins" value={metrics.checkins} />
        <StatCard label="Check-outs" value={metrics.checkouts} />

        {/* logo now aligned in the same row as the 3 boxes */}
        <div className="flex justify-center items-center">
          <img
            src={isDark ? darkLogo : lightLogo}
            alt="Logo"
            className="h-12 md:h-14 xl:h-16 w-auto object-contain"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* left column span 3 */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* chart */}
          <Card
            title="Today's Vendor Activity (7AM - 7PM)"  // ⬅️ updated title
            right={
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {chartLegend}
                <label className="ml-3 inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-slate-700"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                  />
                  Auto refresh
                </label>
              </div>
            }
          >
            <div className="px-4 pb-4 pt-3">
              <div className="text-xs text-slate-500 mb-2">
                {new Date().toLocaleDateString(undefined, {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
              </div>
              <div className="h-[280px] min-w-full">
                <ResponsiveContainer key={hourly?.length || 0} width="100%" height="100%">
                  <ComposedChart data={hourly || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="hour" tick={{ fontSize: 12, fill: "#6b7280" }} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      domain={[0, "dataMax + 1"]}
                      label={{
                        value: "Active Vendors",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#6b7280",
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      domain={[0, "dataMax + 1"]}
                      label={{
                        value: "Check-ins/Check-outs",
                        angle: -90,
                        position: "insideRight",
                        fill: "#6b7280",
                        fontSize: 11,
                      }}
                    />
                    <Tooltip
                      wrapperStyle={{ outline: "none" }}
                      contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }}
                    />

                    {/* Bars = Active Vendors (replaces Area) */}
                    <Bar
                      yAxisId="left"
                      dataKey="active"
                      fill="#9CA3AF"
                      stroke="#9CA3AF"
                      barSize={26}
                      radius={[4, 4, 0, 0]}
                    />

                    {/* Lines = checkins & checkouts */}
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="checkins"
                      stroke="#fb923c"
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="checkouts"
                      stroke="#888888"       // ⬅️ neutral gray to match legend
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                      activeDot={{ r: 5 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Activity Feed */}
          <Card title="Activity Feed" right={<div className="text-xs text-slate-500">Today</div>}>
            <ul className="divide-y divide-slate-200">
              {feed.map((ev) => (
                <li key={ev.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <img
                      alt={ev.vendor}
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        ev.vendor || "A"
                      )}`}
                      className="mt-0.5 h-9 w-9 rounded-full border border-slate-200"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-800">
                        <span className="font-semibold">{ev.vendor || "—"}</span>{" "}
                        from <span className="font-medium">{ev.company || "—"}</span>{" "}
                        {ev.action} <span className="font-medium">{ev.target || "—"}</span>{" "}
                        <button
                          className="ml-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                          onClick={() => alert("Edit details")}
                        >
                          Edit Details
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <Dot className="bg-emerald-500" />
                        {new Date(ev.at).toLocaleDateString()} {fmtTimeHM(ev.at)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
              {!feed.length && (
                <li className="px-4 py-6 text-sm text-slate-500">
                  No activity yet for the selected day.
                </li>
              )}
            </ul>
          </Card>
        </div>

        {/* right rail — details */}
        <div className="flex flex-col gap-4">
          <Card title="Total Vendors Today">
            <div className="px-4 py-5 text-2xl font-bold text-slate-900">
              {metrics.total_vendors_today ?? 0}
            </div>
          </Card>

          <Card title="Avg. Time on Site">
            <div className="px-4 py-5 text-2xl font-bold text-slate-900">
              {fmtHM(metrics.avg_time_on_site_mins)}
            </div>
          </Card>

          <Card title="Most Active Vendors">
            <ol className="px-4 py-3 text-sm text-slate-800">
              {topVendors.map((name, i) => (
                <li key={`${name}-${i}`} className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-slate-500">#{i + 1}</span>
                    {name}
                  </span>
                </li>
              ))}
              {!topVendors.length && <li className="py-1.5 text-slate-500">No vendors.</li>}
            </ol>
          </Card>

          <Card title="Most Active Vessels">
            <ol className="px-4 py-3 text-sm text-slate-800">
              {topVessels.map((name, i) => (
                <li key={`${name}-${i}`} className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-slate-500">#{i + 1}</span>
                    {name}
                  </span>
                </li>
              ))}
              {!topVessels.length && <li className="py-1.5 text-slate-500">No vessels.</li>}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}

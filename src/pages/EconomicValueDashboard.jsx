// src/pages/EconomicValueDashboard.jsx
import React, { useMemo, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useTenant } from "../App";

export default function EconomicValueDashboard({ apiBase }) {
  const { tenantId } = useTenant();

  // ---- server data ----
  const [resolvedTenantId, setResolvedTenantId] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [summary, setSummary] = useState({
    yday_value: 0,
    week: 0,
    month: 0,
    all_time: 0,
    active_vendors_yday: 0,
    cutoff: null,
  });
  const [trend, setTrend] = useState([]);
  const [quick, setQuick] = useState({ daily_avg_30: 0, cutoff: null });

  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(false);

  // ---- chart filter ----
  const [mode, setMode] = useState("day");
  const WINDOW = { day: 30, week: 12, month: 6 };

  // ✅ Show all toggle (no search/filter)
  const [showAllVendors, setShowAllVendors] = useState(false);
  const [showAllVessels, setShowAllVessels] = useState(false);

  // ---------- helpers ----------
  const currency = (n) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    }).format(n || 0);

  const fmtDay = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", timeZone: "UTC" }).format(dt);
  };

  const fmtMonth = (isoYYYYMM01) => {
    if (!isoYYYYMM01) return "";
    const d = new Date(isoYYYYMM01 + "T00:00:00Z");
    return d.toLocaleString(undefined, { month: "short", year: "numeric", timeZone: "UTC" });
  };

  const toISO = (date) =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
      date.getUTCDate()
    ).padStart(2, "0")}`;

  const startOfISOWeek = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    const day = dt.getUTCDay() || 7;
    dt.setUTCDate(dt.getUTCDate() - (day - 1));
    return toISO(dt);
  };
  
  const startOfMonth = (iso) => iso.slice(0, 7) + "-01";

  // ---------- resolve tenant to numeric id ----------
  useEffect(() => {
    if (!tenantId) return;

    const maybeNum = Number(tenantId);
    if (!Number.isNaN(maybeNum) && maybeNum > 0) {
      setResolvedTenantId(maybeNum);
      return;
    }

    const base = apiBase.replace(/\/$/, "");
    fetch(`${base}/api/marinas`, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((list) => {
        const items = Array.isArray(list) ? list : list?.items || [];
        const target = String(tenantId).toLowerCase();

        const match =
          items.find((m) => String(m.slug || "").toLowerCase() === target) ||
          items.find((m) => String(m.name || m.marina_name || "").toLowerCase() === target) ||
          items.find((m) => String(m.tenant_id || m.id || "").toLowerCase() === target);

        const id = Number(match?.tenant_id ?? match?.id ?? null) || (Number(tenantId) || null);

        setResolvedTenantId(id || null);
      })
      .catch((e) => {
        console.error("Failed to resolve tenant id:", e);
        setResolvedTenantId(null);
      });
  }, [tenantId, apiBase]);

  // ---------- fetch economics once tenant is resolved ----------
  useEffect(() => {
    if (!resolvedTenantId) return;

    let alive = true;
    setLoadErr("");
    setLoading(true);

    const base = apiBase.replace(/\/$/, "");
    const params = (path) => {
      const url = `${base}/api/economics/${path}${
        path.includes("?") ? "&" : "?"
      }tenantId=${encodeURIComponent(resolvedTenantId)}`;
      const init = {
        credentials: "include",
        headers: { "X-Tenant-Id": String(resolvedTenantId) },
        cache: "no-store",
      };
      return [url, init];
    };

    const fetchJson = async (path) => {
      const [url, init] = params(path);
      const r = await fetch(url, init);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    };

    Promise.all([
      fetchJson("vendors"),
      fetchJson("vessels"),
      fetchJson("summary"),
      fetchJson("trend?days=180"),
      fetchJson("quick-stats"),
    ])
      .then(([v1, v2, s1, t1, q1]) => {
        if (!alive) return;
        setVendors(v1?.items ?? []);
        setVessels(v2?.items ?? []);

        setSummary({
          yday_value: Number(s1?.yday_value) || 0,
          week: Number(s1?.week) || 0,
          month: Number(s1?.month) || 0,
          all_time: Number(s1?.all_time) || 0,
          active_vendors_yday: Number(s1?.active_vendors_yday) || 0,
          cutoff: s1?.cutoff || null,
        });

        setTrend(t1?.items ?? []);

        setQuick({
          daily_avg_30: Number(q1?.daily_avg_30) || 0,
          cutoff: q1?.cutoff || null,
        });
      })
      .catch((e) => {
        if (!alive) return;
        setLoadErr(e.message || "Failed to load economic data");
        console.error("Economic dashboard fetch error:", e);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [resolvedTenantId, apiBase]);

  // ---- normalize trend rows
  const trendSeries = useMemo(
    () =>
      (trend || []).map((row) => ({
        date: row.d,
        value: Number(row.value) || 0,
      })),
    [trend]
  );

  // ---- aggregate day -> week/month
  const aggregated = useMemo(() => {
    const byKey = (getKey) => {
      const map = new Map();
      for (const r of trendSeries) {
        const k = getKey(r.date);
        const acc = map.get(k) || { date: k, value: 0, days: 0 };
        acc.value += r.value;
        acc.days += 1;
        map.set(k, acc);
      }
      return Array.from(map.values())
        .sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((r) => ({ date: r.date, value: r.value }));
    };
    return {
      day: trendSeries,
      week: byKey((d) => startOfISOWeek(d)),
      month: byKey((d) => startOfMonth(d)),
    };
  }, [trendSeries]);

  const windowed = useMemo(() => {
    const all = aggregated[mode] || [];
    return all.slice(-WINDOW[mode]);
  }, [aggregated, mode, WINDOW]);

  // ✅ Sort vendors/vessels by wages (no search, no filter options)
  const sortedVendors = useMemo(() => {
    return [...vendors].sort((a, b) => (b.total_wages || 0) - (a.total_wages || 0));
  }, [vendors]);

  const sortedVessels = useMemo(() => {
    return [...vessels].sort((a, b) => (b.total_wages || 0) - (a.total_wages || 0));
  }, [vessels]);

  const displayedVendors = showAllVendors ? sortedVendors : sortedVendors.slice(0, 10);
  const displayedVessels = showAllVessels ? sortedVessels : sortedVessels.slice(0, 10);

  // ---- totals for stat cards ----
  const totals = useMemo(
    () => ({
      yday: currency(summary.yday_value),
      week: currency(summary.week),
      month: currency(summary.month),
      allTime: currency(summary.all_time),
    }),
    [summary]
  );

  const activeVendorsYesterday = summary.active_vendors_yday || 0;
  const avgPerVendorYesterday = activeVendorsYesterday > 0 ? summary.yday_value / activeVendorsYesterday : 0;
  const dailyAvg30 = quick.daily_avg_30 || 0;

  // ---- sub-components ----
  const Section = ({ title, right, children }) => (
    <div className="relative rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 shadow-lg shadow-slate-200/50 backdrop-blur-sm overflow-hidden">
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
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );

  const StatCard = ({ label, value }) => (
    <div className="group relative rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/50 p-5 shadow-lg shadow-slate-200/50 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-blue-200/30 hover:-translate-y-0.5">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
          {label}
        </div>
        <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-slate-600">
          {value}
        </div>
      </div>
    </div>
  );

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    const label = mode === "day" ? fmtDay(data.date) : mode === "month" ? fmtMonth(data.date) : data.date;
    return (
      <div className="rounded-xl border border-slate-300/80 bg-white/95 backdrop-blur-md px-4 py-3 shadow-2xl">
        <div className="text-xs font-semibold text-slate-600 mb-1">{label}</div>
        <div className="text-lg font-bold text-slate-900">{currency(data.value)}</div>
      </div>
    );
  };

  const renderChart = () => {
    if (mode === "day") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={windowed}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDay}
              tick={{ fontSize: 11, fill: "#64748b" }}
              stroke="#cbd5e1"
            />
            <YAxis
              tickFormatter={(v) => currency(v)}
              tick={{ fontSize: 11, fill: "#64748b" }}
              stroke="#cbd5e1"
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#colorValue)"
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    } else {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={windowed}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0.7} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={mode === "month" ? fmtMonth : (d) => d}
              tick={{ fontSize: 11, fill: "#64748b" }}
              stroke="#cbd5e1"
            />
            <YAxis
              tickFormatter={(v) => currency(v)}
              tick={{ fontSize: 11, fill: "#64748b" }}
              stroke="#cbd5e1"
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" radius={[10, 10, 0, 0]}>
              {windowed.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={index === windowed.length - 1 ? "#cbd5e1" : "url(#barGradient)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
  };

  // ---------- layout ----------
  return (
    <div className="px-4 sm:px-6 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen py-6">
      {loadErr && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 shadow-lg">
          {loadErr}
        </div>
      )}

      {/* summary cards */}
      <div className="grid min-w-0 grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Yesterday's Value" value={totals.yday} />
        <StatCard label="This Week" value={totals.week} />
        <StatCard label="This Month" value={totals.month} />
        <StatCard label="All-Time" value={totals.allTime} />
      </div>

      {/* main grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* chart - left, spans 2 */}
        <div className="xl:col-span-2">
          <Section
            title="Economic Trend"
            right={
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-xl border border-slate-300 bg-white/80 backdrop-blur-sm p-1 shadow-md">
                  {[
                    { key: "day", label: "Days" },
                    { key: "week", label: "Weeks" },
                    { key: "month", label: "Months" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setMode(opt.key)}
                      className={
                        "px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 " +
                        (mode === opt.key 
                          ? "bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/30" 
                          : "text-slate-600 hover:bg-slate-100")
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  {mode === "day" ? "Area" : "Bar"} • Last {WINDOW[mode]}
                </span>
              </div>
            }
          >
            <div className="h-[320px] w-full min-h-[320px]">
              {windowed.length > 0 && renderChart()}
            </div>
          </Section>
        </div>

        {/* QUICK STATS */}
        <div className="xl:col-span-1">
          <Section title="Quick Stats">
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-blue-50/30 p-4 shadow-md hover:shadow-lg transition-shadow duration-200">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                  Active Vendors Yesterday
                </div>
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-blue-600">
                  {activeVendorsYesterday}
                </div>
                <div className="text-xs text-slate-500 mt-1">From daily vendor hours</div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-purple-50/30 p-4 shadow-md hover:shadow-lg transition-shadow duration-200">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                  Avg $ per Vendor (Yesterday)
                </div>
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-purple-600">
                  {currency(avgPerVendorYesterday)}
                </div>
                <div className="text-xs text-slate-500 mt-1">Yesterday's Value / Active Vendors</div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-emerald-50/30 p-4 shadow-md hover:shadow-lg transition-shadow duration-200">
                <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">
                  30-Day Daily Avg
                </div>
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-900 to-emerald-600">
                  {currency(Math.round(dailyAvg30))}
                </div>
                <div className="text-xs text-slate-500 mt-1">Rolling mean over last 30 days</div>
              </div>
            </div>
          </Section>
        </div>

        {/* TOP VENDORS & VESSELS */}
        <div className="xl:col-span-3 grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* TOP VENDORS */}
          <Section
            title={`Top Vendors by $${loading ? " (loading…)" : ""}`}
            right={<span className="text-xs font-bold text-slate-500">Total: {vendors.length}</span>}
          >
            <div className={`${showAllVendors ? 'max-h-[600px]' : 'max-h-auto'} overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100`}>
              <ul className="divide-y divide-slate-200/60">
                {displayedVendors.map((r, i) => (
                  <li key={`${r.company_name}-${i}`} className="flex items-center justify-between py-4 px-2 hover:bg-blue-50/30 transition-colors duration-150 rounded-lg">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-black text-white shadow-lg shadow-blue-500/30">
                        {i + 1}
                      </div>
                      <div className="text-sm font-semibold text-slate-800 truncate" title={r.company_name}>
                        {r.company_name ?? "—"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 ml-4 gap-1">
                      <div className="text-base font-bold text-slate-900">{currency(r.total_wages ?? 0)}</div>
                      <div className="text-xs font-medium text-slate-500">{r.hours?.toFixed(1)}h</div>
                    </div>
                  </li>
                ))}
                {!loading && displayedVendors.length === 0 && (
                  <li className="py-6 text-sm text-slate-500 text-center">
                    No data available
                  </li>
                )}
              </ul>
            </div>

            {sortedVendors.length > 10 && (
              <button
                onClick={() => setShowAllVendors(!showAllVendors)}
                className="mt-4 w-full px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
              >
                {showAllVendors ? `Show Less` : `Show All ${sortedVendors.length} Vendors`}
              </button>
            )}
          </Section>

          {/* TOP VESSELS */}
          <Section
            title={`Top Vessels by $${loading ? " (loading…)" : ""}`}
            right={<span className="text-xs font-bold text-slate-500">Total: {vessels.length}</span>}
          >
            <div className={`${showAllVessels ? 'max-h-[600px]' : 'max-h-auto'} overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100`}>
              <ul className="divide-y divide-slate-200/60">
                {displayedVessels.map((r, i) => (
                  <li key={`${r.boat_name}-${i}`} className="flex items-center justify-between py-4 px-2 hover:bg-emerald-50/30 transition-colors duration-150 rounded-lg">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-xs font-black text-white shadow-lg shadow-emerald-500/30">
                        {i + 1}
                      </div>
                      <div className="text-sm font-semibold text-slate-800 truncate" title={r.boat_name}>
                        {r.boat_name ?? "—"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 ml-4 gap-1">
                      <div className="text-base font-bold text-slate-900">{currency(r.total_wages ?? 0)}</div>
                      <div className="text-xs font-medium text-slate-500">{r.hours?.toFixed(1)}h</div>
                    </div>
                  </li>
                ))}
                {!loading && displayedVessels.length === 0 && (
                  <li className="py-6 text-sm text-slate-500 text-center">
                    No data available
                  </li>
                )}
              </ul>
            </div>

            {sortedVessels.length > 10 && (
              <button
                onClick={() => setShowAllVessels(!showAllVessels)}
                className="mt-4 w-full px-5 py-3 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40"
              >
                {showAllVessels ? `Show Less` : `Show All ${sortedVessels.length} Vessels`}
              </button>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
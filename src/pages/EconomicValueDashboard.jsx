// src/pages/EconomicValueDashboard.jsx
import React, { useMemo, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useTenant } from "../App";

export default function EconomicValueDashboard({ apiBase }) {
  const { tenantId } = useTenant(); // may be a slug/name OR a number

  // ---- server data ----
  const [resolvedTenantId, setResolvedTenantId] = useState(null); // numeric tenant_id
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
  const [trend, setTrend] = useState([]); // [{ d, value }]
  const [quick, setQuick] = useState({ daily_avg_30: 0, cutoff: null });

  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(false);

  // ---- chart filter ----
  const [mode, setMode] = useState("day");
  const WINDOW = { day: 30, week: 12, month: 6 };

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

    // fetch marinas and resolve slug/name -> id
    const base = apiBase.replace(/\/$/, "");
    fetch(`${base}/api/marinas`, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((list) => {
        // list can be an array or {items:[...]} depending on your endpoint; handle both
        const items = Array.isArray(list) ? list : list?.items || [];
        const target = String(tenantId).toLowerCase();

        // match by slug or name or explicit id field
        const match =
          items.find((m) => String(m.slug || "").toLowerCase() === target) ||
          items.find((m) => String(m.name || m.marina_name || "").toLowerCase() === target) ||
          items.find((m) => String(m.tenant_id || m.id || "").toLowerCase() === target);

        const id =
          Number(match?.tenant_id ?? match?.id ?? null) ||
          (Number(tenantId) || null);

        if (!id) {
          console.warn("Could not resolve tenant id for", tenantId, "from", items);
          setResolvedTenantId(null);
        } else {
          setResolvedTenantId(id);
        }
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
      // send both header + query param (some older routes use query param)
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
        date: row.d, // YYYY-MM-DD
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
        .map((r) => ({
          date: r.date,
          value: r.value,
        }));
    };
    return {
      day: trendSeries,
      week: byKey((d) => startOfISOWeek(d)),
      month: byKey((d) => startOfMonth(d)),
    };
  }, [trendSeries]);

  const windowed = useMemo(() => {
    const arr = aggregated[mode] || [];
    return arr.slice(-WINDOW[mode]);
  }, [aggregated, mode]);

  const lastPoint = windowed[windowed.length - 1] || { date: new Date().toISOString().slice(0, 10) };

  // ---- totals (show *yesterday*, not today) ----
  const totals = useMemo(
    () => ({
      yday: Number(summary.yday_value) || 0,
      week: Number(summary.week) || 0,
      month: Number(summary.month) || 0,
      allTime: Number(summary.all_time) || 0,
    }),
    [summary]
  );

  const activeVendorsYesterday = Number(summary.active_vendors_yday) || 0;
  const ydayValue = totals.yday;
  const avgPerVendorYesterday =
    activeVendorsYesterday > 0 ? Math.round(ydayValue / activeVendorsYesterday) : 0;

  const dailyAvg30 = Number(quick.daily_avg_30) || 0;

  // ---------- small UI ----------
  const StatCard = ({ label, value, isMoney = true }) => (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-bold text-slate-900">{isMoney ? currency(value) : value}</div>
      </div>
    </div>
  );

  const Section = ({ title, right, children }) => (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    const fmtLabel =
      mode === "day"
        ? fmtDay(label)
        : mode === "week"
        ? `Week of ${fmtDay(label)}`
        : new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(
            new Date(label + "T00:00:00Z")
          );
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm text-sm">
        <div className="font-semibold text-slate-800">{fmtLabel}</div>
        <div className="mt-1 text-slate-600">
          Value: <span className="font-semibold text-slate-900">{currency(p.value)}</span>
        </div>
      </div>
    );
  };

  // ---------- layout ----------
  return (
    <div className="px-4 sm:px-6">
      {loadErr && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {loadErr}
        </div>
      )}

      {/* summary cards */}
      <div className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Yesterday’s Value" value={totals.yday} />
        <StatCard label="This Week" value={totals.week} />
        <StatCard label="This Month" value={totals.month} />
        <StatCard label="All-Time" value={totals.allTime} />
      </div>

      {/* main grid */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* chart - left, spans 2 */}
        <div className="xl:col-span-2">
          <Section
            title="Economic Trend"
            right={
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                  {[
                    { key: "day", label: "Days" },
                    { key: "week", label: "Weeks" },
                    { key: "month", label: "Months" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setMode(opt.key)}
                      className={
                        "px-3 py-1.5 text-xs font-medium rounded-md transition-colors " +
                        (mode === opt.key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100")
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-slate-500">
                  Showing last {WINDOW[mode]} {mode}
                  {WINDOW[mode] > 1 ? "s" : ""}
                </span>
                <span className="text-xs text-slate-500">
                  Last updated {fmtDay(lastPoint.date)}
                  {summary.cutoff ? ` • Using last completed day: ${fmtDay(summary.cutoff)}` : ""}
                </span>
              </div>
            }
          >
            <div className="h-[300px] w-full min-h-[300px]">
              {windowed.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={windowed} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="evFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(v) =>
                        mode === "day"
                          ? fmtDay(v)
                          : mode === "week"
                          ? `Wk of ${fmtDay(v)}`
                          : new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(
                              new Date(v + "T00:00:00Z")
                            )
                      }
                      tickMargin={8}
                      stroke="#94a3b8"
                      fontSize={12}
                    />
                    <YAxis
                      tickFormatter={(val) => (val >= 1000 ? `${Math.round(val / 1000)}k` : val)}
                      stroke="#94a3b8"
                      fontSize={12}
                      width={50}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name={mode === "day" ? "Daily Value" : mode === "week" ? "Weekly Value" : "Monthly Value"}
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      fill="url(#evFill)"
                      dot={false}
                      activeDot={{ r: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Section>
        </div>

        {/* QUICK STATS in the right rail */}
        <div className="xl:col-span-1">
          <Section title="Quick Stats">
            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl border border-slate-200 p-3.5">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Active Vendors Yesterday
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{activeVendorsYesterday}</div>
                <div className="text-xs text-slate-500">From daily vendor hours</div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3.5">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Avg $ per Vendor (Yesterday)
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {currency(avgPerVendorYesterday)}
                </div>
                <div className="text-xs text-slate-500">Yesterday’s Value / Active Vendors</div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3.5">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  30-Day Daily Avg
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {currency(Math.round(dailyAvg30))}
                </div>
                <div className="text-xs text-slate-500">Rolling mean over last 30 days</div>
              </div>
            </div>
          </Section>
        </div>

        {/* ROW: Top lists */}
        <div className="xl:col-span-3 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Section title={`Top Vendors by $${loading ? " (loading…)" : ""}`}>
            <ul className="divide-y divide-slate-200">
              {vendors.map((r, i) => (
                <li key={`${r.company_name}-${i}`} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-sky-50 text-[11px] font-bold text-sky-700">
                      {i + 1}
                    </div>
                    <div className="text-sm font-medium text-slate-800">{r.company_name ?? "—"}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{currency(r.total_wages ?? 0)}</div>
                </li>
              ))}
              {!loading && (vendors || []).length === 0 && (
                <li className="py-4 text-sm text-slate-500">No data</li>
              )}
            </ul>
          </Section>

          <Section title={`Top Vessels by $${loading ? " (loading…)" : ""}`}>
            <ul className="divide-y divide-slate-200">
              {vessels.map((r, i) => (
                <li key={`${r.boat_name}-${i}`} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-[11px] font-bold text-emerald-700">
                      {i + 1}
                    </div>
                    <div className="text-sm font-medium text-slate-800">{r.boat_name ?? "—"}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{currency(r.total_wages ?? 0)}</div>
                </li>
              ))}
              {!loading && (vessels || []).length === 0 && (
                <li className="py-4 text-sm text-slate-500">No data</li>
              )}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

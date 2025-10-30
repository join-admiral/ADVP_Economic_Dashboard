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
import { api } from "../lib/api";

export default function EconomicValueDashboard() {
  // ---- server data ----
  const [vendors, setVendors] = useState([]);
  const [vessels, setVessels] = useState([]);
  const [summary, setSummary] = useState({
    today: 0, week: 0, month: 0, all_time: 0,
    prev_day: 0, prev_week: 0, prev_month: 0,
  });
  const [trend, setTrend] = useState([]); // [{d, value, active_vendors, avg_per_vendor}]
  const [quick, setQuick] = useState({
    active_vendors_today: 0,
    today_value: 0,
    daily_avg_30: 0,
    active_vendors_yday: 0,
    yday_value: 0,
  });

  const [loadErr, setLoadErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoadErr("");
    setLoading(true);

    Promise.all([
      api("/api/economics/vendors"),
      api("/api/economics/vessels"),
      api("/api/economics/summary"),
      api("/api/economics/trend?days=30"),
      api("/api/economics/quick-stats"),
    ])
      .then(([v1, v2, s1, t1, q1]) => {
        if (!alive) return;
        setVendors(v1?.items ?? []);
        setVessels(v2?.items ?? []);
        setSummary(
          s1 || { today: 0, week: 0, month: 0, all_time: 0, prev_day: 0, prev_week: 0, prev_month: 0 }
        );
        setTrend(t1?.items ?? []);
        setQuick(q1 || { active_vendors_today: 0, today_value: 0, daily_avg_30: 0 });
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
  }, []);

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
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(dt);
  };

  const trendSeries = useMemo(
    () =>
      (trend || []).map((row) => ({
        date: row.d,
        value: Number(row.value) || 0,
        activeVendors: Number(row.active_vendors) || 0,
        avgPerVendor: Number(row.avg_per_vendor) || 0,
      })),
    [trend]
  );

  const last30 = trendSeries;
  const lastPoint = last30[last30.length - 1] || { date: new Date().toISOString().slice(0, 10) };

  const totals = useMemo(() => {
    const todayVal = Number(summary.today) > 0 ? Number(summary.today) : Number(summary.prev_day) || 0;
    const weekVal = Number(summary.week) > 0 ? Number(summary.week) : Number(summary.prev_week) || 0;
    const monthVal = Number(summary.month) > 0 ? Number(summary.month) : Number(summary.prev_month) || 0;
    return {
      today: todayVal,
      week: weekVal,
      month: monthVal,
      allTime: Number(summary.all_time) || 0,
    };
  }, [summary]);

  const pct = (curr, prev) => (!prev ? 0 : ((curr - prev) / prev) * 100);
  const deltas = {
    today: pct(totals.today, Number(summary.prev_day) || 0),
    week: pct(totals.week, Number(summary.prev_week) || 0),
    month: pct(totals.month, Number(summary.prev_month) || 0),
    allTime: 0,
  };

  const topVendors = useMemo(
    () => (vendors || []).map((r) => ({ name: r.company_name ?? "—", total: r.total_wages ?? 0 })),
    [vendors]
  );
  const topVessels = useMemo(
    () => (vessels || []).map((r) => ({ name: r.boat_name ?? "—", total: r.total_wages ?? 0 })),
    [vessels]
  );

  const activeVendorsTodayReal =
    Number(quick.active_vendors_today) > 0
      ? Number(quick.active_vendors_today)
      : Number(quick.active_vendors_yday) || 0;

  const todaysValueReal =
    Number(summary.today) > 0 ? Number(summary.today) : Number(summary.prev_day) || Number(quick.yday_value) || 0;

  const avgPerVendorToday = activeVendorsTodayReal ? Math.round(todaysValueReal / activeVendorsTodayReal) : 0;
  const dailyAvg30 = Number(quick.daily_avg_30) || 0;

  const StatCard = ({ label, value, delta }) => {
    const up = delta >= 0;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-2xl font-bold text-slate-900">{currency(value)}</div>
          <div className={`text-xs font-semibold ${up ? "text-emerald-600" : "text-rose-600"}`}>
            {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </div>
        </div>
      </div>
    );
  };

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
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm text-sm">
        <div className="font-semibold text-slate-800">{fmtDay(label)}</div>
        <div className="mt-1 text-slate-600">
          Value: <span className="font-semibold text-slate-900">{currency(p.value)}</span>
        </div>
        <div className="text-slate-600">
          Active Vendors: <span className="font-semibold text-slate-900">{p.activeVendors}</span>
        </div>
        <div className="text-slate-600">
          Avg / Vendor: <span className="font-semibold text-slate-900">{currency(p.avgPerVendor)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="px-0">
      {loadErr && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {loadErr}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today’s Value" value={totals.today} delta={deltas.today} />
        <StatCard label="This Week" value={totals.week} delta={deltas.week} />
        <StatCard label="This Month" value={totals.month} delta={deltas.month} />
        <StatCard label="All-Time" value={totals.allTime} delta={deltas.allTime} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Section title="30-Day Economic Trend" right={<span className="text-xs text-slate-500">Last updated {fmtDay(lastPoint.date)}</span>}>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last30} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="val" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopOpacity={0.35} />
                      <stop offset="100%" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={fmtDay} fontSize={12} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" strokeWidth={2} fill="url(#val)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        <div className="xl:col-span-1">
          <Section title={`Top Vendors by $${loading ? " (loading…)" : ""}`}>
            <ul className="divide-y">
              {topVendors.map((v, i) => (
                <li key={`${v.name}-${i}`} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-xl text-[11px] font-bold">{i + 1}</div>
                    <div className="text-sm font-medium">{v.name}</div>
                  </div>
                  <div className="text-sm font-semibold">{currency(v.total)}</div>
                </li>
              ))}
              {!loading && topVendors.length === 0 && <li className="py-4 text-sm text-slate-500">No data</li>}
            </ul>
          </Section>
        </div>

        <div className="xl:col-span-1 order-last xl:order-0">
          <Section title={`Top Vessels by $${loading ? " (loading…)" : ""}`}>
            <ul className="divide-y">
              {topVessels.map((v, i) => (
                <li key={`${v.name}-${i}`} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-xl text-[11px] font-bold">{i + 1}</div>
                    <div className="text-sm font-medium">{v.name}</div>
                  </div>
                  <div className="text-sm font-semibold">{currency(v.total)}</div>
                </li>
              ))}
              {!loading && topVessels.length === 0 && <li className="py-4 text-sm text-slate-500">No data</li>}
            </ul>
          </Section>
        </div>

        <div className="xl:col-span-2">
          <Section title="Quick Stats">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border p-4">
                <div className="text-[11px] uppercase tracking-wider font-semibold">Active Vendors Today</div>
                <div className="mt-2 text-2xl font-bold">{activeVendorsTodayReal}</div>
                <div className="text-xs text-slate-500">From daily vendor hours</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-[11px] uppercase tracking-wider font-semibold">Avg $ per Vendor (Today)</div>
                <div className="mt-2 text-2xl font-bold">{currency(avgPerVendorToday)}</div>
                <div className="text-xs text-slate-500">Today’s Value / Active Vendors</div>
              </div>
              <div className="rounded-xl border p-4">
                <div className="text-[11px] uppercase tracking-wider font-semibold">30-Day Daily Avg</div>
                <div className="mt-2 text-2xl font-bold">{currency(Math.round(dailyAvg30))}</div>
                <div className="text-xs text-slate-500">Rolling mean over last 30 days</div>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

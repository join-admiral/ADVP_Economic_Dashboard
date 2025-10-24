import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function EconomicValueDashboard() {
  // ---------- helpers ----------
  // ✅ Removed "US" prefix by using currencyDisplay: "narrowSymbol"
  const currency = (n) =>
    new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      currencyDisplay: "narrowSymbol", // shows "$" only, no "US"
      maximumFractionDigits: 0,
    }).format(n || 0);

  const fmtDay = (d) =>
    new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  const genSeries = (days = 120) => {
    const out = [];
    const today = new Date();
    let base = 4500;
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const weekday = date.getDay();
      const bump = weekday === 5 || weekday === 6 ? 1.25 : 0.9;
      const noise = 0.85 + Math.random() * 0.5;
      base = Math.max(1200, base * (0.995 + Math.random() * 0.01));
      const value = Math.round(base * bump * noise);
      const activeVendors = Math.max(3, Math.round(8 + (noise - 1) * 12));
      const avgPerVendor = Math.round(value / activeVendors);
      out.push({
        date: date.toISOString().slice(0, 10),
        value,
        activeVendors,
        avgPerVendor,
      });
    }
    return out;
  };

  const fullSeries = useMemo(() => genSeries(120), []);
  const last30 = useMemo(() => fullSeries.slice(-30), [fullSeries]);
  const todayPoint =
    last30[last30.length - 1] || { value: 0, activeVendors: 0, avgPerVendor: 0 };

  const sum = (arr, key = "value") => arr.reduce((a, b) => a + (b?.[key] || 0), 0);
  const totals = useMemo(() => {
    const today = todayPoint.value;
    const week = sum(last30.slice(-7));
    const month = sum(last30);
    const allTime = sum(fullSeries);
    return { today, week, month, allTime };
  }, [last30, fullSeries, todayPoint.value]);

  const pct = (curr, prev) => (!prev ? 0 : ((curr - prev) / prev) * 100);
  const prevDay = last30[last30.length - 2]?.value || 0;
  const prev7 = sum(fullSeries.slice(-14, -7));
  const prev30 = sum(fullSeries.slice(-60, -30));
  const deltas = {
    today: pct(totals.today, prevDay),
    week: pct(totals.week, prev7),
    month: pct(totals.month, prev30),
    allTime: 0,
  };

  const topVendors = useMemo(
    () => [
      { name: "Oceanic Services LLC", total: 45210 },
      { name: "HarborTech Marine", total: 39180 },
      { name: "BlueWave Mechanics", total: 35590 },
      { name: "Seaborn Supplies", total: 29740 },
      { name: "Marina Essentials Co.", total: 25510 },
    ],
    []
  );

  const topVessels = useMemo(
    () => [
      { name: "M/V Northern Star", total: 28750 },
      { name: "S/Y Wind Chaser", total: 24110 },
      { name: "M/V Coral Queen", total: 22480 },
      { name: "S/Y Silver Tide", total: 19170 },
      { name: "M/V Sea Venture", total: 17760 },
    ],
    []
  );

  // ---------- small UI ----------
  const StatCard = ({ label, value, delta }) => {
    const up = delta >= 0;
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
          {label}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <div className="text-2xl font-bold text-slate-900">{currency(value)}</div>
          <div
            className={`text-xs font-semibold ${
              up ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </div>
        </div>
      </div>
    );
  };

  const Section = ({ title, right, children }) => (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
          {title}
        </h3>
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
          Avg / Vendor:{" "}
          <span className="font-semibold text-slate-900">{currency(p.avgPerVendor)}</span>
        </div>
      </div>
    );
  };

  // ---------- layout ----------
  return (
    <div className="px-0">
      {/* ✅ Removed heading and paragraph */}

      {/* summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today’s Value" value={totals.today} delta={deltas.today} />
        <StatCard label="This Week" value={totals.week} delta={deltas.week} />
        <StatCard label="This Month" value={totals.month} delta={deltas.month} />
        <StatCard label="All-Time" value={totals.allTime} delta={deltas.allTime} />
      </div>

      {/* main grid */}
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* chart */}
        <div className="xl:col-span-2">
          <Section
            title="30-Day Economic Trend"
            right={
              <span className="text-xs text-slate-500">
                Last updated {fmtDay(todayPoint.date)}
              </span>
            }
          >
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last30} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="val" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tickFormatter={fmtDay} stroke="#94a3b8" fontSize={12} />
                  <YAxis
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                    stroke="#94a3b8"
                    fontSize={12}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" stroke="#0ea5e9" fill="url(#val)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>

        {/* top vendors */}
        <div className="xl:col-span-1">
          <Section title="Top Vendors by $">
            <ul className="divide-y divide-slate-200">
              {topVendors.map((v, i) => (
                <li key={v.name} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-sky-50 text-[11px] font-bold text-sky-700">
                      {i + 1}
                    </div>
                    <div className="text-sm font-medium text-slate-800">{v.name}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{currency(v.total)}</div>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* top vessels */}
        <div className="xl:col-span-1 order-last xl:order-none">
          <Section title="Top Vessels by $">
            <ul className="divide-y divide-slate-200">
              {topVessels.map((v, i) => (
                <li key={v.name} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-[11px] font-bold text-emerald-700">
                      {i + 1}
                    </div>
                    <div className="text-sm font-medium text-slate-800">{v.name}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{currency(v.total)}</div>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* quick stats */}
        <div className="xl:col-span-2">
          <Section title="Quick Stats">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Active Vendors Today
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{todayPoint.activeVendors}</div>
                <div className="text-xs text-slate-500">From vendor activity logs</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  Avg $ per Vendor (Today)
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{currency(todayPoint.avgPerVendor)}</div>
                <div className="text-xs text-slate-500">Today’s Value / Active Vendors</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  30-Day Daily Avg
                </div>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  {currency(Math.round(totals.month / 30))}
                </div>
                <div className="text-xs text-slate-500">Rolling mean over last 30 days</div>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

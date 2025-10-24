import React, { useEffect, useMemo, useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

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

const Badge = ({ children }) => (
  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
    {children}
  </span>
);

const Dot = ({ className = "" }) => (
  <span className={`inline-block h-2 w-2 rounded-full ${className}`} />
);

/* --------------------------------- helpers --------------------------------- */
const fmtTimeHM = (date) =>
  new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const fmtHM = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
};

/* ------------------------------- mock dataset ------------------------------ */
/* Replace this whole block with real fetch/hooks when you’re ready */
const useDashboardData = () => {
  // Hourly series 7AM-7PM
  const hours = ["7AM","8AM","9AM","10AM","11AM","12PM","1PM","2PM","3PM","4PM","5PM","6PM","7PM"];
  const hourly = hours.map((h, i) => ({
    hour: h,
    active: i <= 5 ? [3,3,4,5,5,4][i] ?? 0 : 0,
    checkins: i <= 5 ? [0,0,2,1,0,0][i] ?? 0 : 0,
    checkouts: i <= 5 ? [0,0,0,0,1,0][i] ?? 0 : 0,
  }));

  const activityFeed = [
    {
      id: "a1",
      vendor: "Juan Guerra",
      company: "Jet & Yacht Masters",
      action: "checked out of",
      target: "Chevo At Sea",
      icon: "phone",
      at: "2025-10-23T12:21:00Z",
    },
    {
      id: "a2",
      vendor: "Yosvani Izzo",
      company: "MarineMax Miami",
      action: "checked out of",
      target: "Millard Lil Rascal",
      icon: "phone",
      at: "2025-10-23T12:05:00Z",
    },
    {
      id: "a3",
      vendor: "Juan Guerra",
      company: "Jet & Yacht Masters",
      action: "checked in to see",
      target: "Chevo AZ at Sea",
      icon: "phone",
      at: "2025-10-23T11:51:00Z",
    },
  ];

  const metrics = {
    activeVendors: 3,
    checkIns: 8,
    checkOuts: 3,
    flaggedVendors: 6,
    totalVendorsToday: 6,
    avgTimeOnSiteMins: 118, // 1h58m
  };

  const mostActiveVendors = [
    { name: "Trustworthy Marine", visits: 2 },
    { name: "Oceanic Yacht Management", visits: 1 },
    { name: "MarineMax Pompano", visits: 1 },
  ];

  const mostActiveBoats = [
    { name: "Lawrence - TBD", visits: 2 },
    { name: "Escape Velocity", visits: 1 },
    { name: "Lil Rascal", visits: 1 },
  ];

  return { hours, hourly, activityFeed, metrics, mostActiveVendors, mostActiveBoats };
};

/* --------------------------------- page ----------------------------------- */
export default function Dashboard() {
  const { hourly, activityFeed, metrics, mostActiveVendors, mostActiveBoats } =
    useDashboardData();

  const [autoRefresh, setAutoRefresh] = useState(false);

  // demo auto-refresh: re-shuffle a little (remove for real data)
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      // no-op placeholder to show the toggle working
    }, 60000);
    return () => clearInterval(id);
  }, [autoRefresh]);

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
        <Dot className="bg-slate-800/80" />
        Check-outs
      </div>
    </div>
  );

  return (
    <div className="px-5 py-4">
      {/* top stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Active Vendors" value={metrics.activeVendors} />
        <StatCard label="Check-ins" value={metrics.checkIns} />
        <StatCard label="Check-outs" value={metrics.checkOuts} />
        <StatCard label="Flagged Vendors" value={metrics.flaggedVendors} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* left column span 3 */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {/* chart */}
          <Card
            title="Today's Vendor Activity (7AM - 7PM)"
            right={
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {chartLegend}
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
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={hourly}>
                    <defs>
                      <linearGradient id="gActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="hour" tick={{ fontSize: 12, fill: "#6b7280" }} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      domain={[0, "dataMax + 1"]}
                      label={{ value: "Active Vendors", angle: -90, position: "insideLeft", fill: "#6b7280", fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                      domain={[0, "dataMax + 1"]}
                      label={{ value: "Check-ins/Check-outs", angle: -90, position: "insideRight", fill: "#6b7280", fontSize: 11 }}
                    />
                    <Tooltip
                      wrapperStyle={{ outline: "none" }}
                      contentStyle={{ borderRadius: 12, borderColor: "#e5e7eb" }}
                    />
                    {/* Area = Active Vendors */}
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="active"
                      fill="url(#gActive)"
                      stroke="#94a3b8"
                      strokeWidth={2}
                    />
                    {/* Lines = checkins & checkouts */}
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="checkins"
                      stroke="#fb923c"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="checkouts"
                      stroke="#0f172a"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          {/* Activity Feed */}
          <Card title="Activity Feed" right={
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Show</span>
              <select className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs">
                <option>10</option>
                <option>20</option>
                <option>50</option>
              </select>
            </div>
          }>
            <ul className="divide-y divide-slate-200">
              {activityFeed.map((ev) => (
                <li key={ev.id} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <img
                      alt={ev.vendor}
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        ev.vendor
                      )}`}
                      className="mt-0.5 h-9 w-9 rounded-full border border-slate-200"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-800">
                        <span className="font-semibold">{ev.vendor}</span>{" "}
                        from <span className="font-medium">{ev.company}</span>{" "}
                        {ev.action} <span className="font-medium">{ev.target}</span>{" "}
                        <button
                          className="ml-1 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                          onClick={() => alert("Edit details")}
                        >
                          Edit Details
                        </button>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <Dot className="bg-emerald-500" />
                        {new Date(ev.at).toLocaleDateString()}{" "}
                        {fmtTimeHM(ev.at)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* right rail */}
        <div className="flex flex-col gap-4">
          <Card title="Total Vendors Today">
            <div className="px-4 py-5 text-2xl font-bold text-slate-900">
              {metrics.totalVendorsToday}
            </div>
          </Card>

          <Card title="Avg. Time on Site">
            <div className="px-4 py-5 text-2xl font-bold text-slate-900">
              {fmtHM(metrics.avgTimeOnSiteMins)}
            </div>
          </Card>

          <Card title="Most Active Vendors">
            <ol className="px-4 py-3 text-sm text-slate-800">
              {mostActiveVendors.map((v, i) => (
                <li key={v.name} className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-slate-500">#{i + 1}</span>
                    {v.name}
                  </span>
                  <span className="text-xs text-slate-500">{v.visits} Visits</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Most Active Vessels">
            <ol className="px-4 py-3 text-sm text-slate-800">
              {mostActiveBoats.map((b, i) => (
                <li key={b.name} className="flex items-center justify-between py-1.5">
                  <span className="flex items-center gap-2">
                    <span className="w-5 text-slate-500">#{i + 1}</span>
                    {b.name}
                  </span>
                  <span className="text-xs text-slate-500">{b.visits} Visits</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Auto refresh" right={
            <button
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              onClick={() => alert('Expand')}
              aria-label="Expand"
            >
              ⤢
            </button>
          }>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  id="auto-refresh"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <label htmlFor="auto-refresh">Auto refresh</label>
              </div>
              <Badge>60s</Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

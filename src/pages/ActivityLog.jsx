// src/pages/ActivityLog.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useTenant } from "../App"; // expects App to export useTenant (TenantContext)

/* ---------- tiny UI bits (no external deps) ---------- */
const IconAlert = (props) => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M9.05 2.86c.42-.73 1.48-.73 1.9 0l7.53 13.1c.41.71-.1 1.6-.95 1.6H2.48c-.84 0-1.36-.89-.95-1.6l7.52-13.1zM10 6.5c-.41 0-.75.34-.75.75v4.5c0 .41.34.75.75.75s.75-.34.75-.75v-4.5c0-.41-.34-.75-.75-.75zm0 7.25a1 1 0 100 2 1 1 0 000-2z"/>
  </svg>
);

const IconCheck = (props) => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M16.7 6.3a1 1 0 00-1.4-1.4L8 12.17l-3.3-3.3a1 1 0 00-1.4 1.42l4 4a1 1 0 001.4 0l8-8z"/>
  </svg>
);

const Avatar = ({ name, src, className = "" }) => {
  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className={`relative mr-3 h-8 w-8 overflow-hidden rounded-full bg-slate-200 text-xs font-bold text-slate-600 grid place-items-center ${className}`}>
      {src ? <img alt={name} src={src} className="h-full w-full object-cover" /> : initials}
    </div>
  );
};

const Sheet = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-xl">
        {children}
      </aside>
    </>
  );
};

const Pill = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={[
      "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium",
      active
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-700",
    ].join(" ")}
  >
    {children}
  </button>
);

/* ---------- tiny fetch helper ---------- */
const API = async (base, path, qs) => {
  const url = new URL((base || "") + path, window.location.origin);
  Object.entries(qs || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

/* ---------- page ---------- */
export default function ActivityLog({ apiBase = "" }) {
  const { tenantId } = useTenant();

  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [date, setDate] = useState("");
  const [selected, setSelected] = useState(null); // for Details Sheet
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Load live data from backend (removes dummy data)
  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    setErr("");
    API(apiBase, "/api/activity", { tenantId, limit: 500 })
      .then((data) => {
        const items = data?.items || [];
        setRows(
          items.map((r) => ({
            id: r.id,
            name: r.fullName || r.name || "—",
            company: r.company || r.company_name || "—",
            boat: r.boat || r.boat_name || "—",
            notes: r.notes || "-",
            checkin: r.checkin ? new Date(r.checkin).toLocaleString() : "—",
            checkout: r.checkout ? new Date(r.checkout).toLocaleString() : "—",
            flagged: !!r.flagged,
            avatar: r.avatar || "",
            phone: r.phone || "",
            email: r.email || "",
          }))
        );
      })
      .catch((e) => setErr(e.message || "Failed to load activity"))
      .finally(() => setLoading(false));
  }, [tenantId, apiBase]);

  const filtered = useMemo(() => {
    let res = [...rows];
    if (onlyFlagged) res = res.filter((r) => r.flagged);
    if (date) {
      // simple contains check against the date displayed (MM/DD/YYYY)
      res = res.filter((r) => (r.checkin || "").startsWith(new Date(date).toLocaleDateString()));
    }
    if (q.trim()) {
      const needle = q.toLowerCase();
      res = res.filter((r) =>
        [r.name, r.company, r.boat, r.notes, r.checkin, r.checkout]
          .map((x) => String(x || "").toLowerCase())
          .some((t) => t.includes(needle))
      );
    }
    return res;
  }, [rows, q, onlyFlagged, date]);

  const totalRecords = rows.length;

  const exportCSV = () => {
    const header = ["Full name", "Company name", "Boat Name", "Notes", "Check-in", "Check-out", "Flags"];
    const body = filtered.map((r) => [
      r.name,
      r.company,
      r.boat,
      r.notes,
      r.checkin,
      r.checkout,
      r.flagged ? "FLAGGED" : "OK",
    ]);
    const csv = [header, ...body]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "activity-log.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!tenantId) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm text-slate-600">Select a site to view the activity log.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Activity log</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-emerald-600">
            Total records: {loading ? "…" : totalRecords}
          </div>
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            ⤓ Export
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-8 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
            />
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
          </div>

          <Pill active={onlyFlagged} onClick={() => setOnlyFlagged((s) => !s)}>
            ⚑ Flags
          </Pill>

          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
              aria-label="Pick a date"
            />
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr className="bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]">
                <th>Full name</th>
                <th>Company name</th>
                <th>Boat Name</th>
                <th>Notes</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th className="w-16">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] cursor-pointer"
                  onClick={() => setSelected(r)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <Avatar name={r.name} src={r.avatar} />
                      <span className="font-medium text-slate-800">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.company || "—"}</td>
                  <td className="px-4 py-3">{r.boat || "—"}</td>
                  <td className="px-4 py-3">{r.notes || "—"}</td>
                  <td className="px-4 py-3">{r.checkin || "—"}</td>
                  <td className="px-4 py-3">{r.checkout || "—"}</td>
                  <td className="px-4 py-3">
                    {r.flagged ? (
                      <span className="inline-flex items-center gap-1 text-rose-600">
                        <IconAlert className="h-4 w-4" /> {/* flagged */}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600">
                        <IconCheck className="h-4 w-4" /> {/* ok */}
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No records found.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
                    Loading…
                  </td>
                </tr>
              )}

              {err && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-rose-600">
                    {err}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Sheet */}
      <Sheet open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div className="flex flex-col h-full">
            <header className="mb-4">
              <h3 className="text-base font-bold tracking-tight">Visit details</h3>
            </header>

            <div className="flex flex-col items-center gap-3">
              <Avatar name={selected.name} src={selected.avatar} className="h-24 w-24 text-2xl" />
              <div className="text-center">
                <div className="text-lg font-semibold">{selected.name}</div>
                <div className="text-sm text-slate-500">{selected.company}</div>
              </div>

              <div className="grid w-full grid-cols-1 gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Boat name</div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">{selected.boat || "—"}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Phone</div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">{selected.phone || "—"}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Email</div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">{selected.email || "—"}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Check-in time</div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      {selected.checkin || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Check-out time</div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                      {selected.checkout || "—"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Notes</div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 min-h-10">{selected.notes || "—"}</div>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Flags</div>
                  <div className="mt-2 flex items-center gap-2">
                    {selected.flagged ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                        <IconAlert className="h-4 w-4" /> Flagged
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                        <IconCheck className="h-4 w-4" /> OK
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto flex gap-2 pt-6">
              <button
                onClick={() => setSelected(null)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}

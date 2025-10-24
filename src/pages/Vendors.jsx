// src/pages/Vendors.jsx
import React, { useRef, useState, useEffect } from "react";
import { useTenant } from "../App";

/* ---------- tiny headless dropdown for row actions ---------- */
function Menu({ open, onClose, anchorRef, children, width = 200 }) {
  const [style, setStyle] = useState({});
  React.useLayoutEffect(() => {
    if (!open) return;
    const el = anchorRef?.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setStyle({
      position: "absolute",
      top: r.bottom + 8 + window.scrollY,
      left: r.right - width + window.scrollX,
      width,
      zIndex: 50,
    });
    const onDoc = (e) => {
      if (!el.contains(e.target)) onClose?.();
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open, anchorRef, width, onClose]);
  if (!open) return null;
  return (
    <div style={style} className="rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
      {children}
    </div>
  );
}

/* ---------- helpers ---------- */
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtMoney = (n) =>
  n || n === 0
    ? new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
    : "—";
const daysAgo = (d) => {
  if (!d) return "—";
  const ms = Date.now() - new Date(d).getTime();
  const days = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  return `${days} days ago`;
};

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "APPROVED", label: "APPROVED" },
  { value: "BLOCKED_REGISTRATION", label: "BLOCKED_REGISTRATION" },
  { value: "BLOCKED_COMPLIANCE", label: "BLOCKED_COMPLIANCE" },
  { value: "BLOCKED", label: "BLOCKED" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All" },
  { value: "Canvas", label: "Canvas" },
  { value: "General Boat", label: "General Boat" },
  { value: "Engine Service", label: "Engine Service" },
  { value: "Electrical/Batteries", label: "Electrical/Batteries" },
  { value: "AC/Cooling", label: "AC/Cooling" },
  { value: "Wraps/Decals/Ceramic", label: "Wraps/Decals/Ceramic" },
];

/* ---------- status chip ---------- */
function StatusBadge({ status }) {
  const map = {
    APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    BLOCKED_REGISTRATION: "bg-rose-50 text-rose-700 border-rose-200",
    BLOCKED_COMPLIANCE: "bg-amber-50 text-amber-700 border-amber-200",
    BLOCKED: "bg-rose-50 text-rose-700 border-rose-200",
  };
  const cls = map[status] || "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs font-semibold ${cls}`}>
      {status || "—"}
    </span>
  );
}

/* ---------- tiny fetch helper ---------- */
function makeApi(baseFromProp) {
  const envBase =
    (import.meta?.env?.VITE_API_BASE_URL || import.meta?.env?.VITE_API_BASE || "").replace(/\/$/, "");
  const base = (baseFromProp || envBase).replace(/\/$/, "");
  return async function api(path, qs = {}) {
    const url = new URL(base + path, window.location.origin);
    Object.entries(qs).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
    const res = await fetch(url.toString(), { credentials: "include" });
    const ct = res.headers.get("content-type") || "";
    if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
    if (!ct.includes("application/json")) {
      const t = await res.text();
      throw new Error(`Expected JSON, got ${ct}. ${t?.startsWith("<!doctype") ? "Check API base/proxy." : ""}`);
    }
    return res.json();
  };
}

/* ===================== PAGE ===================== */
export default function Vendors({ apiBase = "" }) {
  const { tenantId } = useTenant();
  const api = React.useMemo(() => makeApi(apiBase), [apiBase]);

  // live data (no mocks)
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // debounced search
  const [dq, setDq] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDq(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    setErr("");
    api("/api/vendors", { tenantId, q: dq, status, type, limit: 500 })
      .then((data) => {
        const items = data?.items || data || [];
        setRows(
          items.map((r) => ({
            id: r.vendor_id,                           // <- key fix
            vendor: r.name,                             // <- name column
            email: r.email,
            phone: r.phone,
            type: r.vendor_type,                        // <- vendor_type
            status: r.status,
            registeredSince: r.registered_since,        // timestamp
            lastOnSite: r.last_on_site,                 // timestamp
            daysSinceLastOnSite: r.days_since_last_on_site,
            regFeePaid: r.registration_fee_paid,        // boolean
            insuranceExpiry: r.insurance_expiry,        // date
            workersComp: r.workmans_comp,               // numeric
            marinaAdd: !!r.marina_add,                  // numeric -> boolean-ish
            eachOccurrence: r.each_occurrence,
            damageToPremises: r.damage_to_rented_premises,
            generalAggregate: r.general_aggregate,
          }))
        );
        setTotal(data?.total ?? items.length);
      })
      .catch((e) => setErr(e.message || "Failed to load vendors"))
      .finally(() => setLoading(false));
  }, [tenantId, dq, status, type, api]);

  // actions menu
  const [openId, setOpenId] = useState(null);
  const btnRefs = useRef({});
  const close = () => setOpenId(null);
  const onEdit = (id) => { alert(`Edit vendor ${id}`); close(); };
  const onDelete = (id) => {
    if (!confirm("Delete this vendor?")) return;
    // TODO: call backend delete if/when you add the endpoint
    setRows((prev) => prev.filter((r) => r.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    close();
  };

  if (!tenantId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-600">
        Select a site to view vendors.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">Vendors</h2>
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-emerald-600">
            {loading ? "Loading…" : `Total Vendors: ${total}`}
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
            onClick={() => alert("Add vendor")}
          >
            ＋ Add vendor
          </button>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Filters Row */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-8 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
            />
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
          </div>

          {/* Status filter pill */}
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
            <span className="px-2 text-sm text-slate-600">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Type filter pill */}
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
            <span className="px-2 text-sm text-slate-600">Type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm outline-none"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[1200px] border-collapse text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
                <th>Name</th>
                <th>E-mail</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Status</th>
                <th>Registered since</th>
                <th>Days since last on site</th>
                <th>Registration fee paid ?</th>
                <th>Insurance expiry</th>
                <th>Workman’s Comp</th>
                <th>Marina add?</th>
                <th>Each Occurrence</th>
                <th>Damage to rented premises</th>
                <th>General Aggregate</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {rows.map((r) => (
                <tr key={r.id} className="bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]">
                  <td className="px-4 py-3"><div className="font-medium text-slate-800">{r.vendor}</div></td>
                  <td className="px-4 py-3">{r.email || "—"}</td>
                  <td className="px-4 py-3">{r.phone || "—"}</td>
                  <td className="px-4 py-3">{r.type || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">{fmtDate(r.registeredSince)}</td>
                  <td className="px-4 py-3">
                    {r.daysSinceLastOnSite != null ? `${r.daysSinceLastOnSite} days` : daysAgo(r.lastOnSite)}
                  </td>
                  <td className="px-4 py-3">{r.regFeePaid == null ? "—" : r.regFeePaid ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{fmtDate(r.insuranceExpiry)}</td>
                  <td className="px-4 py-3">{fmtMoney(r.workersComp)}</td>
                  <td className="px-4 py-3">{r.marinaAdd ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{fmtMoney(r.eachOccurrence)}</td>
                  <td className="px-4 py-3">{fmtMoney(r.damageToPremises)}</td>
                  <td className="px-4 py-3">{fmtMoney(r.generalAggregate)}</td>
                  <td className="px-2 py-3">
                    <RowMenu id={r.id} onEdit={onEdit} onDelete={onDelete} btnRefs={btnRefs} openId={openId} setOpenId={setOpenId} close={close} />
                  </td>
                </tr>
              ))}

              {!loading && rows.length === 0 && (
                <tr key="empty">
                  <td colSpan={15} className="px-4 py-10 text-center text-sm text-slate-500">
                    No vendors found{q || status || type ? " for your search/filters." : "."}
                  </td>
                </tr>
              )}

              {loading && (
                <tr key="loading">
                  <td colSpan={15} className="px-4 py-6 text-center text-sm text-slate-500">Loading…</td>
                </tr>
              )}

              {err && (
                <tr key="error">
                  <td colSpan={15} className="px-4 py-6 text-center text-sm text-rose-600">{err}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* split out to keep row <td> clean */
function RowMenu({ id, onEdit, onDelete, btnRefs, openId, setOpenId, close }) {
  return (
    <div className="relative">
      <button
        ref={(el) => (btnRefs.current[id] = el)}
        onClick={() => setOpenId((prev) => (prev === id ? null : id))}
        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
        aria-label="Row actions"
      >
        ⋯
      </button>
      <Menu open={openId === id} onClose={close} anchorRef={{ current: btnRefs.current[id] }}>
        <button className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => onEdit(id)}>
          Edit
        </button>
        <button className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50" onClick={() => onDelete(id)}>
          Delete
        </button>
      </Menu>
    </div>
  );
}

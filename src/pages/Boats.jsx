// src/pages/Boats.jsx
import React from "react";
import { useTenant } from "../App"; // make sure App exports useTenant (TenantContext)

/** Tiny headless dropdown used by row actions (no external deps) */
function Menu({ open, onClose, anchorRef, children }) {
  const [style, setStyle] = React.useState({});
  React.useLayoutEffect(() => {
    if (!open) return;
    const el = anchorRef?.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setStyle({
      position: "absolute",
      top: rect.bottom + 8 + window.scrollY,
      left: rect.right - 180 + window.scrollX, // right-align
      width: 180,
      zIndex: 50,
    });

    function onDoc(e) {
      if (!el.contains(e.target)) onClose?.();
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open, anchorRef, onClose]);

  if (!open) return null;
  return (
    <div style={style} className="rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
      {children}
    </div>
  );
}

/* ------- tiny API helper ------- */
const ENV_BASE =
  (import.meta?.env?.VITE_API_BASE_URL ||
    import.meta?.env?.VITE_API_BASE ||
    "")?.replace?.(/\/$/, "") || "";

async function api(base, path, qs) {
  const url = new URL((base || ENV_BASE) + path, window.location.origin);
  Object.entries(qs || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), { credentials: "include" });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  if (!ct.includes("application/json")) {
    const t = await res.text();
    throw new Error(
      `Expected JSON, got ${ct}. ${t?.startsWith("<!doctype") ? "Check VITE_API_BASE_URL or Vite proxy." : ""}`
    );
  }
  return res.json();
}

export default function Boats({ apiBase = "" }) {
  const { tenantId } = useTenant();

  // ---- live data (no mocks) ----
  const [rows, setRows] = React.useState([]);
  const [q, setQ] = React.useState("");
  const [showArchived, setShowArchived] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState("");

  const fetchBoats = React.useCallback(() => {
    if (!tenantId) return;
    setLoading(true);
    setErr("");
    api(apiBase, "/api/boats", {
      tenantId,
      q,
      archived: showArchived,
    })
      .then((data) => {
        const items = data?.items || [];
        setRows(
          items.map((r) => ({
            id: r.id,
            name: r.name,
            manufacturer: r.manufacturer,
            location: r.location,
            owner: r.owner,
            captain: r.captain,
            renewal: r.renewal, // server currently sets "—" when unknown
            archived: !!r.archived,
          }))
        );
      })
      .catch((e) => setErr(e.message || "Failed to load boats"))
      .finally(() => setLoading(false));
  }, [tenantId, q, showArchived, apiBase]);

  React.useEffect(() => {
    fetchBoats();
  }, [fetchBoats]);

  const totalCount = rows.length;

  // ---------- row actions (UI only for now) ----------
  const [menuOpenId, setMenuOpenId] = React.useState(null);
  const btnRefs = React.useRef({});
  const toggleMenu = (id) => setMenuOpenId((prev) => (prev === id ? null : id));
  const closeMenu = () => setMenuOpenId(null);

  const handleArchiveToggle = (id) => {
    // TODO: call backend to toggle archive when endpoint exists
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, archived: !r.archived } : r)));
    closeMenu();
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this boat? This cannot be undone.")) return;
    // TODO: call backend to delete when endpoint exists
    setRows((prev) => prev.filter((r) => r.id !== id));
    closeMenu();
  };

  const handleEdit = (id) => {
    // In your real app, navigate to /boats/:id/edit
    alert(`Edit boat ${id}`);
    closeMenu();
  };

  if (!tenantId) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-600">
          Select a site to view boats.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page header bar */}
      <div className="flex items-center justify-end gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          onClick={() => alert("Import coming soon")}
        >
          ⬆︎ Import boats
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-black"
          onClick={() => alert("Add new boat")}
        >
          ＋ Add new boat
        </button>
      </div>

      {/* Section title and search/filter */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Boats</h2>
          <div className="text-xs font-semibold text-emerald-600">
            {loading ? "Loading…" : `Total Boats: ${totalCount}`}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-8 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
            />
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
          </div>

          <button
            onClick={() => setShowArchived((s) => !s)}
            className={[
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium",
              showArchived
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-slate-50 text-slate-700",
            ].join(" ")}
          >
            ● Archived
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-semibold">
                <th>Name</th>
                <th>Manufacturer</th>
                <th>Location</th>
                <th>Owner</th>
                <th>Captain</th>
                <th>Latest Renewal</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {rows.map((r) => (
                <tr key={r.id} className="bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))]">
                  <td className="px-4 py-3">{r.name || "—"}</td>
                  <td className="px-4 py-3">{r.manufacturer || "—"}</td>
                  <td className="px-4 py-3">{r.location || "—"}</td>
                  <td className="px-4 py-3">{r.owner || "—"}</td>
                  <td className="px-4 py-3">{r.captain || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{r.renewal || "—"}</td>
                  <td className="px-2 py-3">
                    <div className="relative">
                      <button
                        ref={(el) => (btnRefs.current[r.id] = el)}
                        onClick={() => toggleMenu(r.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                        aria-label="Row actions"
                      >
                        ⋯
                      </button>

                      <Menu
                        open={menuOpenId === r.id}
                        onClose={closeMenu}
                        anchorRef={{ current: btnRefs.current[r.id] }}
                      >
                        <button
                          className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => handleEdit(r.id)}
                        >
                          Edit
                        </button>
                        <button
                          className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                          onClick={() => handleArchiveToggle(r.id)}
                        >
                          {r.archived ? "Unarchive" : "Archive"}
                        </button>
                        <button
                          className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                          onClick={() => handleDelete(r.id)}
                        >
                          Delete
                        </button>
                      </Menu>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No boats found{q ? " for your search." : showArchived ? " in archived." : "."}
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
    </div>
  );
}

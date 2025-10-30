// src/components/Topbar.jsx
import React, { useEffect, useState } from "react";
import { api, getTenant, setTenant } from "../lib/api";

// keep your icons/theme code...
// const Icon = { ... } etc.

export default function Topbar() {
  const [marinas, setMarinas] = useState([]);       // [{ id, slug, name }]
  const [tenant, setTenantState] = useState(getTenant());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");

    // NOTE: your backend requires a tenant even for /api/marinas
    api("/api/marinas")
      .then((data) => {
        if (!alive) return;
        // Accept either {items:[...]} or plain array
        const items = Array.isArray(data) ? data : data?.items || [];
        setMarinas(items);

        // If current tenant isn't in list, pick first as default
        const hasCurrent =
          items.some((m) => m.id === tenant || m.slug === tenant || m.name === tenant);
        if (!hasCurrent && items.length) {
          const fallback = items[0].slug || items[0].id || items[0].name;
          setTenant(fallback);
          setTenantState(fallback);
        }
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e.message || "Failed to load marinas");
        console.error("Failed to load marinas:", e);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []); // run once

  const onChangeSite = (e) => {
    const val = e.target.value;
    setTenant(val);
    setTenantState(val);
    // simplest way to refresh all data panes:
    window.location.reload();
  };

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800/40 bg-slate-900 px-4 py-3">
      {/* left side: title (keep your existing icons/buttons as-is) */}
      <div className="text-[15px] font-bold text-slate-50">Economic Dashboard</div>

      <div className="flex items-center gap-3">
        {/* Theme toggle — keep your existing control */}
        {/* ... */}

        {/* Site select */}
        <select
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          value={tenant}
          onChange={onChangeSite}
          disabled={loading}
          title={err || ""}
        >
          {marinas.map((m) => {
            const value = m.slug || m.id || m.name;
            return (
              <option key={value} value={value}>
                {m.name || m.title || value}
              </option>
            );
          })}
          {!marinas.length && <option value={tenant}>{loading ? "Loading…" : tenant}</option>}
        </select>
      </div>
    </div>
  );
}

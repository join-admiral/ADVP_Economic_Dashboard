// src/lib/api.js
const API_BASE = import.meta.env.VITE_API_BASE || "https://advp-economic-dashboard-backend.onrender.com";

export const getTenant = () =>
  localStorage.getItem("tenant") || "admirals-cove"; // <-- set your real default slug or numeric id

export const setTenant = (t) => {
  localStorage.setItem("tenant", t);
};

export async function api(path, init = {}) {
  const base = API_BASE.replace(/\/$/, "");
  const url = new URL(path, base);

  // always attach tenant + timezone
  const tenant = getTenant();
  if (!url.searchParams.has("tenant")) url.searchParams.set("tenant", tenant);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!url.searchParams.has("tz")) url.searchParams.set("tz", tz);

  const res = await fetch(url.toString(), {
    ...init,
    credentials: "include",
    headers: {
      ...(init.headers || {}),
      "X-Tenant-Id": tenant, // header fallback for your middleware
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

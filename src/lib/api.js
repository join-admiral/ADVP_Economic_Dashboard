const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000";

export function getTenant() {
  return localStorage.getItem("tenant") || "admirals-cove"; // <-- pick a real default slug or id
}

export function setTenant(t) {
  localStorage.setItem("tenant", t);
}

export async function api(path, init = {}) {
  const u = new URL(path, API_BASE);
  // attach tenant & timezone
  const tenant = getTenant();
  if (!u.searchParams.has("tenant")) u.searchParams.set("tenant", tenant);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (!u.searchParams.has("tz")) u.searchParams.set("tz", tz);

  const res = await fetch(u, {
    ...init,
    headers: {
      ...(init.headers || {}),
      "x-tenant-id": tenant, // header fallback (middleware usually accepts this too)
    },
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `${res.status}`);
  }
  return res.json();
}

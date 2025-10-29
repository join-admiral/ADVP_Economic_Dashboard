export const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || "";

export async function readJson(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} – ${text.slice(0,200)}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    throw new Error(`Expected JSON, got "${ct}". Body: ${text.slice(0,200)}`);
  }
  return res.json();
}

import { sbAdmin } from "../supabase.js";

/**
 * Resolves tenant either from numeric id or slug.
 * Accepts ?tenantId=123  OR  ?tenantId=f3
 */
async function resolveTenantId(raw) {
  if (!raw) return null;
  // numeric string -> int id
  if (/^\d+$/.test(String(raw))) return Number(raw);

  // otherwise treat as slug and look it up
  const { data, error } = await sbAdmin
    .from("multitenancy_tenant")
    .select("id")
    .eq("slug", String(raw))
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function tenantGuard(req, res, next) {
  try {
    const raw = req.query.tenantId || req.header("x-tenant-id") || req.params.tenantId;
    const tenantId = await resolveTenantId(raw);
    if (!tenantId) return res.status(400).json({ error: "tenantId (id or slug) required/unknown" });
    req.tenantId = tenantId;
    next();
  } catch (e) {
    res.status(500).json({ error: e.message || "tenant resolution failed" });
  }
}

// server/middlewares/tenant.js
import { sbAdmin } from "../supabase.js";

/** Resolve tenant either from numeric id or slug. Returns Number id or null. */
async function resolveTenantId(raw) {
  if (!raw) return null;
  if (/^\d+$/.test(String(raw))) return Number(raw);

  const { data, error } = await sbAdmin
    .from("multitenancy_tenant")
    .select("id")
    .eq("slug", String(raw))
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

/**
 * Middleware:
 *  - Reads tenant from header "X-Tenant-Id", query "?tenantId=", or route param ":tenantId"
 *  - Resolves slug -> id when needed
 *  - Sets req.tenant_id (underscore) and req.tenantId (camelCase)
 */
async function tenant(req, res, next) {
  try {
    const raw =
      req.header("x-tenant-id") ||
      req.header("X-Tenant-Id") ||
      req.query.tenantId ||
      req.params.tenantId;

    const tenantId = await resolveTenantId(raw);

    if (!tenantId) {
      return res
        .status(400)
        .json({ error: "tenantId (numeric id or slug) is required or unknown" });
    }

    req.tenant_id = tenantId;
    req.tenantId = tenantId;

    next();
  } catch (e) {
    console.error("tenant middleware error:", e);
    res.status(500).json({ error: e.message || "tenant resolution failed" });
  }
}

export default tenant;
// Back-compat named exports so old imports keep working:
export { tenant as tenantGuard, resolveTenantId };
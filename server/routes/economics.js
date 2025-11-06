// server/routes/economics.js
import { Router } from "express";
import { sbAdmin as supa, advpSb } from "../supabase.js";
import { tenantGuard } from "../middlewares/tenant.js";

const router = Router();
router.use(tenantGuard);

function rid() {
  return Math.random().toString(36).slice(2, 8);
}
function log(prefix, obj) {
  const ts = new Date().toISOString();
  console.log(`[econ] ${ts} ${prefix}`, obj ?? "");
}

async function callRpc(rpcName, args, reqId) {
  const t0 = Date.now();
  const { data, error } = await supa.rpc(rpcName, args);
  const ms = Date.now() - t0;
  if (error) {
    log(`[${reqId}] RPC ${rpcName} error`, { args, error: error.message, ms });
    throw error;
  }
  log(`[${reqId}] RPC ${rpcName} ok`, { args, rows: (data || []).length, ms });
  return data;
}

/* -----------------------------------------------------------
 * ✅ FIXED: Vendors/Vessels using your GitHub code
 * ----------------------------------------------------------- */

router.get("/vendors", async (req, res) => {
  const reqId = rid();
  try {
    const tenantId = req.tenant_id || Number(req.headers["x-tenant-id"] ?? req.query.tenantId);
    if (!tenantId) return res.status(400).json({ error: "Missing tenant_id" });
    
    log(`[${reqId}] /vendors`, { tenantId });

    // ✅ Use your GitHub RPC function - fetch ALL vendors
    const { data, error } = await supa.rpc("get_top_vendors_by_tenant", {
      p_tenant_id: tenantId,
      p_limit: 1000, // Fetch all vendors (high limit to get everything)
    });

    if (error) {
      log(`[${reqId}] /vendors error`, error.message);
      throw error;
    }

    // Normalize the response to match expected format
    const items = (data || []).map((r) => ({
      tenant_id: r.tenant_id ?? tenantId,
      company_name: r.company_name ?? r.vendor_name ?? r.name ?? "—",
      hours: Number(r.hours ?? r.total_hours ?? 0),
      total_wages: Number(r.total_wages ?? r.value ?? 0),
    }));

    log(`[${reqId}] /vendors success`, { count: items.length });
    res.json({ items });
  } catch (e) {
    log(`[${reqId}] /vendors ERR`, e.message || e);
    // Graceful fallback - don't crash the dashboard
    res.json({ items: [] });
  }
});

router.get("/vessels", async (req, res) => {
  const reqId = rid();
  try {
    const tenantId = req.tenant_id || Number(req.headers["x-tenant-id"] ?? req.query.tenantId);
    if (!tenantId) return res.status(400).json({ error: "Missing tenant_id" });
    
    log(`[${reqId}] /vessels`, { tenantId });

    // ✅ Use your GitHub RPC function - fetch ALL vessels
    const { data, error } = await supa.rpc("get_top_vessels_by_tenant", {
      p_tenant_id: tenantId,
      p_limit: 1000, // Fetch all vessels (high limit to get everything)
    });

    if (error) {
      log(`[${reqId}] /vessels error`, error.message);
      throw error;
    }

    // Normalize the response to match expected format
    const items = (data || []).map((r) => ({
      tenant_id: r.tenant_id ?? tenantId,
      boat_name: r.boat_name ?? r.vessel_name ?? r.name ?? "—",
      hours: Number(r.hours ?? r.total_hours ?? 0),
      total_wages: Number(r.total_wages ?? r.value ?? 0),
    }));

    log(`[${reqId}] /vessels success`, { count: items.length });
    res.json({ items });
  } catch (e) {
    log(`[${reqId}] /vessels ERR`, e.message || e);
    // Graceful fallback - don't crash the dashboard
    res.json({ items: [] });
  }
});

/* ---------------- Summary / Trend / Quick Stats (RPC) ---------------- */

router.get("/summary", async (req, res) => {
  const reqId = rid();
  try {
    const tenantId = Number(req.headers["x-tenant-id"] ?? req.query.tenantId);
    log(`[${reqId}] /summary`, { tenantId });

    const { data, error } = await advpSb.rpc("get_econ_summary", { p_tenant_id: tenantId });
    if (error) throw error;

    const row = data?.[0] ?? {};
    const payload = {
      yday_value: Number(row.yday_value) || 0,
      week: Number(row.week_value ?? row.week) || 0,
      month: Number(row.month_value ?? row.month) || 0,
      all_time: Number(row.all_time_value ?? row.all_time) || 0,
      active_vendors_yday: Number(row.active_vendors_yday) || 0,
      cutoff: row.cutoff || null,
    };
    log(`[${reqId}] /summary payload`, payload);
    res.json(payload);
  } catch (e) {
    log(`[${reqId}] /summary ERR`, e.message || e);
    res.status(500).json({ error: e.message ?? "summary failed" });
  }
});

router.get("/trend", async (req, res) => {
  const reqId = rid();
  try {
    const tenantId = Number(req.headers["x-tenant-id"] ?? req.query.tenantId);
    const granularity = String(req.query.granularity || "day");
    const days = Number(req.query.days || 180);
    log(`[${reqId}] /trend`, { tenantId, granularity, days });

    const { data, error } = await advpSb.rpc("get_econ_trend_map", {
      p_tenant_id: tenantId,
      p_granularity: granularity,
      p_days: days,
    });
    if (error) throw error;

    const items = (data || []).map((r) => ({ d: r.bucket_date, value: Number(r.value) || 0 }));
    log(`[${reqId}] /trend items`, { count: items.length, first3: items.slice(0, 3) });
    res.json({ items });
  } catch (e) {
    log(`[${reqId}] /trend ERR`, e.message || e);
    res.status(500).json({ error: e.message ?? "trend failed" });
  }
});

// GET /api/economics/_debug/trend-stats?tenantId=6&days=180&granularity=day
router.get("/_debug/trend-stats", async (req, res) => {
  const reqId = rid();
  try {
    const tenantId = Number(req.headers["x-tenant-id"] ?? req.query.tenantId);
    const granularity = String(req.query.granularity || "day");
    const days = Number(req.query.days || 180);

    const { data, error } = await advpSb.rpc("get_econ_trend_map", {
      p_tenant_id: tenantId,
      p_granularity: granularity,
      p_days: days,
    });
    if (error) throw error;

    const items = (data || []).map((r) => ({ d: r.bucket_date, value: Number(r.value) || 0 }));
    const out = {
      count: items.length,
      first: items[0] || null,
      last: items.at(-1) || null,
      last3: items.slice(-3),
      range: items.length ? `${items[0].d} → ${items.at(-1).d}` : null,
    };
    log(`[${reqId}] /_debug/trend-stats`, out);
    res.json(out);
  } catch (e) {
    log(`[${reqId}] /_debug/trend-stats ERR`, e.message || e);
    res.status(500).json({ error: e.message ?? "trend-stats failed" });
  }
});

router.get("/quick-stats", async (req, res) => {
  const reqId = rid();
  try {
    const tenantId = Number(req.headers["x-tenant-id"] ?? req.query.tenantId);
    log(`[${reqId}] /quick-stats`, { tenantId });

    const { data, error } = await supa.rpc("get_econ_quick_stats", { p_tenant_id: tenantId });
    if (error) throw error;

    const row = data?.[0] ?? {};
    const payload = {
      daily_avg_30: Number(row.daily_avg_30) || 0,
      cutoff: row.cutoff || null,
    };
    log(`[${reqId}] /quick-stats payload`, payload);
    res.json(payload);
  } catch (e) {
    log(`[${reqId}] /quick-stats ERR`, e.message || e);
    res.status(500).json({ error: e.message ?? "quick-stats failed" });
  }
});

// One-shot bundle to eyeball server numbers
router.get("/_debug/snapshot", async (req, res) => {
  const reqId = rid();
  try {
    const tenantId = Number(req.headers["x-tenant-id"] ?? req.query.tenantId);
    log(`[${reqId}] /_debug/snapshot`, { tenantId });

    const [summary, trend, quick, vendors, vessels] = await Promise.all([
      advpSb.rpc("get_econ_summary", { p_tenant_id: tenantId }),
      advpSb.rpc("get_econ_trend_map", { p_tenant_id: tenantId, p_granularity: "day", p_days: 30 }),
      supa.rpc("get_econ_quick_stats", { p_tenant_id: tenantId }),
      supa.rpc("get_top_vendors_by_tenant", { p_tenant_id: tenantId, p_limit: 10 }),
      supa.rpc("get_top_vessels_by_tenant", { p_tenant_id: tenantId, p_limit: 10 }),
    ]);

    const out = {
      cutoff: summary?.data?.[0]?.cutoff ?? null,
      yday_value: Number(summary?.data?.[0]?.yday_value) || 0,
      week: Number(summary?.data?.[0]?.week_value ?? summary?.data?.[0]?.week) || 0,
      month: Number(summary?.data?.[0]?.month_value ?? summary?.data?.[0]?.month) || 0,
      all_time: Number(summary?.data?.[0]?.all_time_value ?? summary?.data?.[0]?.all_time) || 0,
      active_vendors_yday: Number(summary?.data?.[0]?.active_vendors_yday) || 0,
      daily_avg_30: Number(quick?.data?.[0]?.daily_avg_30) || 0,
      trend_len: (trend?.data || []).length,
      trend_first3: (trend?.data || []).slice(0, 3),
      vendors_count: (vendors?.data || []).length,
      vessels_count: (vessels?.data || []).length,
    };
    log(`[${reqId}] /_debug/snapshot out`, out);
    res.json(out);
  } catch (e) {
    log(`[${reqId}] /_debug/snapshot ERR`, e.message || e);
    res.status(500).json({ error: e.message ?? "snapshot failed" });
  }
});

export default router;
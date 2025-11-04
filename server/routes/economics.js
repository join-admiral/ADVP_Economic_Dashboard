// server/routes/economics.js

import { sbAdmin } from "../supabase.js";
import { tenantGuard } from "../middlewares/tenant.js";
import { Router } from "express";
import { advpSb } from "../supabase.js";
const router = Router();
router.use(tenantGuard);
router.get("/vendors", async (req, res) => {
  try {
    const tenantId = req.tenant_id;
    if (!tenantId) return res.status(400).json({ error: "Missing tenant_id" });

    const { data, error } = await sbAdmin.rpc("get_top_vendors_by_tenant", {
      p_tenant_id: tenantId,
      p_limit: 5,
    });
    if (error) throw error;
    res.json({ items: data || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Server error" });
  }
});

router.get("/vessels", async (req, res) => {
  try {
    const tenantId = req.tenant_id;
    if (!tenantId) return res.status(400).json({ error: "Missing tenant_id" });

    const { data, error } = await sbAdmin.rpc("get_top_vessels_by_tenant", {
      p_tenant_id: tenantId,
      p_limit: 5,
    });
    if (error) throw error;
    res.json({ items: data || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || "Server error" });
  }
});

// server/routes/economics.js
// ...existing imports & routes...
// server/routes/economics.js


// server/routes/economics.js





router.get("/summary", async (req, res) => {
  try {
    const tenantId = Number(req.headers["x-tenant-id"] ?? req.query.tenantId);
    const { data, error } = await advpSb.rpc("get_econ_summary", { p_tenant_id: tenantId });
    if (error) throw error;
    const row = data?.[0] ?? {};
    res.json({
      yday_value: Number(row.yday_value) || 0,
      week: Number(row.week_value) || 0,
      month: Number(row.month_value) || 0,
      all_time: Number(row.all_time_value) || 0,
      active_vendors_yday: Number(row.active_vendors_yday) || 0,
      cutoff: row.cutoff || null,
    });
  } catch (e) {
    console.error("summary error:", e);
    res.status(500).json({ error: e.message ?? "summary failed" });
  }
});

router.get("/trend", async (req, res) => {
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
    res.json({
      items: (data || []).map((r) => ({ d: r.bucket_date, value: Number(r.value) || 0 })),
    });
  } catch (e) {
    console.error("trend error:", e);
    res.status(500).json({ error: e.message ?? "trend failed" });
  }
});

router.get("/quick-stats", async (req, res) => {
  try {
    const tenantId = Number(req.headers["x-tenant-id"] ?? req.query.tenantId);
    const { data, error } = await sbAdmin.rpc("get_econ_quick_stats", { p_tenant_id: tenantId });
    if (error) throw error;
    const row = data?.[0] ?? {};
    res.json({
      daily_avg_30: Number(row.daily_avg_30) || 0,
      cutoff: row.cutoff || null,
    });
  } catch (e) {
    console.error("quick-stats error:", e);
    res.status(500).json({ error: e.message ?? "quick-stats failed" });
  }
});


export default router;

// server/routes/economics.js
import express from "express";
import { sbAdmin } from "../supabase.js";

const router = express.Router();

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
router.get("/summary", async (req, res) => {
  try {
    const tenantId = req.tenant_id;
    if (!tenantId) return res.status(400).json({ error: "Missing tenant_id" });

    const { data, error } = await sbAdmin.rpc("get_econ_summary_map", {
      p_tenant_id: tenantId,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    res.set("Cache-Control", "no-store");
    res.json(
      row || {
        today: 0,
        week: 0,
        month: 0,
        all_time: 0,
        prev_day: 0,
        prev_week: 0,
        prev_month: 0,
      }
    );
  } catch (e) {
    console.error("summary error:", e);
    res.status(500).json({ error: e.message || "Server error" });
  }
});
// 30-day trend
router.get("/trend", async (req, res) => {
  try {
    const tenantId = req.tenant_id;
    if (!tenantId) return res.status(400).json({ error: "Missing tenant_id" });

    const days = Math.max(1, Math.min(180, Number(req.query.days) || 30));

    const { data, error } = await sbAdmin.rpc("get_econ_trend_map", {
      p_days: days,          // <-- match SQL name & order
      p_tenant_id: tenantId, // <--
    });
    if (error) throw error;

    res.set("Cache-Control", "no-store");
    res.json({ items: data || [] });
  } catch (e) {
    console.error("trend error:", e);
    res.status(500).json({ error: e.message || "Server error" });
  }
});



// quick stats
router.get("/quick-stats", async (req, res) => {
  try {
    const tenantId = req.tenant_id;
    if (!tenantId) return res.status(400).json({ error: "Missing tenant_id" });

    const { data, error } = await sbAdmin.rpc("get_econ_quick_stats_map", {
      p_tenant_id: tenantId,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    res.set("Cache-Control", "no-store");
    res.json(
      row || {
        active_vendors_today: 0,
        today_value: 0,
        active_vendors_yday: 0,
        yday_value: 0,
        daily_avg_30: 0,
      }
    );
  } catch (e) {
    console.error("quick-stats error:", e);
    res.status(500).json({ error: e.message || "Server error" });
  }
});


export default router;

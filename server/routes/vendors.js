// server/routes/vendors.js
import { Router } from "express";
import { sbAdmin } from "../supabase.js";
import { tenantGuard } from "../middlewares/tenant.js";

const r = Router();

// GET /api/vendors
r.get("/", tenantGuard, async (req, res) => {
  try {
    const { tenantId } = req;
    const { q = "", status = "", type = "" } = req.query;

    // 🔎 Build base query
    let query = sbAdmin
      .from("advp_vendors")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("updated_at", { ascending: false })
      .limit(500);

    // Optional filters
    if (status) query = query.eq("status", status);
    if (type) query = query.ilike("vendor_type", `%${type}%`);

    // Full-text or partial search
    if (q && q.trim()) {
      const needle = `%${q.trim()}%`;
      query = query.or(
        `name.ilike.${needle},email.ilike.${needle},phone.ilike.${needle},vendor_type.ilike.${needle},status.ilike.${needle}`
      );
    }

    // Execute query
    const { data, error } = await query;

    if (error) throw error;

    res.json({
      total: data?.length ?? 0,
      items: data || [],
    });
  } catch (err) {
    console.error("Error fetching vendors:", err.message);
    res.status(500).json({ error: "Failed to fetch vendors", details: err.message });
  }
});

export default r;

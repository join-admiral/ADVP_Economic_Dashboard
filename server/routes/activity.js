import { Router } from "express";
import { tenantGuard } from "../middlewares/tenant.js";
import { sbAdmin } from "../supabase.js";

const r = Router();

/**
 * GET /api/activity?tenantId=<id|slug>&limit=200
 * (UI does local filtering by date/text/flags)
 */
r.get("/", tenantGuard, async (req, res) => {
  const tenantId = req.tenantId;
  const limit = Math.min(Number(req.query.limit || 200), 2000);

  const { data, error } = await sbAdmin
    .from("advp_clients_activitylogs")
    .select(`
      checkin_id,
      full_name,
      company_name,
      boat_name,
      check_in,
      check_out,
      flags,
      vendor_employee_phone,
      vendor_employee_email,
      face_photo
    `)
    .eq("tenant_id", tenantId)
    .order("check_in", { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ error: error.message });

  const items = (data || []).map((r) => ({
    id: r.checkin_id,
    name: r.full_name || "",
    company: r.company_name || "",
    boat: r.boat_name || "",
    notes: "-", // not in table; leave dash like your UI
    checkin: r.check_in ? new Date(r.check_in).toLocaleString() : "-",
    checkout: r.check_out ? new Date(r.check_out).toLocaleString() : "-",
    flagged: Array.isArray(r.flags) ? r.flags.length > 0 : !!(r.flags && Object.keys(r.flags || {}).length),
    avatar: r.face_photo || "",
    phone: r.vendor_employee_phone || "",
    email: r.vendor_employee_email || "",
  }));

  res.json({ items, total: items.length });
});

export default r;

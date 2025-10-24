import { Router } from "express";
import { tenantGuard } from "../middlewares/tenant.js";
import { sbAdmin } from "../supabase.js";

const r = Router();

/**
 * GET /api/boats?tenantId=<id|slug>&archived=false&q=
 */
r.get("/", tenantGuard, async (req, res) => {
  const tenantId = req.tenantId;
  const archived = String(req.query.archived || "false") === "true";
  const q = String(req.query.q || "").trim();

  let qBuilder = sbAdmin
    .from("advp_overall_boat")
    .select("admiral_boat_id, boat_name, manufacturer, location, owner_name, owner_surname, captain_name, captain_surname, archived")
    .eq("tenant_id", tenantId)
    .eq("archived", archived)
    .order("boat_name", { ascending: true });

  if (q) {
    // OR search across a few columns
    qBuilder = qBuilder.or(
      [
        `boat_name.ilike.%${q}%`,
        `manufacturer.ilike.%${q}%`,
        `location.ilike.%${q}%`,
        `owner_name.ilike.%${q}%`,
        `owner_surname.ilike.%${q}%`,
        `captain_name.ilike.%${q}%`,
        `captain_surname.ilike.%${q}%`,
      ].join(",")
    );
  }

  const { data, error } = await qBuilder;
  if (error) return res.status(500).json({ error: error.message });

  const items = (data || []).map((r) => ({
    id: r.admiral_boat_id,
    name: r.boat_name || "—",
    manufacturer: r.manufacturer || "—",
    location: r.location || "—",
    owner: [r.owner_name, r.owner_surname].filter(Boolean).join(" ") || "",
    captain: [r.captain_name, r.captain_surname].filter(Boolean).join(" ") || "",
    renewal: "No renewals", // not in this table; placeholder
    archived: !!r.archived,
  }));

  res.json({ items, total: items.length });
});

export default r;

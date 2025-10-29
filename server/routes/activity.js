// server/routes/activity.js
import { Router } from "express";
import { tenantGuard } from "../middlewares/tenant.js";
import { sbAdmin } from "../supabase.js";
import { DateTime } from "luxon";

const r = Router();

/**
 * KEEP: original endpoint used elsewhere
 * GET /api/activity?tenantId=<id|slug>&limit=200
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
    notes: "-",
    checkin: r.check_in ? new Date(r.check_in).toLocaleString() : "-",
    checkout: r.check_out ? new Date(r.check_out).toLocaleString() : "-",
    flagged: Array.isArray(r.flags)
      ? r.flags.length > 0
      : !!(r.flags && Object.keys(r.flags || {}).length),
    avatar: r.face_photo || "",
    phone: r.vendor_employee_phone || "",
    email: r.vendor_employee_email || "",
  }));

  res.json({ items, total: items.length });
});

/* -------------------- Dashboard endpoints (NY time) -------------------- */

const TZ = "America/New_York";

function dayBoundsUtc(localISO) {
  const startLocal = DateTime.fromISO(localISO, { zone: TZ }).startOf("day");
  const endLocal = startLocal.plus({ days: 1 });
  return { startUtc: startLocal.toUTC().toISO(), endUtc: endLocal.toUTC().toISO() };
}

function minsBetween(aISO, bISO) {
  const a = DateTime.fromISO(aISO);
  const b = DateTime.fromISO(bISO);
  return Math.max(0, Math.round(b.diff(a, "minutes").minutes));
}

async function fetchRowsForLocalDate(tenantId, localISO) {
  const { startUtc, endUtc } = dayBoundsUtc(localISO);
  const { data, error } = await sbAdmin
    .from("advp_clients_activitylogs")
    .select("checkin_id, full_name, company_name, boat_name, check_in, check_out")
    .eq("tenant_id", tenantId)
    .or(
      `and(check_in.gte.${startUtc},check_in.lt.${endUtc}),and(check_out.gte.${startUtc},check_out.lt.${endUtc})`
    )
    .limit(5000);
  if (error) throw error;
  return data || [];
}

async function findMostRecentLocalDate(tenantId) {
  const { data, error } = await sbAdmin
    .from("advp_clients_activitylogs")
    .select("check_in, check_out")
    .eq("tenant_id", tenantId)
    .order("check_in", { ascending: false })
    .limit(1);
  if (error) throw error;

  const latest = data?.[0];
  if (!latest) return null;
  const ts = latest.check_out || latest.check_in;
  if (!ts) return null;

  return DateTime.fromISO(ts).setZone(TZ).toISODate();
}

async function fetchSmart(tenantId) {
  const todayISO = DateTime.now().setZone(TZ).toISODate();
  const rowsToday = await fetchRowsForLocalDate(tenantId, todayISO);
  if (rowsToday.length) return { rows: rowsToday, usedISO: todayISO };

  const mostRecent = await findMostRecentLocalDate(tenantId);
  if (!mostRecent) return { rows: [], usedISO: todayISO };

  const rowsRecent = await fetchRowsForLocalDate(tenantId, mostRecent);
  return { rows: rowsRecent, usedISO: mostRecent };
}

/* ----------------------------- /metrics ----------------------------- */
r.get("/metrics", tenantGuard, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "tenantId missing" });

    const { rows, usedISO } = await fetchSmart(tenantId);
    const { startUtc, endUtc } = dayBoundsUtc(usedISO);

    const active_vendors = rows.filter(r => r.check_in && !r.check_out).length;
    const checkins = rows.filter(r => r.check_in && r.check_in >= startUtc && r.check_in < endUtc).length;
    const checkouts = rows.filter(r => r.check_out && r.check_out >= startUtc && r.check_out < endUtc).length;

    const completed = rows.filter(r => r.check_in && r.check_out && r.check_out >= startUtc && r.check_out < endUtc);
    const avg_time_on_site_mins = completed.length
      ? Math.round(completed.reduce((sum, r) => sum + minsBetween(r.check_in, r.check_out), 0) / completed.length)
      : 0;

    res.json({
      active_vendors,
      checkins,
      checkouts,
      total_vendors_today: checkins,
      avg_time_on_site_mins,
    });
  } catch (err) {
    console.error("activity/metrics", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

/* ----------------------------- /hourly ------------------------------ */
r.get("/hourly", tenantGuard, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "tenantId missing" });

    const { rows, usedISO } = await fetchSmart(tenantId);
    const startLocal = DateTime.fromISO(usedISO, { zone: TZ }).set({ hour: 7, minute: 0, second: 0, millisecond: 0 });
    const hours = Array.from({ length: 13 }, (_, i) => startLocal.plus({ hours: i }));

    const items = hours.map(h => {
      const hs = h.toUTC();
      const he = h.plus({ hours: 1 }).toUTC();

      const checkins = rows.filter(r => r.check_in && DateTime.fromISO(r.check_in) >= hs && DateTime.fromISO(r.check_in) < he).length;
      const checkouts = rows.filter(r => r.check_out && DateTime.fromISO(r.check_out) >= hs && DateTime.fromISO(r.check_out) < he).length;

      const active = rows.filter(r => {
        const ci = r.check_in ? DateTime.fromISO(r.check_in) : null;
        const co = r.check_out ? DateTime.fromISO(r.check_out) : null;
        if (!ci) return false;
        return ci < he && (!co || co > hs);
      }).length;

      return { hour: h.toFormat("ha").toUpperCase(), active, checkins, checkouts };
    });

    res.json({ items });
  } catch (err) {
    console.error("activity/hourly", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

/* ------------------------------ /feed ------------------------------- */
r.get("/feed", tenantGuard, async (req, res) => {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(400).json({ error: "tenantId missing" });

    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const { rows, usedISO } = await fetchSmart(tenantId);
    const { startUtc, endUtc } = dayBoundsUtc(usedISO);

    const events = [
      ...rows
        .filter(r => r.check_in && r.check_in >= startUtc && r.check_in < endUtc)
        .map(r => ({
          id: `in-${r.checkin_id}-${r.check_in}`,
          vendor: r.full_name || "",
          company: r.company_name || "",
          action: "checked in",
          target: r.boat_name || "",
          at: r.check_in,
        })),
      ...rows
        .filter(r => r.check_out && r.check_out >= startUtc && r.check_out < endUtc)
        .map(r => ({
          id: `out-${r.checkin_id}-${r.check_out}`,
          vendor: r.full_name || "",
          company: r.company_name || "",
          action: "checked out",
          target: r.boat_name || "",
          at: r.check_out,
        })),
    ]
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, limit);

    // ✅ FIX: return the correct array under "items"
    res.json({ items: events });
  } catch (err) {
    console.error("activity/feed", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
});

export default r;

import { Router } from "express";
import { sbAdmin } from "../supabase.js";
import { tenantGuard } from "../middlewares/tenant.js";

const r = Router();

// GET /api/economics/summary?tenantId=123&days=30
r.get("/summary", tenantGuard, async (req, res) => {
  try {
    const { tenantId } = req;
    const days = parseInt(req.query.days || "30", 10);

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const since = sinceDate.toISOString().split("T")[0];

    // 1️⃣ Fetch recent economic records from the view
    const { data: records, error } = await sbAdmin
      .from("advp_vendor_hours_daily_map")
      .select("visit_date, marina_name, total_hours, marina_wages, vendors_visit")
      .eq("tenant_id", tenantId)
      .gte("visit_date", since)
      .order("visit_date", { ascending: true });

    if (error) throw error;

    // 2️⃣ Aggregate for totals and charts
    let totalHours = 0;
    let totalVisits = 0;
    let totalWages = 0;
    const dailyMap = {};

    for (const row of records) {
      const d = row.visit_date;
      if (!dailyMap[d]) dailyMap[d] = { date: d, hours: 0, visits: 0, wages: 0 };
      dailyMap[d].hours += Number(row.total_hours || 0);
      dailyMap[d].visits += Number(row.vendors_visit || 0);
      dailyMap[d].wages += Number(row.marina_wages || 0);

      totalHours += Number(row.total_hours || 0);
      totalVisits += Number(row.vendors_visit || 0);
      totalWages += Number(row.marina_wages || 0);
    }

    const series30 = Object.values(dailyMap).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // 3️⃣ Top vendors / top vessels could be separate queries later
    const topVendors = [];
    const topVessels = [];

    // 4️⃣ Return summary payload
    res.json({
      totals: {
        totalHours,
        totalVisits,
        totalWages,
      },
      series30,
      topVendors,
      topVessels,
    });
  } catch (err) {
    console.error("Error fetching economic summary:", err);
    res.status(500).json({ error: "Failed to fetch economic summary", details: err.message });
  }
});

export default r;

import { Router } from "express";
import { sbAdmin } from "../supabase.js";
import { tenantGuard } from "../middlewares/tenant.js";

const r = Router();

// Diagnostic endpoint to check what's in the database
r.get("/diagnostic", tenantGuard, async (req, res) => {
  try {
    const { tenantId } = req;
    console.log('🔍 Running diagnostic for tenant:', tenantId);

    // Check advp_vendor_hours_daily_map
    const { data: vendorHours, error: vendorError, count: vendorCount } = await sbAdmin
      .from("advp_vendor_hours_daily_map")
      .select("*", { count: 'exact' })
      .eq("tenant_id", tenantId)
      .limit(5);

    // Check advp_clients_activitylogs
    const { data: activityLogs, error: activityError, count: activityCount } = await sbAdmin
      .from("advp_clients_activitylogs")
      .select("*", { count: 'exact' })
      .eq("tenant_id", tenantId)
      .limit(5);

    // Check advp_marina_wages
    const { data: wages, error: wagesError } = await sbAdmin
      .from("advp_marina_wages")
      .select("*")
      .eq("tenant_id", tenantId);

    const diagnostic = {
      tenantId,
      timestamp: new Date().toISOString(),
      
      vendorHoursDaily: {
        totalRecords: vendorCount,
        sampleData: vendorHours,
        error: vendorError?.message || null,
        columns: vendorHours?.[0] ? Object.keys(vendorHours[0]) : []
      },
      
      activityLogs: {
        totalRecords: activityCount,
        sampleData: activityLogs,
        error: activityError?.message || null,
        columns: activityLogs?.[0] ? Object.keys(activityLogs[0]) : []
      },
      
      marinaWages: {
        records: wages,
        error: wagesError?.message || null
      }
    };

    console.log('📋 Diagnostic results:', JSON.stringify(diagnostic, null, 2));
    res.json(diagnostic);
    
  } catch (err) {
    console.error("❌ Diagnostic error:", err);
    res.status(500).json({ 
      error: "Diagnostic failed", 
      details: err.message 
    });
  }
});

export default r;
import { Router } from "express";
import { sbAdmin } from "../supabase.js";

const r = Router();

r.get("/", async (_req, res) => {
  const { data, error } = await sbAdmin
    .from("multitenancy_tenant")
    .select("id, name, slug")
    .order("name", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  // frontend can store id (int) but show name; keep slug for dev convenience
  res.json({ items: (data || []).map(({ id, name, slug }) => ({ id, name, slug })) });
});

export default r;

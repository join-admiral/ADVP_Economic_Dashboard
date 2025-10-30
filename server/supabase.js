// server/supabase.js
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const service =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE; // accept both
const anon = process.env.SUPABASE_ANON_KEY;

if (!url) throw new Error("SUPABASE_URL is required");
if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE) is required for the backend");

export const sbAdmin = createClient(url, service, { auth: { persistSession: false } });
export const sbAnon = anon ? createClient(url, anon, { auth: { persistSession: false } }) : null;

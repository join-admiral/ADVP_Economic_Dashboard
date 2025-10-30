// server/supabase.js
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error("SUPABASE_URL is required");
if (!service) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for the backend");

export const sbAdmin = createClient(url, service, { auth: { persistSession: false } });

export const sbAnon = anon
  ? createClient(url, anon, { auth: { persistSession: false } })
  : null; // only available if you set SUPABASE_ANON_KEY

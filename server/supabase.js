// server/supabase.js
import { createClient } from "@supabase/supabase-js";

// ✅ These match the variables you already have in your .env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

// Throw early if missing
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE in environment");
}

/**
 * sbAdmin — full-access service-role client
 * Use this for server-side RPCs and database writes
 */
export const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

/**
 * advpSb — alias to the same project (for consistency with other modules)
 */
export const advpSb = sbAdmin;

/**
 * Default export (so files using `import sb from ...` still work)
 */
export default sbAdmin;

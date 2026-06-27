/**
 * Seeds the Supabase `candidates` table with the 15 demo profiles.
 * Run with:  npm run seed
 *
 * Requires SUPABASE_URL and SUPABASE_ANON_KEY in .env.local (or the environment).
 * The schema must already exist — apply supabase/schema.sql first.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { SEED_CANDIDATES } from "../lib/seed-data";

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      "Missing SUPABASE_URL / SUPABASE_ANON_KEY. Add them to .env.local first.",
    );
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false } });

  // Upsert by id so re-running is idempotent.
  const { error } = await sb
    .from("candidates")
    .upsert(SEED_CANDIDATES, { onConflict: "id" });

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
  console.log(`Seeded ${SEED_CANDIDATES.length} candidates ✓`);
}

main();

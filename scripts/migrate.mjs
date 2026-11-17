/**
 * Applies db/schema.sql to the Neon database and prints table status.
 * Usage:  node scripts/migrate.mjs      (reads DATABASE_URL from .env)
 */
import { readFileSync } from "fs";
import { Client } from "pg";

// Minimal .env loader (no dependency on dotenv).
function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*'?([^'\n]*)'?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    // .env is optional if variables come from the environment.
  }
}

loadEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — add it to .env first.");
  process.exit(1);
}

const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  await client.query(schema);
  const { rows } = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name`
  );
  console.log("Migration applied. Tables now in neondb:");
  for (const row of rows) console.log(`  • ${row.table_name}`);
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}

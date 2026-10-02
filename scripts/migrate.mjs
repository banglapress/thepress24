#!/usr/bin/env node
/**
 * Deploy-time database migrator (node-postgres, `pg`).
 *
 * Runs during `npm run build` — on every Vercel deploy — applying pending files
 * in ../migrations to DATABASE_URL. Each file is applied in one transaction and
 * recorded in a `_migrations` table, so it runs once and is safe to re-run.
 *
 * The read is non-recursive, so the opt-in auth schema under migrations/auth/
 * is not applied to an app that never asked for sign-in.
 *
 * No DATABASE_URL (local / preview builds) -> skip; the PGLite fallback applies
 * the same files at startup instead (see src/lib/db.ts).
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { pendingMigrations } from "./migration-plan.mjs";

function getPostgresConfig() {
  const configuredHost = process.env.POSTGRES_HOST?.trim();
  const user = process.env.POSTGRES_USER?.trim();
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DATABASE?.trim();
  const rawUrl =
    process.env.POSTGRES_URL?.trim() ??
    process.env.POSTGRES_PRISMA_URL?.trim() ??
    process.env.POSTGRES_URL_NON_POOLING?.trim() ??
    process.env.POSTGRES_NON_POOLING_URL?.trim() ??
    process.env.DATABASE_URL?.trim();
  const urlHostMatch = rawUrl?.match(/^[a-z][a-z0-9+.-]*:\/\/(?:[^@/]+@)?([^/:?#]+)(?::(\d+))?/i);
  const host = urlHostMatch?.[1] ?? configuredHost;
  const portFromUrl = urlHostMatch?.[2];

  // Vercel Marketplace → Supabase exposes individual connection fields.
  // Use them directly so pooler metadata such as "supa=base-pooler.x"
  // can never become part of the PostgreSQL database name.
  if (host && user && password && database) {
    return {
      host,
      user,
      password,
      database,
      port: portFromUrl ? Number(portFromUrl) : 5432,
      ssl: { rejectUnauthorized: false },
      max: 1,
    };
  }

  // Manual fallback for setups that provide only a connection string.
  if (rawUrl) {
    return {
      connectionString: rawUrl.replace(/([?&])sslmode=[^&]*/i, "").replace(/[?&]$/, ""),
      max: 1,
      ssl: { rejectUnauthorized: false },
    };
  }

  return undefined;
}

const postgresConfig = getPostgresConfig();
if (!postgresConfig) {
  console.log(
    "[migrate] PostgreSQL connection not set — skipping (the PGLite fallback migrates itself).",
  );
  process.exit(0);
}

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main() {
  let entries;
  try {
    entries = await readdir(migrationsDir);
  } catch {
    console.log("[migrate] no migrations/ directory — nothing to do.");
    return;
  }
  // An app with no schema of its own must not pay for a database connection.
  if (pendingMigrations(entries, []).length === 0) {
    console.log("[migrate] no migrations — nothing to do.");
    return;
  }

  const pool = new pg.Pool(postgresConfig);
  const client = await pool.connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())",
    );
    const applied = (await client.query("SELECT name FROM _migrations")).rows.map(
      (r) => r.name,
    );

    let count = 0;
    for (const { name } of pendingMigrations(entries, applied)) {
      const text = await readFile(join(migrationsDir, name), "utf8");
      try {
        await client.query("BEGIN");
        // pg's simple-query protocol runs a whole multi-statement file at once.
        await client.query(text);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [name]);
        await client.query("COMMIT");
      } catch (err) {
        console.error(`[migrate] error applying ${name}`);
        try {
          await client.query("ROLLBACK");
        } catch {
          // ROLLBACK fails when the connection died — keep the original error.
        }
        throw err;
      }
      console.log(`[migrate] applied ${name}`);
      count += 1;
    }
    console.log(count ? `[migrate] done — ${count} migration(s) applied.` : "[migrate] up to date.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err?.message || err);
  // pg errors carry the context needed to debug a bad SQL file.
  for (const key of ["code", "detail", "hint", "position", "where"]) {
    if (err?.[key] != null) console.error(`[migrate]   ${key}: ${err[key]}`);
  }
  process.exit(1);
});

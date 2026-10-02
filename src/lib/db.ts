import { pendingMigrations } from "../../scripts/migration-plan.mjs";

/** Which database backend is active. */
export type DbSource = "postgres" | "pglite";

// An empty/whitespace DATABASE_URL (an easy misconfig in deploy UIs) must mean
// "unset" — otherwise production would silently run on the PGLite fallback.
function getPostgresConfig() {
  const host = process.env.POSTGRES_HOST?.trim();
  const user = process.env.POSTGRES_USER?.trim();
  const password = process.env.POSTGRES_PASSWORD;
  const database = process.env.POSTGRES_DATABASE?.trim();
  const rawUrl =
    process.env.POSTGRES_URL?.trim() ??
    process.env.POSTGRES_PRISMA_URL?.trim() ??
    process.env.POSTGRES_URL_NON_POOLING?.trim() ??
    process.env.DATABASE_URL?.trim();

  // Prefer Vercel Marketplace → Supabase's individual connection fields.
  if (host && user && password && database) {
    const portMatch = rawUrl?.match(/^[a-z][a-z0-9+.-]*:\/\/[^/]+:(\d+)\//i);
    return {
      host,
      user,
      password,
      database,
      port: portMatch ? Number(portMatch[1]) : 5432,
      ssl: { rejectUnauthorized: false },
    };
  }

  if (rawUrl) {
    return {
      connectionString: rawUrl.replace(/([?&])sslmode=[^&]*/i, "").replace(/[?&]$/, ""),
      ssl: { rejectUnauthorized: false },
    };
  }

  return undefined;
}

const postgresConfig = getPostgresConfig();

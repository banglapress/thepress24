import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getCookie } from "@tanstack/react-start/server";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { emailAndPasswordEnabled } from "./email-password";
import { pgliteDialect } from "./pglite-dialect";

/**
 * Self-owned authentication for The Press24.
 *
 * Authentication is handled by Better Auth. Persistent production storage is
 * PostgreSQL, supplied through DATABASE_URL (recommended: the Supabase
 * Transaction Pooler connection string). No Grok/Grok-auth credentials are
 * required by this application.
 *
 * When DATABASE_URL is absent, local development can use the embedded PGLite
 * fallback. Do not rely on that fallback for deployed user accounts because a
 * serverless instance is not a durable application database.
 */

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const authDisabled = env("VITE_AUTH_ENABLED") === "false";
const databaseUrl =
  env("DATABASE_URL") ??
  env("POSTGRES_PRISMA_URL") ??
  env("POSTGRES_URL") ??
  env("POSTGRES_URL_NON_POOLING");
const explicitBaseURL = env("BETTER_AUTH_URL");

const globalAuthRef = globalThis as typeof globalThis & {
  __thepressAuthSecret__?: string;
};

function authSecret(): string {
  globalAuthRef.__thepressAuthSecret__ ??= randomBytes(32).toString("hex");
  return globalAuthRef.__thepressAuthSecret__;
}

const LOCAL_DEV_ORIGINS = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];

const baseURL = explicitBaseURL ?? {
  allowedHosts: ["*.vercel.app", "localhost", "127.0.0.1", "[::1]"],
  protocol: "auto" as const,
  fallback: "http://localhost:8080",
};

const trustedOrigins = [
  ...(explicitBaseURL ? [explicitBaseURL] : []),
  "https://*.vercel.app",
  ...LOCAL_DEV_ORIGINS,
];

const database = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: 1,
    })
  : {
      dialect: pgliteDialect(() => getPglite()),
      type: "postgres" as const,
    };

if (!databaseUrl && !authDisabled) {
  console.warn(
    "[auth] DATABASE_URL is not configured. Deployed accounts will use the " +
      "temporary PGLite fallback and will not have durable persistence. " +
      "Configure DATABASE_URL with your Supabase PostgreSQL pooled connection.",
  );
}

void ensureDbReady();

export const authConfigured = !authDisabled;

export const SESSION_TOKEN_COOKIE = "__Host-thepress-auth.session_token";

export const auth = betterAuth({
  baseURL,
  secret: env("BETTER_AUTH_SECRET") ?? authSecret(),
  database,

  trustedOrigins,

  session: {
    cookieCache: { enabled: true, maxAge: 300 },
  },

  ...(emailAndPasswordEnabled
    ? { emailAndPassword: { enabled: true } }
    : {}),

  advanced: {
    useSecureCookies: false,
    defaultCookieAttributes: {
      secure: true,
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      session_token: { name: SESSION_TOKEN_COOKIE },
      session_data: { name: "__Host-thepress-auth.session_data" },
      account_data: { name: "__Host-thepress-auth.account_data" },
      dont_remember: { name: "__Host-thepress-auth.dont_remember" },
    },
  },

  plugins: [bearer(), tanstackStartCookies()],
});

export function readSessionToken(): string | null {
  return getCookie(SESSION_TOKEN_COOKIE) ?? null;
}

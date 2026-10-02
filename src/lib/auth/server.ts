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
function normalizePostgresUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  let result = value.trim();

  const schemeEnd = result.indexOf("://");
  const authorityEnd = schemeEnd >= 0 ? result.indexOf("/", schemeEnd + 3) : -1;
  const queryIndex = authorityEnd >= 0 ? result.indexOf("?", authorityEnd) : -1;
  if (authorityEnd >= 0) {
    const pathEnd = queryIndex >= 0 ? queryIndex : result.length;
    const path = result.slice(authorityEnd, pathEnd);
    const ampIndex = path.indexOf("&");
    if (ampIndex >= 0) {
      result =
        result.slice(0, authorityEnd) +
        path.slice(0, ampIndex) +
        "?" +
        path.slice(ampIndex + 1) +
        (queryIndex >= 0 ? "&" + result.slice(queryIndex + 1) : "");
    }
  }

  if (
    /[?&]sslmode=require(?:&|$)/.test(result) &&
    !/[?&]uselibpqcompat=/.test(result)
  ) {
    result += result.includes("?") ? "&uselibpqcompat=true" : "?uselibpqcompat=true";
  }

  return result;
}

const databaseUrl = normalizePostgresUrl(
  env("POSTGRES_URL") ??
  env("POSTGRES_PRISMA_URL") ??
  env("POSTGRES_URL_NON_POOLING") ??
  env("DATABASE_URL"));
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
      connectionString: databaseUrl
        .replace(/([?&])sslmode=[^&]*/i, "")
        .replace(/[?&]$/, ""),
      max: 1,
      ssl: { rejectUnauthorized: false },
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

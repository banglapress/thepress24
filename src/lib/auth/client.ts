import { createAuthClient } from "better-auth/react";
import { runSignOut } from "../../../scripts/sign-out-plan.mjs";

/**
 * Better Auth client for The Press24.
 *
 * Production uses same-origin cookie sessions. The bearer-token path is kept
 * only for the embedded development preview and is harmless on Vercel.
 */
export const authClient = createAuthClient({
  fetchOptions: {
    onRequest(ctx) {
      const token = getBearerToken();
      if (token) ctx.headers.set("Authorization", `Bearer ${token}`);
      return ctx;
    },
  },
});

export const authEnabled = import.meta.env.VITE_AUTH_ENABLED !== "false";

const BEARER_KEY = "thepress-auth.bearer-token";

export function getBearerToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(BEARER_KEY);
  } catch {
    return null;
  }
}

function clearBearerToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(BEARER_KEY);
  } catch {
    /* storage unavailable — ignore */
  }
}

export async function signOut(redirectTo = "/"): Promise<void> {
  await runSignOut({
    livePreview: false,
    hasBearer: Boolean(getBearerToken()),
    requestSignOut: async () => {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message ?? "Sign-out failed");
    },
    clearToken: clearBearerToken,
    redirect: () => {
      window.location.href = redirectTo;
    },
  });
}

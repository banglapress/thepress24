import { useState } from "react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { APP_NAME, APP_NAME_BN, APP_TAGLINE } from "@/lib/press/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function persistAuthToken(data: unknown) {
  if (!data || typeof data !== "object") return;
  const token = (data as { token?: unknown }).token;
  if (typeof token === "string" && token) {
    try {
      window.sessionStorage.setItem("grok-auth.bearer-token", token);
    } catch {
      /* ignore */
    }
  }
}

export function LoginForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "up") {
        const { error: err, data } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim() || email.trim().split("@")[0],
        });
        if (err) throw err;
        persistAuthToken(data);
      } else {
        const { error: err, data } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        persistAuthToken(data);
      }
      await authClient.getSession();
      window.location.assign("/");
    } catch (err) {
      const e = err as {
        message?: unknown;
        code?: unknown;
        status?: unknown;
      };
      const detail =
        typeof e.code === "string" && e.code
          ? `[${e.code}]`
          : typeof e.status === "number"
            ? `[${e.status}]`
            : "";
      const message =
        typeof e.message === "string" && e.message
          ? e.message
          : mode === "up"
            ? "অ্যাকাউন্ট খোলা যায়নি।"
            : "লগইন করা যায়নি।";
      setError(`${detail} ${message}`.trim());
      setBusy(false);
    }
  }

  return (
    <main className="relative grid min-h-dvh place-items-center bg-background px-4 py-10 text-foreground">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
      <div className="w-full max-w-sm space-y-5">
        <div>
          <p className="text-xs tracking-wide text-primary uppercase">
            {APP_NAME}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-semibold tracking-tight">
            {APP_NAME_BN}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            নিজের ইমেইল ও পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)। প্রথম অ্যাকাউন্ট অ্যাডমিন হয়। রোল না থাকলেও বিষয় পাঠাতে পারবেন — ভিডিও রিভিউ পাস করে রাইটার অ্যাসাইন করবেন।
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{APP_TAGLINE}।</p>
        </div>
        <div className="inline-flex rounded-lg bg-muted p-1">
          <button
            type="button"
            className={`h-11 rounded-md px-3 text-sm font-medium ${mode === "in" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setMode("in")}
          >
            লগইন
          </button>
          <button
            type="button"
            className={`h-11 rounded-md px-3 text-sm font-medium ${mode === "up" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
            onClick={() => setMode("up")}
          >
            নতুন অ্যাকাউন্ট
          </button>
        </div>
        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-2xl bg-card p-5 shadow-[var(--shadow-border)]"
        >
          <p className="text-sm text-muted-foreground">
            {mode === "up"
              ? "প্রথমবার? নাম, ইমেইল, পাসওয়ার্ড দিন।"
              : "আগে খুলেছেন? একই ইমেইল ও পাসওয়ার্ড দিন।"}
          </p>
          {mode === "up" ? (
            <div>
              <Label htmlFor="name">নাম</Label>
              <Input
                id="name"
                className="mt-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          ) : null}
          <div>
            <Label htmlFor="email">ইমেইল</Label>
            <Input
              id="email"
              className="mt-2"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password">পাসওয়ার্ড</Label>
            <Input
              id="password"
              className="mt-2"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "up" ? "new-password" : "current-password"}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "up" ? "অ্যাকাউন্ট খুলুন" : "ঢুকুন"}
          </Button>
        </form>
        {authEnabled ? (
          <div className="space-y-2">
            <p className="text-center text-xs text-muted-foreground">অথবা</p>
            {GROK_PROVIDERS.map((provider) => (
              <Button
                key={provider.providerId}
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => signIn(provider.providerId, { callbackURL: "/" })}
              >
                {provider.label} দিয়ে চালিয়ে যান
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}

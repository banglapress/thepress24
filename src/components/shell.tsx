import { Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { APP_NAME, APP_NAME_BN, APP_TAGLINE, ROLES } from "@/lib/press/catalog";
import { NewScriptDialog } from "@/components/new-script-dialog";
import { useMember } from "@/components/guards";

export function Shell({ children }: { children: React.ReactNode }) {
  const me = useMember();
  const role = me.data?.role ?? null;
  const roleMeta = role ? ROLES[role] : null;

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="h-0.5 bg-primary" />
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-3 px-4">
          <Link to="/" className="flex min-w-0 items-baseline gap-2">
            <span className="font-serif text-base font-semibold tracking-tight sm:text-xl">
              {APP_NAME}
            </span>
            <span className="hidden truncate text-xs text-muted-foreground sm:inline">
              {APP_TAGLINE}
            </span>
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            {me.data?.isAdmin ? (
              <Link
                to="/admin"
                className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
              >
                অ্যাডমিন
              </Link>
            ) : null}
            {role ? (
              <Link
                to="/desk/$role"
                params={{ role }}
                className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
              >
                ডেস্ক
              </Link>
            ) : null}
            {(me.data?.isAdmin || role === "writer") ? <NewScriptDialog /> : null}
            <UserButton />
          </div>
        </div>
        {roleMeta ? (
          <div className="border-t border-border/70 bg-muted/50">
            <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-2">
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                {roleMeta.desk}
                {me.data?.isAdmin ? " · অ্যাডমিন" : ""}
              </span>
              <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground sm:text-sm">
                আপনি {roleMeta.label}
                {me.data?.isAdmin ? " ও অ্যাডমিন" : ""}। {roleMeta.youDo}
              </p>
            </div>
          </div>
        ) : me.data?.isAdmin ? (
          <div className="border-t border-border/70 bg-muted/50">
            <div className="mx-auto max-w-[1400px] px-4 py-2 text-xs text-muted-foreground sm:text-sm">
              অ্যাডমিন — সব ডেস্ক খোলা। অন্য অ্যাডমিনও নিয়োগ দিতে পারেন।
            </div>
          </div>
        ) : me.data ? (
          <div className="border-t border-border/70 bg-muted/50">
            <div className="mx-auto max-w-[1400px] px-4 py-2 text-xs text-muted-foreground sm:text-sm">
              রোল অপেক্ষমান — অ্যাডমিনের কাছ থেকে রোল নিন। স্ক্রিপ্ট রাইটার রোল পেলে সরাসরি স্ক্রিপ্ট শুরু করতে পারবেন।
            </div>
          </div>
        ) : null}
      </header>
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:py-6">{children}</div>
      <p className="sr-only">{APP_NAME_BN}</p>
    </div>
  );
}

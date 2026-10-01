import { Navigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { APP_NAME_BN } from "@/lib/press/catalog";
import { getMe } from "@/lib/press/server";
import { isRoleId, type RoleId } from "@/lib/press/types";

export function DeskOpening() {
  return (
    <div className="relative min-h-dvh bg-background px-4 py-10 text-foreground">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-primary" />
      <div className="mx-auto max-w-[1400px] space-y-5">
        <div>
          <p className="font-serif text-2xl font-semibold tracking-tight">
            {APP_NAME_BN}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">ডেস্ক খুলছে…</p>
        </div>
        <div className="h-14 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

export function useMember() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => getMe(),
  });
}

export function RequireSession({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <DeskOpening />;
  if (!user) return <RedirectToSignIn />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const me = useMember();
  if (me.isLoading) return <DeskOpening />;
  if (me.isError || !me.data) return <RedirectToSignIn />;
  if (me.data.isAdmin) return <>{children}</>;
  if (me.data.role) {
    return <Navigate to="/desk/$role" params={{ role: me.data.role }} />;
  }
  return <Navigate to="/pending" />;
}

export function RequireDesk({
  role,
  children,
}: {
  role: string;
  children: ReactNode;
}) {
  const me = useMember();
  if (!isRoleId(role)) return <Navigate to="/" />;
  if (me.isLoading) return <DeskOpening />;
  if (me.isError || !me.data) return <RedirectToSignIn />;
  if (me.data.isAdmin || me.data.role === role) return <>{children}</>;
  if (me.data.role) {
    return <Navigate to="/desk/$role" params={{ role: me.data.role }} />;
  }
  return <Navigate to="/pending" />;
}

export function homePath(member: { isAdmin: boolean; role: RoleId | null }) {
  if (member.isAdmin) return "/admin" as const;
  if (member.role) return `/desk/${member.role}` as const;
  return "/pending" as const;
}

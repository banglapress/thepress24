import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { RequireAdmin, RequireSession, useMember } from "@/components/guards";
import { Pipeline, Stat } from "@/components/pipeline";
import { MonthlyReport } from "@/components/monthly-report";
import { PipelineSheet } from "@/components/pipeline-sheet";
import { Shell } from "@/components/shell";
import { ROLE_IDS } from "@/lib/press/types";
import { ROLES } from "@/lib/press/catalog";
import { inRoleQueue } from "@/lib/press/gates";
import { listMembers, listPieces, setMemberAdmin, setMemberRole } from "@/lib/press/server";

export const Route = createFileRoute("/admin")({ component: AdminRoute });

function AdminRoute() {
  return (
    <RequireSession>
      <RequireAdmin>
        <Shell>
          <AdminDesk />
        </Shell>
      </RequireAdmin>
    </RequireSession>
  );
}

function AdminDesk() {
  const me = useMember();
  const queryClient = useQueryClient();
  const members = useQuery({ queryKey: ["members"], queryFn: () => listMembers() });
  const pieces = useQuery({ queryKey: ["pieces"], queryFn: () => listPieces() });
  const list = members.data ?? [];
  const items = pieces.data ?? [];
  const waiting = list.filter((m) => !m.role && !m.isAdmin).length;
  const active = items.filter((p) => p.stage !== "published").length;
  const published = items.filter((p) => p.stage === "published").length;
  const adminCount = list.filter((m) => m.isAdmin).length;

  const roleMut = useMutation({
    mutationFn: (input: { userId: string; role: string | null }) =>
      setMemberRole({ data: input }),
    onSuccess: () => {
      toast.success("রোল আপডেট হয়েছে");
      void queryClient.invalidateQueries({ queryKey: ["members"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      void queryClient.invalidateQueries({ queryKey: ["writers"] });
      void queryClient.invalidateQueries({ queryKey: ["crew"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "রোল হয়নি"),
  });
  const adminMut = useMutation({
    mutationFn: (input: { userId: string; isAdmin: boolean }) =>
      setMemberAdmin({ data: input }),
    onSuccess: () => {
      toast.success("অ্যাডমিন আপডেট হয়েছে");
      void queryClient.invalidateQueries({ queryKey: ["members"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "হয়নি"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
            অ্যাডমিন ডেস্ক
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            রোল দিন, অন্য অ্যাডমিন নিয়োগ দিন, আর যেকোনো ডেস্ক খুলে নিজেই গেট পাস করুন। শেষ অ্যাডমিনকে নামানো যাবে না।
          </p>
        </div>
        {me.data?.role ? (
          <Link
            to="/desk/$role"
            params={{ role: me.data.role }}
            className="inline-flex h-11 items-center text-sm text-primary"
          >
            আমার {ROLES[me.data.role].desk} ডেস্ক
          </Link>
        ) : null}
      </div>

      <PipelineSheet pieces={items} />
      <MonthlyReport role={me.data?.role ?? null} showDate={false} />

      <section className="rounded-2xl bg-card p-4 shadow-[var(--shadow-border)]">
        <h2 className="font-serif text-lg font-semibold">টিম কীভাবে ঢুকবে</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>আপনি অ্যাডমিন — সব ডেস্ক ও ধাপ খোলা। নিচে কার্ড চাপলে সেই কিউতে যাবেন।</li>
          <li>অ্যাপ পাবলিশ করে যে লিংক পাবেন, সেটা রাইটার-এডিটর-প্রোডিউসারকে পাঠান।</li>
          <li>
            তারা «নতুন অ্যাকাউন্ট» চাপবে — নিজের ইমেইল ও পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর)। একই অ্যাকাউন্ট শেয়ার করবেন না।
          </li>
          <li>
            স্ক্রিপ্ট রাইটার রোল পাওয়া সদস্য সরাসরি নতুন স্ক্রিপ্ট শুরু করতে পারবেন।
          </li>
        </ol>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="সদস্য" value={list.length} />
        <Stat label="রোল অপেক্ষা" value={waiting} />
        <Stat label="চলমান আইটেম" value={active} />
        <Stat label="প্রকাশিত" value={published} />
      </div>

      <section>
        <h2 className="font-serif text-lg font-semibold">সাতটি ডেস্ক</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          কার্ড চাপলে সেই ডেস্ক খুলবে — অ্যাডমিন সব কিউতে কাজ করতে পারবেন।
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ROLE_IDS.map((role) => {
            const waitingHere = items.filter((p) =>
              inRoleQueue(p, role, me.data ?? null),
            ).length;
            const people = list.filter((m) => m.role === role).length;
            return (
              <Link
                key={role}
                to="/desk/$role"
                params={{ role }}
                className="rounded-2xl bg-card p-4 shadow-[var(--shadow-border)] transition-shadow hover:shadow-[var(--shadow-border-hover)]"
              >
                <p className="font-serif text-lg font-semibold">{ROLES[role].desk}</p>
                <p className="mt-1 text-sm text-muted-foreground">{ROLES[role].label}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  অপেক্ষমান {waitingHere} · সদস্য {people}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-card p-4 shadow-[var(--shadow-border)]">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold">সদস্য, রোল ও অ্যাডমিন</h2>
          <p className="text-xs text-muted-foreground">অপেক্ষমান {waiting}</p>
        </div>
        {list.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">এখনো কেউ লগইন করেননি।</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {list.map((member) => (
              <li
                key={member.userId}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {member.displayName || member.email || "সদস্য"}
                    {member.isAdmin ? (
                      <span className="ml-2 text-xs text-muted-foreground">অ্যাডমিন</span>
                    ) : null}
                    {member.userId === me.data?.userId ? (
                      <span className="ml-2 text-xs text-muted-foreground">আপনি</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {member.email || "ইমেইল নেই"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={member.isAdmin}
                      disabled={member.isAdmin && adminCount <= 1}
                      onChange={(e) =>
                        adminMut.mutate({
                          userId: member.userId,
                          isAdmin: e.target.checked,
                        })
                      }
                    />
                    অ্যাডমিন
                  </label>
                  <label className="sr-only" htmlFor={`role-${member.userId}`}>
                    রোল
                  </label>
                  <select
                    id={`role-${member.userId}`}
                    className="h-11 rounded-md border border-input bg-card px-3 text-sm"
                    value={member.role ?? ""}
                    onChange={(e) =>
                      roleMut.mutate({
                        userId: member.userId,
                        role: e.target.value === "" ? null : e.target.value,
                      })
                    }
                  >
                    <option value="">রোল নেই — অপেক্ষা</option>
                    {ROLE_IDS.map((role) => (
                      <option key={role} value={role}>
                        {ROLES[role].label}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Pipeline pieces={items} role={me.data?.role ?? null} viewer={me.data ?? null} />
    </div>
  );
}

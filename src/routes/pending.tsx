import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PieceCard } from "@/components/piece-card";
import { NewScriptDialog } from "@/components/new-script-dialog";
import { MonthlyReport } from "@/components/monthly-report";
import { RequireSession, useMember } from "@/components/guards";
import { Shell } from "@/components/shell";
import { listPieces } from "@/lib/press/server";

export const Route = createFileRoute("/pending")({ component: PendingRoute });

function PendingRoute() {
  return (
    <RequireSession>
      <Shell>
        <PendingDesk />
      </Shell>
    </RequireSession>
  );
}

function PendingDesk() {
  const me = useMember();
  const pieces = useQuery({ queryKey: ["pieces"], queryFn: () => listPieces() });
  const all = pieces.data ?? [];
  const mine = all.filter((p) => p.pitchedByUserId === me.data?.userId);

  return (
    <div className="space-y-6">
      <MonthlyReport role={me.data?.role ?? null} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold">রোল অপেক্ষমান</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            অ্যাডমিন ডেস্ক সেট করলে কিউ খুলবে। স্ক্রিপ্ট রাইটার রোল পাওয়ার পর নতুন স্ক্রিপ্ট শুরু করা যাবে।
          </p>
          {me.data?.email ? (
            <p className="mt-2 text-xs text-muted-foreground">{me.data.email}</p>
          ) : null}
        </div>
        {me.data?.isAdmin || me.data?.role === "writer" ? <NewScriptDialog /> : null}
      </div>

      <section className="space-y-3">
        <h2 className="font-serif text-lg font-semibold">আমার স্ক্রিপ্ট</h2>
        {pieces.isLoading ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted" />
        ) : mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            এখনো কোনো স্ক্রিপ্ট শুরু হয়নি।
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {mine.map((piece) => (
              <PieceCard
                key={piece.id}
                piece={piece}
                role={me.data?.role ?? null}
                viewer={me.data ?? null}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

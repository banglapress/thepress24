import { PieceCard } from "@/components/piece-card";
import { PIPELINE_STAGES, ROLE_GATE_STAGE, STAGES } from "@/lib/press/catalog";
import type { Member, Piece, RoleId } from "@/lib/press/types";
import { cn } from "@/lib/utils";

function isViewerGate(stage: (typeof PIPELINE_STAGES)[number], role: RoleId | null) {
  if (!role) return false;
  if (role === "planning_editor") return stage === "cut_review";
  return ROLE_GATE_STAGE[role] === stage;
}

export function Pipeline({
  pieces,
  role,
  viewer,
}: {
  pieces: Piece[];
  role: RoleId | null;
  viewer: Member | null;
}) {
  return (
    <section className="rounded-2xl bg-card p-4 shadow-[var(--shadow-border)]">
      <h2 className="font-serif text-lg font-semibold">পাইপলাইন</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        পুরো রানডাউন — ধাপ স্কিপ করা যাবে না। আপনার গেট হাইলাইট।
      </p>
      <div className="-mx-4 mt-4 overflow-x-auto px-4">
        <div className="flex min-w-max gap-3">
          {PIPELINE_STAGES.map((stage) => {
            const column = pieces.filter((p) => p.stage === stage);
            const gate = isViewerGate(stage, role);
            return (
              <div
                key={stage}
                className={cn(
                  "w-56 shrink-0 rounded-xl p-2",
                  gate && "bg-primary/10 ring-1 ring-primary/40",
                )}
              >
                <p
                  className={cn(
                    "mb-2 text-xs font-medium tracking-wide uppercase",
                    gate ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {STAGES[stage].label}
                  <span className="ml-1 font-sans font-normal normal-case">
                    {column.length}
                  </span>
                </p>
                {column.length === 0 ? (
                  <p className="px-1.5 py-6 text-center text-xs text-muted-foreground">
                    খালি — আগের গেট খোলেনি
                  </p>
                ) : (
                  <div className="space-y-2">
                    {column.map((piece) => (
                      <PieceCard
                        key={piece.id}
                        piece={piece}
                        role={role}
                        viewer={viewer}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-border)]">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-2xl font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}

export function EmptyDesk({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-card px-4 py-10 text-center shadow-[var(--shadow-border)]">
      <p className="font-serif text-lg font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

export function Queue({
  title,
  pieces,
  role,
  viewer,
  empty,
}: {
  title: string;
  pieces: Piece[];
  role: RoleId;
  viewer: Member | null;
  empty: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-lg font-semibold">{title}</h2>
      {pieces.length === 0 ? (
        <EmptyDesk title="এই ডেস্কে কাজ নেই" hint={empty} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pieces.map((piece) => (
            <PieceCard
              key={piece.id}
              piece={piece}
              role={role}
              viewer={viewer}
            />
          ))}
        </div>
      )}
    </section>
  );
}

import { PieceCard } from "@/components/piece-card";
import { MonthlyReport } from "@/components/monthly-report";
import { EmptyDesk, Queue, Stat, Pipeline } from "@/components/pipeline";
import { inRoleQueue } from "@/lib/press/gates";
import { ROLES } from "@/lib/press/catalog";
import type { Member, Piece, RoleId } from "@/lib/press/types";

function mineCount(role: RoleId, pieces: Piece[], viewer: Member | null) {
  return pieces.filter((p) => inRoleQueue(p, role, viewer)).length;
}

function WriterQueue({
  pieces,
  role,
  viewer,
}: {
  pieces: Piece[];
  role: RoleId;
  viewer: Member | null;
}) {
  if (viewer?.isAdmin && viewer.role !== "writer") {
    const groups = new Map<string, { id: string; name: string; items: Piece[] }>();
    for (const piece of pieces.filter((p) => p.stage === "scripting")) {
      const id = piece.assignedWriterId || "_none";
      const name = piece.assignedWriterName || "রাইটার অ্যাসাইন হয়নি";
      const group = groups.get(id) ?? { id, name, items: [] };
      group.items.push(piece);
      groups.set(id, group);
    }
    const list = [...groups.values()].sort((a, b) =>
      a.id === "_none"
        ? -1
        : b.id === "_none"
          ? 1
          : a.name.localeCompare(b.name, "bn"),
    );

    if (list.length === 0) {
      return (
        <EmptyDesk
          title="রাইটিং কিউ খালি"
          hint="নতুন স্ক্রিপ্ট শুরু করলে তা নির্ধারিত রাইটারের কিউতে উঠবে।"
        />
      );
    }

    return (
      <div className="space-y-6">
        {list.map((group) => (
          <section key={group.id} className="space-y-3">
            <h2 className="font-serif text-lg font-semibold">{group.name}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {group.items.map((piece) => (
                <PieceCard
                  key={piece.id}
                  piece={piece}
                  role={role}
                  viewer={viewer}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  const mine = pieces.filter(
    (p) =>
      p.stage === "scripting" &&
      (viewer?.isAdmin || p.assignedWriterId === viewer?.userId),
  );

  if (mine.length === 0) {
    return (
      <EmptyDesk
        title="রাইটিং কিউ খালি"
        hint="নতুন স্ক্রিপ্ট শুরু করুন। স্ক্রিপ্ট রিভিউতে জমা দিলে পরের গেট খুলবে।"
      />
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="font-serif text-lg font-semibold">স্ক্রিপ্ট</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {mine.map((piece) => (
          <PieceCard key={piece.id} piece={piece} role={role} viewer={viewer} />
        ))}
      </div>
    </section>
  );
}

function DeskQueues({
  role,
  pieces,
  viewer,
}: {
  role: RoleId;
  pieces: Piece[];
  viewer: Member | null;
}) {
  switch (role) {
    case "writer":
      return <WriterQueue pieces={pieces} role={role} viewer={viewer} />;
    case "script_editor":
      return (
        <Queue
          role={role}
          viewer={viewer}
          title="রিভিউ গেট"
          pieces={pieces.filter((p) => p.stage === "script_review")}
          empty="রাইটার জমা দিলে এখানে আসবে। পাস ছাড়া শুট কিউ খুলবে না।"
        />
      );
    case "producer":
      return (
        <Queue
          role={role}
          viewer={viewer}
          title="শুট ফোল্ডার"
          pieces={pieces.filter((p) => inRoleQueue(p, "producer", viewer))}
          empty="স্ক্রিপ্ট এডিটর পাস করে আপনাকে অ্যাসাইন করলে এখানে আসবে। প্রেজেন্টারও ডান করলেই এডিটিং খুলবে।"
        />
      );
    case "presenter":
      return (
        <Queue
          role={role}
          viewer={viewer}
          title="প্রেজেন্ট কিউ"
          pieces={pieces.filter((p) => inRoleQueue(p, "presenter", viewer))}
          empty="স্ক্রিপ্ট এডিটর আপনাকে অ্যাসাইন করলে এখানে আসবে। প্রোডিউসারও ডান করলেই এডিটিং খুলবে।"
        />
      );
    case "video_editor":
      return (
        <Queue
          role={role}
          viewer={viewer}
          title="এডিট কিউ"
          pieces={pieces.filter((p) => inRoleQueue(p, "video_editor", viewer))}
          empty="প্রোডিউসার ও প্রেজেন্টার দুজনেই ডান করলে কাট কিউ খুলবে।"
        />
      );
    case "planning_editor":
      return (
        <Queue
          role={role}
          viewer={viewer}
          title="ভিডিও রিভিউ"
          pieces={pieces.filter((p) => p.stage === "cut_review")}
          empty="কাট জমা হলে শিরোনাম ও থাম্বনেইল এখানেই দিতে হবে।"
        />
      );
    case "social":
      return (
        <Queue
          role={role}
          viewer={viewer}
          title="আপলোড কিউ"
          pieces={pieces.filter((p) => p.stage === "upload")}
          empty="ভিডিও রিভিউ পাস হলে ফেসবুক ও ইউটিউব মার্ক এখানে। দুটো না হলে প্রকাশিত নয়।"
        />
      );
  }
}

export function DeskBoard({
  role,
  pieces,
  viewer,
  asAdmin,
}: {
  role: RoleId;
  pieces: Piece[];
  viewer: Member | null;
  asAdmin: boolean;
}) {
  const published = pieces.filter((p) => p.stage === "published").length;
  const active = pieces.filter((p) => p.stage !== "published").length;
  const mine = mineCount(role, pieces, viewer);

  return (
    <div className="space-y-6">
      <MonthlyReport role={role} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
            {ROLES[role].desk} ডেস্ক
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {asAdmin
              ? "অ্যাডমিন — এই ডেস্কের সব কিউ খোলা। ধাপ স্কিপ করা যাবে না, তবে যেকোনো গেট আপনি পাস করতে পারবেন।"
              : ROLES[role].youDo}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="আমার গেট" value={mine} />
        <Stat label="প্রকাশিত" value={published} />
        <Stat label="চলমান" value={active} />
      </div>
      <DeskQueues role={role} pieces={pieces} viewer={viewer} />
      <Pipeline pieces={pieces} role={role} viewer={viewer} />
    </div>
  );
}

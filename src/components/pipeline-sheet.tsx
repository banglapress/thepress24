import { formatBnDay, formatBnLong } from "@/lib/press/dates";
import { sheetStatus } from "@/lib/press/types";
import type { Piece } from "@/lib/press/types";

export function PipelineSheet({ pieces }: { pieces: Piece[] }) {
  const rows = [...pieces]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return (
    <section className="rounded-2xl bg-card p-4 shadow-[var(--shadow-border)] sm:p-5">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">আজকের তারিখ</p>
      <h2 className="mt-1 font-serif text-xl font-semibold tracking-tight sm:text-2xl">
        {formatBnLong()}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        প্রতিদিনের পাইপলাইন — স্ক্রিপ্ট থেকে আপলোড
      </p>
      <div className="-mx-4 mt-4 overflow-x-auto px-4">
        <table className="w-full min-w-4xl border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="sticky left-0 bg-card py-3 pr-3 font-medium">তারিখ</th>
              <th className="py-3 pr-3 font-medium">বিষয়</th>
              <th className="py-3 pr-3 font-medium">স্ক্রিপ্ট</th>
              <th className="py-3 pr-3 font-medium">স্ট্যাটাস</th>
              <th className="py-3 pr-3 font-medium">স্ক্রিপ্ট রাইটার</th>
              <th className="py-3 pr-3 font-medium">প্রেজেন্টার</th>
              <th className="py-3 font-medium">এডিটর</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                  এখনো কোনো আইটেম নেই।
                </td>
              </tr>
            ) : (
              rows.map((piece) => (
                <tr key={piece.id} className="border-b border-border/80">
                  <td className="sticky left-0 bg-card py-3 pr-3 whitespace-nowrap text-muted-foreground">
                    {formatBnDay(piece.createdAt)}
                  </td>
                  <td className="max-w-48 py-3 pr-3 font-medium">{piece.title}</td>
                  <td className="max-w-48 py-3 pr-3 text-muted-foreground">
                    {piece.proposedTitle || piece.title}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">{sheetStatus(piece)}</td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {piece.assignedWriterName || "—"}
                  </td>
                  <td className="py-3 pr-3 whitespace-nowrap">
                    {piece.assignedPresenterName || "—"}
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    {piece.assignedEditorName || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

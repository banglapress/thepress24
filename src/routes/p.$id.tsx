import { createFileRoute } from "@tanstack/react-router";
import { DeskOpening, RequireSession, useMember } from "@/components/guards";
import { PiecePage } from "@/components/piece-page";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/p/$id")({ component: PieceRoute });

function PieceRoute() {
  const { id } = Route.useParams();
  return (
    <RequireSession>
      <Shell>
        <PieceInner id={id} />
      </Shell>
    </RequireSession>
  );
}

function PieceInner({ id }: { id: string }) {
  const me = useMember();
  if (me.isLoading || !me.data) return <DeskOpening />;
  return <PiecePage id={id} member={me.data} />;
}

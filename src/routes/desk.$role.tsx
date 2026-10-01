import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { DeskBoard } from "@/components/desk-board";
import { DeskOpening, RequireDesk, useMember } from "@/components/guards";
import { listPieces } from "@/lib/press/server";
import { isRoleId } from "@/lib/press/types";

export const Route = createFileRoute("/desk/$role")({ component: DeskRoleRoute });

function DeskRoleRoute() {
  const { role } = Route.useParams();
  return (
    <RequireDesk role={role}>
      <DeskRolePage />
    </RequireDesk>
  );
}

function DeskRolePage() {
  const { role } = Route.useParams();
  const me = useMember();
  const pieces = useQuery({ queryKey: ["pieces"], queryFn: () => listPieces() });
  if (!isRoleId(role)) return null;
  if (me.isLoading || pieces.isLoading) return <DeskOpening />;
  if (pieces.isError) {
    return (
      <p className="text-sm text-destructive">
        {pieces.error instanceof Error ? pieces.error.message : "বোর্ড লোড হয়নি।"}
      </p>
    );
  }
  return (
    <DeskBoard
      role={role}
      pieces={pieces.data ?? []}
      viewer={me.data ?? null}
      asAdmin={!!(me.data?.isAdmin && me.data.role !== role)}
    />
  );
}

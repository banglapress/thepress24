import { Navigate, createFileRoute } from "@tanstack/react-router";
import { DeskOpening, useMember } from "@/components/guards";

export const Route = createFileRoute("/desk/")({ component: DeskIndex });

function DeskIndex() {
  const me = useMember();
  if (me.isLoading) return <DeskOpening />;
  if (me.data?.isAdmin) return <Navigate to="/admin" />;
  if (me.data?.role) {
    return <Navigate to="/desk/$role" params={{ role: me.data.role }} />;
  }
  return <Navigate to="/pending" />;
}

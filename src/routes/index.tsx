import { createFileRoute, Navigate } from "@tanstack/react-router";
import { DeskOpening, RequireSession, useMember } from "@/components/guards";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <RequireSession>
      <HomeRedirect />
    </RequireSession>
  );
}

function HomeRedirect() {
  const me = useMember();
  if (me.isLoading) return <DeskOpening />;
  if (me.isError || !me.data) return <Navigate to="/login" />;
  if (me.data.isAdmin) return <Navigate to="/admin" />;
  if (me.data.role) {
    return <Navigate to="/desk/$role" params={{ role: me.data.role }} />;
  }
  return <Navigate to="/pending" />;
}

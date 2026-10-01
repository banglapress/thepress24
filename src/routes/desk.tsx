import { Outlet, createFileRoute } from "@tanstack/react-router";
import { RequireSession } from "@/components/guards";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/desk")({ component: DeskLayout });

function DeskLayout() {
  return (
    <RequireSession>
      <Shell>
        <Outlet />
      </Shell>
    </RequireSession>
  );
}

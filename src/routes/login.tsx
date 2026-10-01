import { createFileRoute, Navigate } from "@tanstack/react-router";
import { LoginForm } from "@/components/login-form";
import { DeskOpening } from "@/components/guards";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <DeskOpening />;
  if (user) return <Navigate to="/" />;
  return <LoginForm />;
}

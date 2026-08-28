import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/usuarios")({
  beforeLoad: () => {
    throw redirect({ to: "/permissoes" });
  },
  component: () => null,
});

import { createFileRoute, redirect } from "@tanstack/react-router";

// A calculadora virou a Calculadora de mercado, na página inicial.
export const Route = createFileRoute("/_authenticated/calculadora")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});

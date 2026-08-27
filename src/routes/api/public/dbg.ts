import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/dbg")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const res = await fetch("https://brasilapi.com.br/api/cnpj/v1/00000000000191");
          const text = await res.text();
          return new Response(JSON.stringify({ status: res.status, body: text.slice(0, 200) }));
        } catch (e) {
          return new Response(
            JSON.stringify({ err: e instanceof Error ? `${e.name}: ${e.message}` : String(e) }),
          );
        }
      },
    },
  },
});

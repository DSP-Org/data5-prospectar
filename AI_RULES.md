# AI_RULES.md

Persistent project guidance for AI-assisted work on this app. Treat this file as
authoritative project context. Keep it concise and up to date.

## Tech Stack

- **Framework**: React 19 SPA built with **TanStack Start** (`@tanstack/react-start`) and **Vite**.
- **Routing**: **TanStack Router** (`@tanstack/react-router`). Routes live in `src/routes/`
  using file-based routing (`routeTree.gen.ts` is generated — do not hand-edit). This
  replaces the React Router convention; keep routing in the TanStack file-based router.
- **Language**: TypeScript (strict). All source code goes in `src/`.
- **Styling**: **Tailwind CSS v4** (`@tailwindcss/vite`, `tw-animate-css`) with the
  `cn()` helper from `src/lib/utils.ts`. Use Tailwind utility classes for all styling.
- **UI components**: **shadcn/ui** (Radix-based). Prebuilt components live in
  `src/components/ui/` and should NOT be edited. Build new UI on top of them.
- **Icons**: **lucide-react**.
- **Data / server state**: **TanStack Query** (`@tanstack/react-query`) for client-side
  data fetching, caching, and mutations.
- **Forms & validation**: **react-hook-form** + **zod** (`@hookform/resolvers`), used with
  the shadcn `Form` components. Keep validation schemas in zod.
- **Backend / data**: **Supabase** (`@supabase/supabase-js`). Auth, database, and server
  helpers live under `src/integrations/supabase/` and `src/lib/*.server.ts`.
- **Charts**: **recharts** (used via the shadcn `Chart` components).
- **Full list**: see `package.json` (TanStack Query, Radix UI, CVA, sonner, vaul,
  cmdk, date-fns, react-day-picker, react-resizable-panels, etc.).

## Library Rules (What To Use For What)

- **Styling**: Always use Tailwind CSS utility classes. Never write raw CSS or inline
  styles unless there is no Tailwind equivalent.
- **UI primitives**: Use the shadcn/ui components imported from `src/components/ui/`.
  Do not build custom buttons/inputs/dialogs when a shadcn component exists. Create new
  components in `src/components/` if you need a customized composite.
- **Icons**: Use `lucide-react` icons. Generate custom images only when they add real
  value; prefer existing assets, SVGs, or lucide icons otherwise.
- **Routing / navigation**: Use TanStack Router links (`Link`, `useRouter`, `useNavigate`)
  and file-based routes in `src/routes/`. Never install or switch to react-router.
- **Data fetching & caching**: Use TanStack Query for any server data. Do not hand-roll
  fetch/useEffect caching. Use its mutation hooks for create/update/delete flows.
- **Server logic / backend**: Put server-only helpers in `src/lib/*.server.ts` and keep
  Supabase integration in `src/integrations/supabase/`. Frontend helpers that call the
  API go in `src/lib/*.functions.ts`.
- **Forms**: Use `react-hook-form` with zod schemas through the shadcn `Form` wrapper.
- **Charts**: Use `recharts` via the shadcn `Chart` component.
- **Toast notifications**: Use `sonner`.
- **Class merging**: Use the shared `cn()` helper from `src/lib/utils.ts`.

## File Organization

- `src/routes/` — TanStack file-based routes (pages).
- `src/components/` — reusable components; `src/components/ui/` for shadcn primitives.
- `src/lib/` — utilities, types, and backend/server helpers.
- `src/integrations/` — third-party integrations (Supabase, auth).
- `src/hooks/` — custom React hooks.

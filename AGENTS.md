# Repository Guidelines

## Project Structure & Module Organization
- `src/app` – Next.js routes (API in `src/app/api`, auth in `(Auth)`, workspace views in `(workspace)`).
- `src/components` – React UI (kebab-case filenames, PascalCase components).
- `src/lib` – shared utilities (Supabase in `src/lib/supabase`).
- `src/actions` – server actions for auth and mutations.
- `src/hooks` – custom hooks; colocate domain-specific helpers when useful.
- `src/types` – generated and shared types (Supabase types in `src/types/supabase.ts`).
- `public` – static assets. `supabase/migrations` – SQL migrations.
- Use path alias: `@/*` (e.g., `import { createClient } from '@/lib/supabase/client'`).

## Build, Test, and Development Commands
- `pnpm install` – install deps.
- `pnpm dev` – run the app at `http://localhost:3000`.
- `pnpm build` – production build.
- `pnpm start` – start built app.
- `pnpm lint` – ESLint (Next core-web-vitals + TypeScript).
- `pnpm types:generate` – generate Supabase types to `src/types/supabase.ts` (requires `SUPABASE_PROJECT_ID`).

## Coding Style & Naming Conventions
- TypeScript strict mode; 2-space indent; no semicolons preference unchanged—follow existing files.
- React components: PascalCase; hooks start with `use*`; files in `src/components` are kebab-case (e.g., `audio-player.tsx`).
- API route handlers live in `src/app/api/*/route.ts`.
- Use `@/*` imports over relative chains; keep modules small and focused.
- Styling via Tailwind CSS; prefer utility classes over ad-hoc CSS.

## Testing Guidelines
- No formal suite yet. If adding tests:
  - Unit/integration: Vitest + React Testing Library for components/hooks (`*.test.tsx`).
  - API: Vitest with request mocks for `route.ts` (`*.test.ts`).
  - E2E: Playwright for critical flows (upload → transcribe → summarize).
  - Place tests next to source or under `__tests__`; keep names descriptive.

## Commit & Pull Request Guidelines
- Commits: imperative, concise, Title Case subjects (e.g., `Refactor Meeting Transcript Rendering`).
- Reference issues in body when relevant; keep related changes together.
- PRs: clear description, scope, and rationale; link issues; include screenshots/screencasts for UI changes; list env/migration impacts.

## Security & Configuration Tips
- Store secrets in `.env.local`; never commit secrets. Use `src/.env.example` as reference.
- Required env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DEEPGRAM_API_KEY`, `OPENAI_API_KEY`.
- Supabase schema: `ai_transcriber`; audio bucket: `ai-transcriber-audio`.

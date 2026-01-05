# Repository Guidelines

## Project Structure & Module Organization

- `index.tsx` bootstraps the React app; `App.tsx` contains the main UI and state.
- `components/` reusable UI components (e.g. `components/Icon.tsx`, `components/ErrorBoundary.tsx`).
- `services/` client-side API wrappers (e.g. `services/geminiService.ts` calls `POST /api/generate`).
- `functions/api/` Cloudflare Pages Functions (Edge) API endpoints (e.g. `functions/api/generate.ts`).
- `public/` static assets (e.g. `public/favicon.svg`); `dist/` is the production build output.
- `types.ts` holds shared TypeScript types used across the app.

## Build, Test, and Development Commands

- `npm ci` (or `npm install`) installs dependencies.
- `npm run pages:dev` runs the full stack locally (Wrangler + Vite) so `/api/*` endpoints work.
- `npm run dev` runs the frontend only (useful for UI work; backend `/api/*` won't be available).
- `npm run build` produces a production build into `dist/`.
- `npm run preview` serves the built app locally for a production-like check.

## Configuration & Secrets

- Local env vars live in `.env` and/or `.dev.vars` (Wrangler). Required: `GEMINI_API_KEY`; optional: `GEMINI_GATEWAY_URL`.
- For frontend-only deployments (e.g. Vercel), set `VITE_GEMINI_GATEWAY_URL=https://readark.club/api` to call the Worker gateway directly.
- Never commit secrets. Keep `.env`/`.dev.vars` local and use Cloudflare Pages environment variables in production.

## Coding Style & Naming Conventions

- Language: TypeScript + React (function components) + Tailwind CSS utility classes.
- Match existing style: 2-space indentation, single quotes in TS/TSX, and descriptive names.
- Naming: React components `PascalCase.tsx` in `components/`; modules/functions `camelCase` (e.g. `generateImageContent`).
- Keep shared types in `types.ts` and avoid duplicating request/response shapes across frontend and `functions/`.

## Testing Guidelines

- No dedicated automated test suite is configured in `package.json` yet.
- Before opening a PR, do a manual smoke test via `npm run pages:dev` and validate the main flow (upload refs -> generate -> download).
- If you add tests, prefer `*.test.ts(x)` alongside the code or under `__tests__/`, and document how to run them in the PR.

## Commit & Pull Request Guidelines

- Commits follow a Conventional Commits-style prefix (seen in history): `feat:`, `fix:`, `chore:`, `refactor:`, `config:`.
- PRs should include: a clear summary, steps to verify (commands run), and screenshots for UI changes.
- Call out any environment variable changes explicitly and update docs (e.g. `README.md`, `DEPLOY_INSTRUCTIONS.md`) when behavior changes.

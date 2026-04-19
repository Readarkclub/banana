<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1OJK1mT6nxI0VJPQ0c3jd1iWPRz4k9s7C

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Configure environment variables:
   - Cloudflare Pages Functions: set `GEMINI_API_KEY` (and optionally `GEMINI_GATEWAY_URL`) in `.env` / `.dev.vars`
   - Vercel: set server-side env vars `GEMINI_GATEWAY_URL=https://api.readark.club/api` and `API_SECRET_KEY=...`
   - Do not put worker secrets in any `VITE_*` variable. Those values can be exposed to the browser bundle.
3. Run the app:
   - Full stack (frontend + `/api/*`): `npm run pages:dev`
   - Frontend only: `npm run dev`

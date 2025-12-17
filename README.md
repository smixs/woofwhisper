<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/16ftK08i8rD79EiJBggbxU-2maBQTIYpo

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Gemini key:
   - For Vercel/server-side requests: set `GEMINI_API_KEY` in Vercel Environment Variables (used by `api/analyze.ts`)
   - For local `npm run dev` without Vercel: set `VITE_GEMINI_API_KEY` in `.env` (DEV-only fallback; may require VPN in some regions)
3. Run the app:
   - `npm run dev` (uses browser key if `VITE_GEMINI_API_KEY` is set)
   - or `vercel dev` (runs the Vercel function locally so the browser doesn’t need the key)

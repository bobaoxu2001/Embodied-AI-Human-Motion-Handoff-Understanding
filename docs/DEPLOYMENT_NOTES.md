# Deployment notes

Honest description of what is actually deployed, and how to add a real backend later.

## What the live site is

**https://embodied-handoff-perception.vercel.app/** is a **static frontend** (Vite SPA on
Vercel). It includes:

- the full dark robotics-lab UI and the **demo-mode** simulated timeline/inference,
- **browser-side real MediaPipe** pose on uploaded video (client-side, no upload),
- a graceful **demo fallback** when no backend is reachable.

**There is no FastAPI backend on the live site.** Verified: `GET /api/health` on the
deployed URL returns the SPA's `index.html` (HTTP 200, `content-type: text/html`), **not**
FastAPI JSON — the catch-all SPA rewrite serves it. So:

- ✅ "Live demo = static app + browser MediaPipe + demo fallback" — accurate.
- ❌ Do **not** claim the deployed site runs FastAPI, the WebSocket stream, or trained
  models. Those run **locally**.

`vercel.json` is a static build (`outputDirectory: frontend/dist`) with an SPA rewrite.

## Running the backend (local)

```bash
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# REST: http://127.0.0.1:8000/api/health   WS: ws://127.0.0.1:8000/ws/stream
```

With `npm run dev`, the Vite dev server proxies `/api` and `/ws` to it, so the local app
exercises the real REST + WebSocket paths.

## Adding a real backend deployment (later)

The FastAPI app is a normal ASGI service and can be hosted on **Render / Railway / Fly.io**:

1. Deploy `backend/` (it ships a `Dockerfile`; `uvicorn app.main:app --host 0.0.0.0 --port $PORT`).
2. Point the frontend at it — set the API base (today `frontend/src/lib/api.ts` uses `/api`;
   add an env var like `VITE_API_BASE` and use it for REST + the WS URL).
3. Mind CORS (already `*` for the demo) and cost (keep it small / scale-to-zero).
4. Only after that is live should any "backend online" claim appear in the UI/README.

Until then the honest framing stands: **demo-mode + browser MediaPipe on the live site;
FastAPI + trained baselines run locally.**

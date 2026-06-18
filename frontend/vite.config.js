import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// Frontend dev server proxies /api to the FastAPI backend so the demo works
// with a single `npm run dev` when the backend is also running. If the backend
// is down, the app falls back to its built-in local demo engine.
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: "http://127.0.0.1:8000",
                changeOrigin: true,
            },
        },
    },
});

// Thin REST client for the FastAPI backend. Every call degrades gracefully: if
// the backend is unreachable the UI falls back to the local demo engine, so the
// frontend is fully runnable with `npm run dev` alone.

import type { AnalysisResponse, InferenceResult } from "../types";

const BASE = "/api";

export interface HealthResponse {
  status: string;
  demo_mode: boolean;
  device: string;
  version: string;
  mediapipe: boolean;
  torch: boolean;
}

async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, init);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  health: () => getJSON<HealthResponse>("/health"),

  analyzeVideo: (file?: File) => {
    const form = new FormData();
    if (file) form.append("file", file);
    form.append("demo_mode", file ? "false" : "true");
    return getJSON<AnalysisResponse>("/analyze-video", {
      method: "POST",
      body: form,
    });
  },

  analysis: (id: string) => getJSON<AnalysisResponse>(`/analysis/${id}`),

  frame: (id: string, n: number) =>
    getJSON<InferenceResult>(`/analysis/${id}/frames/${n}`),
};

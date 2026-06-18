import { useEffect, useRef, useState } from "react";
import type { InferenceResult } from "../types";

// Connects to the backend WebSocket streaming-inference endpoint (/ws/stream)
// and exposes the latest per-frame InferenceResult + connection status. This is
// the realtime path: instead of polling per-frame REST, the server pushes one
// InferenceResult per frame at the clip FPS. If the backend is unreachable
// (e.g. the static Vercel deploy) the status stays "offline" and the rest of the
// app keeps running on its local demo engine — same graceful-degradation contract
// as lib/api.ts.

export type StreamStatus = "connecting" | "online" | "offline";

export interface StreamControls {
  status: StreamStatus;
  frame: InferenceResult | null;
  send: (msg: Record<string, unknown>) => void;
}

function wsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws/stream`;
}

export function useStream(enabled = true): StreamControls {
  const [status, setStatus] = useState<StreamStatus>(enabled ? "connecting" : "offline");
  const [frame, setFrame] = useState<InferenceResult | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus("offline");
      return;
    }
    let closed = false;
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl());
    } catch {
      setStatus("offline");
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => !closed && setStatus("online");
    ws.onmessage = (ev) => {
      if (closed) return;
      try {
        const data = JSON.parse(ev.data);
        if (data && data.type === "hello") return; // handshake, not a frame
        setFrame(data as InferenceResult);
      } catch {
        /* ignore malformed frames */
      }
    };
    ws.onerror = () => !closed && setStatus("offline");
    ws.onclose = () => !closed && setStatus("offline");

    return () => {
      closed = true;
      wsRef.current = null;
      ws.close();
    };
  }, [enabled]);

  const send = (msg: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };

  return { status, frame, send };
}

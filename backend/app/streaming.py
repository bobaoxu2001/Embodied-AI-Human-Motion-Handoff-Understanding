"""WebSocket streaming inference — `/ws/stream`.

Streams one `InferenceResult` per frame at the clip FPS, so the client renders
true realtime perception instead of polling per-frame REST. Demo-mode-first:
frames come from the deterministic demo engine; with real models the same loop
emits real `InferenceResult`s behind the identical schema.

Protocol
--------
On connect the server sends a `hello`:
    {"type": "hello", "fps": 30.0, "n_frames": 320, "demo_mode": true}
then one frame payload per tick (the `InferenceResult` JSON, schema in
`schemas.py`). The client may send control messages at any time:
    {"type": "play"}             resume advancing
    {"type": "pause"}            hold on the current frame
    {"type": "seek",  "frame": n}  jump to frame n (and pause)
    {"type": "config", "fps": f}   change the stream rate
"""

import asyncio

from starlette.websockets import WebSocket, WebSocketDisconnect, WebSocketState

from . import demo, runtime


def _clamp_frame(n: int) -> int:
    return max(0, min(demo.TOTAL_FRAMES - 1, int(n)))


def _apply(msg: dict, state: dict) -> None:
    """Mutate stream state from a client control message."""
    t = msg.get("type")
    if t == "play":
        state["playing"] = True
    elif t == "pause":
        state["playing"] = False
    elif t == "seek":
        state["frame"] = _clamp_frame(msg.get("frame", 0))
        state["playing"] = False
    elif t == "config" and "fps" in msg:
        state["fps"] = max(1.0, min(120.0, float(msg["fps"])))


async def stream_endpoint(ws: WebSocket, analysis_id: str = "clp_stream") -> None:
    await ws.accept()
    demo_flag = runtime.demo_mode()
    state = {"frame": 0, "playing": True, "fps": demo.FPS}

    await ws.send_json(
        {
            "type": "hello",
            "fps": state["fps"],
            "n_frames": demo.TOTAL_FRAMES,
            "demo_mode": demo_flag,
        }
    )

    try:
        while True:
            result = demo.derive_frame(
                state["frame"], session_id=analysis_id, demo_mode=demo_flag
            )
            await ws.send_json(result.model_dump())

            # Use the inter-frame delay to also poll for a control message; if
            # none arrives in time we just advance to the next frame.
            try:
                msg = await asyncio.wait_for(ws.receive_json(), timeout=1.0 / state["fps"])
                _apply(msg, state)
            except asyncio.TimeoutError:
                pass

            if state["playing"]:
                state["frame"] = (state["frame"] + 1) % demo.TOTAL_FRAMES
    except (WebSocketDisconnect, RuntimeError):
        # client went away (RuntimeError covers send-after-disconnect races)
        pass
    finally:
        if ws.application_state != WebSocketState.DISCONNECTED:
            try:
                await ws.close()
            except RuntimeError:
                pass

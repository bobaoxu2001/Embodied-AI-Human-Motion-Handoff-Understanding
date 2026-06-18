"""FastAPI application — Embodied Handoff Perception backend.

Endpoints (the contract the React frontend consumes):
    GET  /api/health                         liveness + device + capabilities
    POST /api/analyze-video                  upload a clip → analysis handle
    GET  /api/analysis/{analysis_id}         full analysis (meta + segments + sample)
    GET  /api/analysis/{analysis_id}/frames/{n}   per-frame InferenceResult
    GET  /api/model/meta                     architecture + metrics

Demo mode is the default: results are deterministic and require no ML stack
(see app/demo.py). Real models drop in behind the same interface (app/pipeline).
"""

import secrets
from typing import Dict, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from . import __version__, demo, runtime
from .pipeline import build_pipeline
from .streaming import stream_endpoint
from .schemas import (
    AnalysisMeta,
    AnalysisResponse,
    HealthResponse,
    InferenceResult,
    ModelCardResponse,
    ModelMetaResponse,
)

app = FastAPI(
    title="Embodied Handoff Perception API",
    version=__version__,
    description="Real-time 3D human pose tracking & handoff intent recognition (demo mode).",
)

# Allow the Vite dev server (and a deployed frontend) to call the API directly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory analysis store. Fine for an MVP/demo; swap for Redis/DB in production.
_ANALYSES: Dict[str, AnalysisMeta] = {}

# Build the (demo) pipeline once at startup so the wiring is exercised.
PIPELINE = build_pipeline(demo=runtime.demo_mode())


def _new_id() -> str:
    return "clp_" + secrets.token_hex(3)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        demo_mode=runtime.demo_mode(),
        device=runtime.device(),
        version=__version__,
        mediapipe=runtime.has_mediapipe(),
        torch=runtime.has_torch(),
    )


@app.post("/api/analyze-video", response_model=AnalysisResponse)
async def analyze_video(
    file: Optional[UploadFile] = File(default=None),
    demo_mode: str = Form(default="true"),
) -> AnalysisResponse:
    """Accept a video (or nothing, for pure demo) and return an analysis handle.

    In demo mode we don't actually decode frames — we register a deterministic
    analysis the client can scrub. With real models installed this is where
    OpenCV decode + the pipeline would run.
    """
    forced_demo = demo_mode.lower() != "false"
    is_demo = runtime.demo_mode() or forced_demo

    source = "demo-clip"
    if file is not None:
        # Drain the upload so the client's POST completes; bytes are discarded in
        # demo mode (no decode). This keeps the request/response cycle realistic.
        _ = await file.read()
        source = file.filename or "uploaded-clip"

    analysis_id = _new_id()
    response = demo.build_analysis(
        analysis_id=analysis_id,
        source=source,
        demo_mode=is_demo,
        device=runtime.device(),
    )
    _ANALYSES[analysis_id] = response.meta
    return response


@app.get("/api/analysis/{analysis_id}", response_model=AnalysisResponse)
def get_analysis(analysis_id: str) -> AnalysisResponse:
    meta = _ANALYSES.get(analysis_id)
    if meta is None:
        raise HTTPException(status_code=404, detail="analysis not found")
    return AnalysisResponse(
        meta=meta,
        segments=demo.segments(),
        sample_frame=demo.derive_frame(
            142, session_id=analysis_id, demo_mode=meta.demo_mode
        ),
    )


@app.get("/api/analysis/{analysis_id}/frames/{n}", response_model=InferenceResult)
def get_frame(analysis_id: str, n: int) -> InferenceResult:
    meta = _ANALYSES.get(analysis_id)
    if meta is None:
        raise HTTPException(status_code=404, detail="analysis not found")
    if n < 0 or n >= demo.TOTAL_FRAMES:
        raise HTTPException(status_code=416, detail="frame index out of range")
    return demo.derive_frame(n, session_id=analysis_id, demo_mode=meta.demo_mode)


@app.get("/api/model/meta", response_model=ModelMetaResponse)
def model_meta() -> ModelMetaResponse:
    return ModelMetaResponse(
        version=__version__,
        demo_mode=runtime.demo_mode(),
        metrics={
            "throughput_fps": 30.0,
            "latency_ms_p50": 33,
            "latency_ms_p95": 48,
            "model_size_mb": 41,
            "traj_ade_mm": 52,
            "traj_fde_mm": 96,
            "intent_acc": 0.892,
            "action_top1": 0.845,
        },
        architecture=[
            {"stage": s.name, "model": s.model_name} for s in PIPELINE
        ],
        latency_ms=[
            {"stage": "pose_extraction", "ms": 13.2},
            {"stage": "lifting_2d_to_3d", "ms": 6.1},
            {"stage": "action_recognition", "ms": 5.4},
            {"stage": "trajectory_forecast", "ms": 4.9},
            {"stage": "handoff_intent", "ms": 3.4},
        ],
    )


@app.get("/api/model/card", response_model=ModelCardResponse)
def model_card() -> ModelCardResponse:
    return demo.model_card(version=__version__, demo_mode=runtime.demo_mode())


@app.websocket("/ws/stream")
async def ws_stream(websocket: WebSocket) -> None:
    """Realtime per-frame InferenceResult stream (see app/streaming.py)."""
    await stream_endpoint(websocket)


@app.get("/")
def root() -> Dict[str, object]:
    return {
        "service": "embodied-handoff-perception",
        "version": __version__,
        "demo_mode": runtime.demo_mode(),
        "docs": "/docs",
        "health": "/api/health",
    }

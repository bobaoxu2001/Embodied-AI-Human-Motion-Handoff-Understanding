"""Pydantic schemas — the API contract.

`InferenceResult` mirrors the JSON in the Claude Design handoff (HANDOFF.md §6)
exactly, so the React `InferenceResult` TypeScript type and these models stay in
lockstep. Typing is kept Python 3.8-compatible (typing.List/Dict/Optional).
"""

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

ActionLabel = Literal["idle", "reaching", "grasping", "placing", "pointing", "handoff"]


class ActionResult(BaseModel):
    label: ActionLabel
    confidence: float
    scores: Dict[str, float]


class HandoffIntent(BaseModel):
    detected: bool
    confidence: float


class Pose2D(BaseModel):
    body: List[List[float]]  # 17 × [x, y, score], normalized
    hand_right: List[List[float]]  # 21 × [x, y, score], normalized
    hand_left: Optional[List[List[float]]] = None


class Pose3D(BaseModel):
    root: List[float]  # [x, y, z]
    joints_mm: List[List[float]]  # 17 × [x, y, z] in mm, root-relative


class ObjectDet(BaseModel):
    label: str
    confidence: float
    bbox: List[float]  # [x, y, w, h] normalized


class Trajectory(BaseModel):
    horizon_s: float
    history: List[List[float]]
    forecast: List[List[float]]
    ade_mm: float
    fde_mm: float


class RobotAction(BaseModel):
    command: str
    params: Dict[str, object]
    priority: Literal["low", "med", "high"]


class InferenceResult(BaseModel):
    session_id: str
    demo_mode: bool
    frame: int
    timestamp_s: float
    fps: float
    latency_ms: float
    action: ActionResult
    handoff_intent: HandoffIntent
    pose_2d: Pose2D
    pose_3d: Pose3D
    object: ObjectDet
    trajectory: Trajectory
    robot_action: RobotAction


class Segment(BaseModel):
    key: str
    label: str
    start: int
    end: int
    conf: float
    color: str
    bg: str


class AnalysisMeta(BaseModel):
    analysis_id: str
    demo_mode: bool
    source: str
    fps: float
    n_frames: int
    duration_s: float
    device: str


class AnalysisResponse(BaseModel):
    meta: AnalysisMeta
    segments: List[Segment]
    sample_frame: Optional[InferenceResult] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    demo_mode: bool
    device: str
    version: str
    mediapipe: bool
    torch: bool


class ModelMetaResponse(BaseModel):
    version: str
    demo_mode: bool
    metrics: Dict[str, object]
    architecture: List[Dict[str, object]]
    latency_ms: List[Dict[str, object]]


class ModelCardModel(BaseModel):
    """One learned model within the pipeline."""

    stage: str
    name: str
    type: str
    learned: bool = True
    input: str
    output: str
    params: str
    config: str
    loss: str
    metric: str


class ModelCardResponse(BaseModel):
    """Structured model card — mirrors docs/MODEL_CARD.md and the UI route."""

    version: str
    demo_mode: bool
    task: str
    license: str
    repo: str
    doc: str
    intended_use: List[str]
    out_of_scope: List[str]
    data: List[str]
    training: Dict[str, str]
    models: List[ModelCardModel]
    limitations: List[Dict[str, str]]


class AnalyzeRequestInfo(BaseModel):
    """Echoed back so the client can confirm how the clip was handled."""

    demo_mode: bool = Field(default=True)
    filename: Optional[str] = None

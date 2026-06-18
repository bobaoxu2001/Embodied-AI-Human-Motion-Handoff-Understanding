"""Inference pipeline stages.

Each stage wraps one model behind a small interface (`Stage`). Stages ship with
demo-mode fallbacks so the pipeline produces a valid `InferenceResult` with no
weights installed; dropping in real models means implementing `_run_real`
(HANDOFF.md §11). The 5 stages mirror the architecture graph in the inspector:
pose extraction → 2D→3D lifting → action recognition → trajectory forecast →
handoff intent.
"""

from .stages import (
    ActionStage,
    HandoffIntentStage,
    PoseStage,
    TrajectoryStage,
    LiftingStage,
    build_pipeline,
)

__all__ = [
    "PoseStage",
    "LiftingStage",
    "ActionStage",
    "TrajectoryStage",
    "HandoffIntentStage",
    "build_pipeline",
]

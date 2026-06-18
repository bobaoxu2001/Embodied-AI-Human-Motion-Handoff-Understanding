"""Concrete pipeline stages (demo-mode by default).

These map 1:1 to the PyTorch model stubs in `backend/ml/models`. In demo mode
each stage simply passes through the deterministic demo output; once weights
exist, `Stage._build_model`/`_run_real` can be implemented to call the real
networks behind the identical interface.
"""

from typing import List

from .base import Stage


class PoseStage(Stage):
    name = "pose_extraction"
    model_name = "HRNet-W32 + hand detector"
    # real impl would use app.pipeline.keypoints.KeypointExtractor


class LiftingStage(Stage):
    name = "lifting_2d_to_3d"
    model_name = "Temporal lifting transformer"
    # real impl: ml.models.pose_lift.PoseLiftingNet


class ActionStage(Stage):
    name = "action_recognition"
    model_name = "Pose-TCN (causal)"
    # real impl: ml.models.action.ActionTCN


class TrajectoryStage(Stage):
    name = "trajectory_forecast"
    model_name = "Seq2seq GRU decoder"
    # real impl: ml.models.trajectory.TrajectoryGRU


class HandoffIntentStage(Stage):
    name = "handoff_intent"
    model_name = "Fusion MLP head"
    # real impl: ml.models.intent.IntentMLP


def build_pipeline(demo: bool = True) -> List[Stage]:
    """Construct the ordered pipeline. Stages share one `demo` flag."""
    return [
        PoseStage(demo=demo),
        LiftingStage(demo=demo),
        ActionStage(demo=demo),
        TrajectoryStage(demo=demo),
        HandoffIntentStage(demo=demo),
    ]

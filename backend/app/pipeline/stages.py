"""Concrete pipeline stages (demo-mode by default).

These map 1:1 to the PyTorch models in `backend/ml/models`. In demo mode each
stage passes through the deterministic demo output; with `demo=False` and the
matching `<onnx_name>.onnx` present in `ml/weights/`, the base `Stage` runs the
exported ONNX graph behind the identical interface. The `onnx_name` values match
the files written by `ml/export_onnx.py`.
"""

from typing import List

from .base import Stage


class PoseStage(Stage):
    name = "pose_extraction"
    model_name = "HRNet-W32 + hand detector"
    onnx_name = None  # uses app.pipeline.keypoints.KeypointExtractor, not ONNX


class LiftingStage(Stage):
    name = "lifting_2d_to_3d"
    model_name = "Temporal lifting transformer"
    onnx_name = "lifting_2d_to_3d"  # ml.models.pose_lift.PoseLiftingNet


class ActionStage(Stage):
    name = "action_recognition"
    model_name = "Pose-TCN (causal)"
    onnx_name = "action_recognition"  # ml.models.action.ActionTCN


class TrajectoryStage(Stage):
    name = "trajectory_forecast"
    model_name = "Seq2seq GRU decoder"
    onnx_name = "trajectory_forecast"  # ml.models.trajectory.TrajectoryGRU


class HandoffIntentStage(Stage):
    name = "handoff_intent"
    model_name = "Fusion MLP head"
    onnx_name = "handoff_intent"  # ml.models.intent.IntentMLP


def build_pipeline(demo: bool = True) -> List[Stage]:
    """Construct the ordered pipeline. Stages share one `demo` flag."""
    return [
        PoseStage(demo=demo),
        LiftingStage(demo=demo),
        ActionStage(demo=demo),
        TrajectoryStage(demo=demo),
        HandoffIntentStage(demo=demo),
    ]

"""Deterministic demo-mode inference.

This is the Python twin of the frontend `demoEngine.ts`: the same sparse wrist
keyframes lerped per frame, the same segment timeline and confidence curve. It
returns a fully-formed `InferenceResult` so the API contract is identical whether
the response comes from these canned values or, later, from real models behind
the same interface (HANDOFF.md §11). No ML dependencies required.
"""

import math
from typing import Dict, List, Tuple

from .schemas import (
    ActionResult,
    AnalysisMeta,
    AnalysisResponse,
    HandoffIntent,
    InferenceResult,
    ObjectDet,
    Pose2D,
    Pose3D,
    RobotAction,
    Segment,
    Trajectory,
)

TOTAL_FRAMES = 320
FPS = 30.0

# (key, label, start, end, conf, color, bg)
SEG_DEFS: List[Tuple[str, str, int, int, float, str, str]] = [
    ("idle", "Idle", 0, 46, 0.99, "#8893a3", "#11151c"),
    ("reaching", "Reaching", 46, 120, 0.91, "#4d9fff", "#0e1826"),
    ("grasping", "Grasping", 120, 164, 0.88, "#9b7cff", "#14112a"),
    ("handoff", "Handoff", 164, 232, 0.94, "#3ddc97", "#0c1812"),
    ("placing", "Placing", 232, 280, 0.86, "#ff8a3d", "#1a1208"),
    ("idle2", "Idle", 280, 320, 0.98, "#8893a3", "#11151c"),
]

HANDOFF_BASE = {
    "idle": 0.08,
    "reaching": 0.55,
    "grasping": 0.72,
    "handoff": 0.94,
    "placing": 0.21,
    "idle2": 0.05,
}

ROBOT_MAP = {
    "idle": ("extend_gripper", "Hold position", "standby · gripper closed", "low"),
    "reaching": ("pre_position", "Pre-position gripper", "align to predicted target", "med"),
    "grasping": ("track_object", "Track object pose", "maintain approach vector", "med"),
    "handoff": ("extend_gripper", "Extend gripper · open", "compliance mode · ready", "high"),
    "placing": ("retract", "Retract · standby", "clear workspace", "low"),
    "idle2": ("extend_gripper", "Hold position", "standby · gripper closed", "low"),
}

# Sparse wrist keyframes in the 640×400 overlay space.
WRIST_KF = [
    (0, 316, 206), (46, 330, 202), (120, 404, 182), (164, 404, 182),
    (232, 520, 198), (280, 470, 250), (319, 322, 208),
]

# Static COCO-17 body joints in the 640×400 overlay space (right elbow/wrist are
# overwritten per frame). Order: nose, l/r eye, l/r ear, l/r shoulder, l/r elbow,
# l/r wrist, l/r hip, l/r knee, l/r ankle.
BODY_STATIC = [
    (250, 86), (245, 83), (255, 83), (238, 86), (262, 86),
    (216, 138), (288, 134), (200, 196), (344, 158),
    (196, 250), (404, 182), (234, 234), (278, 230),
    (228, 310), (282, 308), (224, 380), (288, 376),
]


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def _interp_kf(ff: float) -> Tuple[float, float]:
    kf = WRIST_KF
    if ff <= kf[0][0]:
        return float(kf[0][1]), float(kf[0][2])
    for i in range(len(kf) - 1):
        if kf[i][0] <= ff <= kf[i + 1][0]:
            t = (ff - kf[i][0]) / (kf[i + 1][0] - kf[i][0])
            return _lerp(kf[i][1], kf[i + 1][1], t), _lerp(kf[i][2], kf[i + 1][2], t)
    return float(kf[-1][1]), float(kf[-1][2])


def _segment_for(frame: int) -> Tuple[str, str, int, int, float, str, str]:
    for seg in SEG_DEFS:
        if seg[2] <= frame < seg[3]:
            return seg
    return SEG_DEFS[0]


def segments() -> List[Segment]:
    return [
        Segment(key=k, label=lbl, start=s, end=e, conf=c, color=col, bg=bg)
        for (k, lbl, s, e, c, col, bg) in SEG_DEFS
    ]


def _action_scores(seg_key: str, conf: float) -> Dict[str, float]:
    """Spread remaining probability mass over the other actions deterministically."""
    label = "idle" if seg_key == "idle2" else seg_key
    others = [a for a in ["idle", "reaching", "grasping", "placing", "pointing", "handoff"] if a != label]
    remaining = max(0.0, 1.0 - conf)
    each = round(remaining / len(others), 4)
    scores = {a: each for a in others}
    scores[label] = round(conf, 4)
    return scores


def derive_frame(frame: int, session_id: str = "clp_demo", demo_mode: bool = True) -> InferenceResult:
    f = max(0, min(TOTAL_FRAMES - 1, int(frame)))
    seg = _segment_for(f)
    seg_key, seg_label, _s, _e, seg_conf, _col, _bg = seg
    label = "idle" if seg_key == "idle2" else seg_key

    # wrist (+ jitter), elbow, object, forecast — same math as the frontend
    wx0, wy0 = _interp_kf(f)
    wx = wx0 + math.sin(f / 4) * 1.2
    wy = wy0 + math.cos(f / 3) * 1.0
    emx, emy = (288 + wx) / 2, (134 + wy) / 2
    elbx, elby = emx - 6, emy + 14
    obj_x, obj_y = (396.0, 150.0) if f < 116 else (wx - 8, wy - 30)
    fxp, fyp = _interp_kf(min(319, f + 34))

    # handoff intent confidence curve
    base = HANDOFF_BASE[seg_key]
    hc = max(0.0, min(0.99, base + math.sin(f / 5) * 0.018))
    detected = hc >= 0.8

    # normalized 2D body keypoints (right elbow=idx9, right wrist=idx10 dynamic)
    body = []
    for i, (bx, by) in enumerate(BODY_STATIC):
        if i == 8:  # r elbow
            bx, by = elbx, elby
        elif i == 10:  # r wrist
            bx, by = wx, wy
        body.append([round(bx / 640, 4), round(by / 400, 4), 0.97])

    # 21 right-hand keypoints fanned from the wrist
    hand_right = [[round(wx / 640, 4), round(wy / 400, 4), 0.97]]
    for k in range(1, 21):
        ang = -0.6 + (k / 20) * 1.4
        rad = 10 + (k % 5) * 5
        hx = wx + math.cos(ang) * rad
        hy = wy + math.sin(ang) * rad
        hand_right.append([round(hx / 640, 4), round(hy / 400, 4), 0.94])

    # 17 root-relative 3D joints in mm (deterministic, plausible scale)
    joints_mm = []
    for i, (bx, by) in enumerate(BODY_STATIC):
        if i == 8:
            bx, by = elbx, elby
        elif i == 10:
            bx, by = wx, wy
        x_mm = round((bx - 252) * 3.2, 1)
        y_mm = round((250 - by) * 3.2, 1)
        z_mm = round(math.sin((i + f) / 6) * 35, 1)
        joints_mm.append([x_mm, y_mm, z_mm])

    # trajectory history (last 10 frames) + forecast (30 steps to t+1.0s)
    history = []
    for h in range(10, 0, -1):
        hxh, hyh = _interp_kf(max(0, f - h * 2))
        history.append([round(hxh / 640, 4), round(hyh / 400, 4)])
    forecast = []
    for s in range(1, 31):
        fxs, fys = _interp_kf(min(319, f + s))
        forecast.append([round(fxs / 640, 4), round(fys / 400, 4)])

    cmd, _ra, _rasub, priority = ROBOT_MAP[seg_key]

    return InferenceResult(
        session_id=session_id,
        demo_mode=demo_mode,
        frame=f,
        timestamp_s=round(f / FPS, 2),
        fps=FPS,
        latency_ms=33.0,
        action=ActionResult(
            label=label, confidence=round(seg_conf, 2), scores=_action_scores(seg_key, seg_conf)
        ),
        handoff_intent=HandoffIntent(detected=detected, confidence=round(hc, 2)),
        pose_2d=Pose2D(body=body, hand_right=hand_right),
        pose_3d=Pose3D(root=[0.0, 0.0, 0.0], joints_mm=joints_mm),
        object=ObjectDet(
            label="cup",
            confidence=0.97,
            bbox=[round(obj_x / 640, 4), round(obj_y / 400, 4), 0.1, 0.16],
        ),
        trajectory=Trajectory(
            horizon_s=1.0, history=history, forecast=forecast, ade_mm=52.0, fde_mm=96.0
        ),
        robot_action=RobotAction(
            command=cmd,
            params={"open": seg_key == "handoff", "approach": [0.62, 0.41, 0.30]},
            priority=priority,  # type: ignore[arg-type]
        ),
    )


def build_analysis(
    analysis_id: str, source: str, demo_mode: bool, device: str
) -> AnalysisResponse:
    meta = AnalysisMeta(
        analysis_id=analysis_id,
        demo_mode=demo_mode,
        source=source,
        fps=FPS,
        n_frames=TOTAL_FRAMES,
        duration_s=round(TOTAL_FRAMES / FPS, 2),
        device=device,
    )
    return AnalysisResponse(
        meta=meta,
        segments=segments(),
        sample_frame=derive_frame(142, session_id=analysis_id, demo_mode=demo_mode),
    )

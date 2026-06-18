# Model Card — Embodied Handoff Perception

A perception stack that turns RGB video of a person interacting with an object into a
robot-actionable handoff decision. It is a **pipeline of five stages**; four of them are
learned models, one (pose extraction) is an off-the-shelf detector. This card documents
each learned model, the system as a whole, intended use, data, and limitations.

> **Status:** the repository ships in **demo mode** — the numbers below are *targets /
> simulated* on a ~150-clip MVP set, **not measured production benchmarks**. The model
> architectures are real, trainable `torch.nn.Module`s ([`backend/ml/models/`](../backend/ml/models));
> training (`backend/ml/train.py`) and ONNX inference (`backend/app/pipeline/`) are wired
> but un-trained weights are not distributed. Every metric here is reproduced from
> [`backend/eval/`](../backend/eval) demo runs and will be replaced by measured values
> once weights exist. See [DEMO_MODE.md](DEMO_MODE.md).

---

## System overview

| # | Stage | Model | Learned? | Input → Output |
|---|---|---|---|---|
| 01 | Pose extraction | HRNet-W32 + hand detector (MediaPipe) | off-the-shelf | RGB frame → 17 body + 2×21 hand 2D keypoints |
| 02 | 2D→3D lifting | Temporal lifting Transformer | ✅ | 27-frame 2D window → 17 root-relative 3D joints (mm) |
| 03 | Action recognition | Causal Pose-TCN | ✅ | pose-feature window → 6 action logits |
| 04 | Trajectory forecast | Seq2seq GRU | ✅ | wrist history → 30-step (1.0 s) future hand path |
| 05 | Handoff intent | Fusion MLP | ✅ | pose + motion + action features → P(handoff) |

- **Overall task:** human→robot handoff perception for HRI (human–robot interaction).
- **Output contract:** one `InferenceResult` JSON per frame (see
  [`backend/app/schemas.py`](../backend/app/schemas.py)), identical for demo and real
  inference.
- **Latency target:** ~33 ms/frame end-to-end (≈30 fps) on a single modern GPU; CPU/ONNX
  fallback supported. Per-stage budget in [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Per-model details

### 02 · 2D→3D pose lifting — `PoseLiftingNet`
[`backend/ml/models/pose_lift.py`](../backend/ml/models/pose_lift.py)

| Field | Value |
|---|---|
| Type | Transformer encoder (temporal), centre-frame regression |
| Input | `[B, T=27, J*2=34]` — window of 2D keypoints |
| Output | `[B, J*3=51]` — root-relative 3D joints (mm) for the centre frame |
| Config | `d_model=256`, `n_heads=8`, `n_layers=4`, GELU, learned positional embedding |
| Params (approx.) | ~3.2 M |
| Loss | MPJPE (mean per-joint position error) on root-relative joints |
| 3D supervision | multi-view triangulation, or public mocap (Human3.6M / H3WB) |
| Target metric | MPJPE ↓ (reported as traj/pose error proxy in demo) |

### 03 · Action recognition — `ActionTCN`
[`backend/ml/models/action.py`](../backend/ml/models/action.py)

| Field | Value |
|---|---|
| Type | Causal dilated Temporal Conv Net (streaming-friendly) |
| Input | `[B, T, F=51]` — per-frame 3D pose features |
| Output | `[B, 6]` logits — `idle / reaching / grasping / placing / pointing / handoff` |
| Config | `ch=128`, residual blocks with dilations `(1,2,4,8)`, left-padding → causal |
| Params (approx.) | ~0.6 M |
| Loss | class-weighted cross-entropy (handles class imbalance) |
| Target metric | top-1 accuracy, per-class recall, confusion matrix ([`eval/action_accuracy.py`](../backend/eval/action_accuracy.py)) |
| Demo target | 84.5% top-1 (6 classes) |

Causality matters: only past/current frames feed the prediction, so the model is valid
for real-time streaming inference (no future-frame leakage).

### 04 · Trajectory forecast — `TrajectoryGRU`
[`backend/ml/models/trajectory.py`](../backend/ml/models/trajectory.py)

| Field | Value |
|---|---|
| Type | Seq2seq GRU (encoder GRU + autoregressive GRUCell decoder) |
| Input | `[B, T_in, 2]` — recent wrist position history |
| Output | `[B, H=30, 2]` — next 1.0 s of hand path @ 30 fps |
| Config | `hidden=128`, autoregressive roll-out from last observed position |
| Params (approx.) | ~0.15 M |
| Loss | ADE + FDE (avg / final displacement error) on the forecast horizon |
| Target metric | ADE 52 mm, FDE 96 mm ([`eval/trajectory_ade_fde.py`](../backend/eval/trajectory_ade_fde.py)) |

### 05 · Handoff intent — `IntentMLP`
[`backend/ml/models/intent.py`](../backend/ml/models/intent.py)

| Field | Value |
|---|---|
| Type | Fusion MLP classification head |
| Input | `[B, F≈160]` — fused pose + motion + action features |
| Output | `[B]` logit → sigmoid → P(handoff intent) |
| Config | `160 → 128 → 64 → 1`, ReLU, dropout 0.2 |
| Params (approx.) | ~30 K |
| Loss | binary cross-entropy (positive class = clear intent to transfer) |
| Decision threshold | 0.80 (tunable for precision/recall trade-off) |
| Target metric | precision / recall / F1 ([`eval/handoff_prf.py`](../backend/eval/handoff_prf.py)); demo intent acc 89.2% |

This is the decision head: it turns perception into the robot-actionable signal that drives
the emitted `robot_action` (e.g. *extend gripper · open · compliance mode*).

---

## Training (intended configuration)

Training entry point: [`backend/ml/train.py`](../backend/ml/train.py) (`--model {lifting,action,trajectory,intent}`).

| Hyper-parameter | Default |
|---|---|
| Optimizer | AdamW |
| Learning rate | 1e-3 (cosine decay), weight decay 1e-4 |
| Batch size | 64 |
| Epochs | 60 (early-stop on val) |
| Window (lifting/action) | 27 frames @ 30 fps |
| Augmentation | horizontal flip, keypoint jitter, temporal crop |
| Split | **by subject** (see [DATASET.md](DATASET.md)) to avoid identity leakage |
| Hardware target | single GPU (≤8 GB); all four models are small |
| Export | ONNX opset 17, optional int8 ([`backend/ml/export_onnx.py`](../backend/ml/export_onnx.py)) |

---

## Data

- **Primary:** ~150 self-recorded handoff clips, controlled lab, 2–3 calibrated cameras,
  1280×720 @ 30 fps. Capture protocol, annotation, and splits: [DATASET.md](DATASET.md).
- **Lifting supervision:** multi-view triangulation and/or public mocap (Human3.6M, H3WB).
- **Priors / pretraining (optional):** HOI4D-inspired human-object interaction.
- **Planned:** Ego4D-style egocentric extension.

**License & consent.** Self-recorded clips are captured with informed participant consent
for research/portfolio use; faces are not the subject and can be blurred on request.
Public datasets are used under their respective licenses (Human3.6M, HOI4D, Ego4D each
require separate registration/EULA — they are **not** redistributed in this repo).

---

## Intended use & out-of-scope

**Intended use.** Research/portfolio demonstration of a real-time HRI handoff-perception
pipeline; a reference for how to ship a contract-stable perception service.

**Out of scope / not validated for.**
- Safety-critical robot control without a human supervisor and independent safety layer.
- Surveillance, identification, or biometric profiling of individuals.
- Deployment outside the captured distribution (see limitations) without re-training.
- Medical, legal, or any high-stakes decision-making.

The emitted `robot_action` is a *suggestion*; a real robot must gate it behind force/torque
limits, collision checking, and an e-stop.

---

## Limitations & failure modes

Surfaced on the *Dataset & evaluation* screen and in [eval](../backend/eval):

| Failure mode | Effect |
|---|---|
| Occlusion (object/self) | drops hand keypoints (≈ −8% recall) |
| Fast hand motion / motion blur | larger final-step trajectory error (+~12 mm FDE) |
| Poor lighting | sensor noise, lower recall (≈ −6%) |
| Multiple people | association ambiguity / id-switches |
| Unusual camera angles | top-down / extreme oblique degrade lifting |
| Distractor objects | intent confidence drops; ambiguous target selection |

**Fairness/ethics.** The MVP set is small and not demographically balanced; action/intent
performance may vary across body types, skin tones, clothing, and handedness. Treat all
metrics as MVP targets and re-measure on a representative, consented dataset before any
real use.

---

## Reproducing the (demo) metrics

```bash
cd backend && source .venv/bin/activate
python eval/action_accuracy.py    --demo   # top-1 / per-class recall / confusion
python eval/handoff_prf.py        --demo   # precision / recall / F1
python eval/trajectory_ade_fde.py --demo   # ADE / FDE
python eval/runtime_bench.py      --demo   # latency / fps / size
```

With real weights present in `backend/ml/weights/`, the same scripts (without `--demo`)
report measured numbers, and `runtime.demo_mode()` flips to `False` automatically.

---

*Maintainer:* Allen Xu · [GitHub repo](https://github.com/bobaoxu2001/Embodied-AI-Human-Motion-Handoff-Understanding) · License: MIT.

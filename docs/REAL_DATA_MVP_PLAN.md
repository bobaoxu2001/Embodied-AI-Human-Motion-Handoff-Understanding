# Real-data MVP plan

How this project moves from **demo-mode simulated inference** to a **measured, self-recorded
MVP** with trained baselines — honestly, in small steps.

## Where we are

- ✅ Demo mode: deterministic, simulated inference + simulated metrics (clearly labelled).
- ✅ Browser real pose: MediaPipe runs on an uploaded video, client-side (`/analyze`).
- ✅ Data tooling: capture UI (`/capture`), manifest/keypoints/split/validate scripts.
- ✅ Baseline training + eval that run on tiny data with **no torch** (`ml/baseline.py`).
- ⬜ A self-recorded dataset (not committed).
- ⬜ Measured metrics replacing the simulated placeholders.

The *Dataset* and *Model inspector* pages show this as a live **real-data readiness** panel.

## The path (6 steps)

1. **Collect clips** — `/capture` (webcam/upload, local) or record manually. Start with a
   **40–60 clip pilot** (≈6–8 per class) to debug the loop, then grow to **120–180**.
   Classes: `idle · walking · reaching · grasping · placing · pointing · handoff`.
   Details: [DATA_CAPTURE_WORKFLOW.md](DATA_CAPTURE_WORKFLOW.md).
2. **Manifest** — `create_dataset_manifest.py` indexes clips + parses `subject_id`.
3. **Extract keypoints** — `extract_keypoints.py` (MediaPipe if installed; synthetic
   fallback otherwise so the loop always runs).
4. **Split** — `split_dataset.py --by-subject` (no identity leakage).
5. **Train baselines** — `ml/train.py --model action|intent|trajectory`
   ([TRAINING_BASELINES.md](TRAINING_BASELINES.md)).
6. **Evaluate** — `eval/*.py --manifest .. --keypoints .. --weights ..` → **measured**
   action accuracy, handoff P/R/F1, trajectory ADE/FDE.

## Milestones

| Milestone | Clips | Goal |
|---|---|---|
| **Pilot** | 40–60 | loop runs end-to-end; sanity-check features/labels |
| **MVP** | 120–180 | baselines beat majority-class; report measured metrics |
| **Iterate** | 200+ / harder cases | robustness slices; consider the deep (torch) models |

## What flips from simulated → measured

| Surface | Now (demo) | After training |
|---|---|---|
| Action accuracy / confusion | simulated 84.5% | measured on the test split |
| Handoff P/R/F1 | simulated | measured at a chosen threshold |
| Trajectory ADE/FDE | simulated 52/96 mm | measured (norm; mm with calibration) |
| Inspector/README numbers | placeholders | replace with measured + the split size |

## Honesty rules (keep these)

- Keep the `DEMO MODE` markers until measured numbers exist.
- Call the baselines **baselines** (linear/heuristic), not state-of-the-art.
- The constant-velocity trajectory is a **heuristic**, labelled as such.
- Public datasets remain a **planned extension** — *"inspired by HOI4D/Ego4D-style tasks"*,
  not *"trained on"*. See [dataset_research.md](dataset_research.md).

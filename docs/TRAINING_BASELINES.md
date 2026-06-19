# Training baselines

Honest, small **baseline** models you can train on a tiny self-recorded set and evaluate
with **measured** metrics. Two backends:

- **baseline** (default) — pure standard library, **no torch/numpy**. Runs on tiny data
  and in CI. Linear/heuristic models over pooled keypoint features (`ml/baseline.py`).
- **torch** (`--backend torch`) — the deeper GRU/TCN models in `ml/models/` (needs
  `requirements-ml.txt`). Same commands, `--backend torch`.

`--backend auto` (default) uses torch if installed, else baseline.

## What each baseline is

| Model | Type | Input | Output | Honest label |
|---|---|---|---|---|
| **action** | softmax (multinomial logistic) regression | 74-d pooled per-clip keypoint features | 7 classes | linear baseline |
| **intent** | binary logistic regression | same features (incl. wrist-motion stats) | handoff vs non-handoff | linear baseline |
| **trajectory** | constant-velocity extrapolation | recent wrist history | next 30 steps | **heuristic** (not trained) |

Features (per clip): mean/std of the 17 body joints (x,y), wrist mean/max speed, path
length, net displacement, hand-presence ratio, hand spread. Standardized with train-set
mean/std stored in the checkpoint. Baseline checkpoints are **JSON** (portable; git-ignored
under `ml/weights/`).

## Train

```bash
cd backend && source .venv/bin/activate

python ml/train.py --model action  --manifest data/manifest.csv --keypoints data/keypoints \
    --out ml/weights/action_baseline.pt
python ml/train.py --model intent  --manifest data/manifest.csv --keypoints data/keypoints \
    --out ml/weights/intent_baseline.pt
python ml/train.py --model trajectory --manifest data/manifest.csv --keypoints data/keypoints \
    --out ml/weights/trajectory_baseline.pt
```

(The `.pt` name is conventional; baseline checkpoints are JSON inside. Use `--backend torch`
to produce real `state_dict` `.pt` files with the deep models.)

## Evaluate (measured)

```bash
python eval/action_accuracy.py    --manifest data/manifest.csv --keypoints data/keypoints \
    --weights ml/weights/action_baseline.pt --split test
python eval/handoff_prf.py        --manifest data/manifest.csv --keypoints data/keypoints \
    --weights ml/weights/intent_baseline.pt --split test
python eval/trajectory_ade_fde.py --manifest data/manifest.csv --keypoints data/keypoints --split test
```

Each prints **measured** numbers on the chosen split. (`--demo` still prints the simulated
placeholders for comparison.)

## Interpreting results (important, honest)

- **Tiny data + synthetic keypoints → poor/odd numbers.** Without MediaPipe, keypoints are
  label-agnostic, so action accuracy can be at chance and intent can read 100% accuracy
  simply because the split has no positives. This is expected — it proves the *loop* runs,
  not that the model works.
- **Sanity bar:** a useful baseline should beat the **majority-class** rate on a real,
  balanced test split. Report accuracy **and** per-class recall + the confusion matrix.
- **Trajectory** ADE/FDE are reported in **normalized** units; pass `--scale-mm <px→mm>`
  only if you have a real calibration — don't invent millimetres.
- **Subject split:** always evaluate on a **by-subject** test split so numbers reflect new
  people, not memorized appearance.

## Going deeper

Once the baseline beats majority class and you have ≥150 clips with real keypoints, try
`--backend torch` (GRU/TCN), then export ONNX (`ml/export_onnx.py`) to let the backend
serve real inference. See [ARCHITECTURE.md](ARCHITECTURE.md#going-from-demo--real-models).
Replace the simulated metrics in the UI/README with your measured numbers **and cite the
split size**.

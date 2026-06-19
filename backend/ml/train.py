#!/usr/bin/env python3
"""Train baseline (or deep) models on extracted keypoints.

Two backends:

* **baseline** (default, **no torch/numpy**, runs on tiny data and in CI):
  honest linear/heuristic baselines over pooled keypoint features
  (`ml/baseline.py`). Saves a JSON checkpoint.
* **torch** (`--backend torch`, needs `requirements-ml.txt`): the deeper GRU/TCN
  models in `ml/models/`. Saves a `state_dict` `.pt`.

`--backend auto` (default) picks torch if it's installed, else baseline.

Models: `action` (7-class), `intent` (handoff vs non-handoff), `trajectory`
(constant-velocity heuristic baseline / GRU under torch). `lifting` needs torch.

Usage:
    python ml/train.py --model action --manifest data/manifest.csv \\
        --keypoints data/keypoints --out ml/weights/action_baseline.pt
    python ml/train.py --model intent --manifest data/manifest.csv \\
        --keypoints data/keypoints --out ml/weights/intent_baseline.pt
    python ml/train.py --model action --backend torch --epochs 60   # deep model
"""

import argparse
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent


def _torch_available() -> bool:
    import importlib.util

    return importlib.util.find_spec("torch") is not None


def _resolve_out(out: str, model: str, ext: str) -> Path:
    p = Path(out)
    if p.suffix in (".pt", ".pth", ".json"):
        return p
    return p / f"{model}_baseline{ext}"


# --------------------------------------------------------------------------- #
# baseline backend (stdlib only)
# --------------------------------------------------------------------------- #
def run_baseline(args) -> None:
    sys.path.insert(0, str(BACKEND))
    from ml import baseline as B

    rows = B.read_manifest(BACKEND / args.manifest)
    kp = BACKEND / args.keypoints
    train_rows = B.rows_for_split(rows, "train")
    out = _resolve_out(args.out, args.model, ".json")
    note = ("  note: baseline checkpoints are JSON (portable, no torch). Evaluate with "
            "the matching eval/ script using --weights " + str(out))

    if args.model == "trajectory":
        seqs = B.trajectory_sequences(train_rows, kp)
        B.save_ckpt({"backend": "baseline", "model": "trajectory",
                     "kind": "constant_velocity", "t_in": 10, "horizon": 30,
                     "n_windows": len(seqs)}, out)
        print("[baseline] trajectory = constant-velocity HEURISTIC (no training).")
        print(f"  windows (train): {len(seqs)}\n  saved {out}")
        return

    if args.model == "lifting":
        X, Y = B.build_lifting_dataset(train_rows, kp)
        if len(X) < 2:
            raise SystemExit(
                "lifting: no frames with 3D targets (`body_3d`) found. Provide H3WB / "
                "Human3.6M-style 3D annotations (see docs/PUBLIC_DATASET_ADAPTERS.md), "
                "or use --backend torch. No fake targets are used."
            )
        ckpt = B.train_lifting(X, Y, epochs=(200 if args.epochs == 300 else args.epochs))
        B.save_ckpt(ckpt, out)
        print("[baseline] lifting = linear 2D->3D regression")
        print(f"  frames: {len(X)}   in={ckpt['in_dim']} out={ckpt['out_dim']}\n  saved {out}")
        print(note)
        return

    if args.model == "action":
        feats, labels, ids = B.build_clip_dataset(train_rows, kp)
        if len(feats) < 2:
            raise SystemExit(
                f"action: need ≥2 labelled clips with keypoints (got {len(feats)}). "
                "Prepare a dataset + extract keypoints first."
            )
        ckpt = B.train_action(feats, labels, epochs=args.epochs, lr=args.lr)
        print(f"[baseline] action = softmax regression over {len(feats[0])} pooled feats")
        print(f"  clips: {len(feats)}   classes present: {sorted(set(labels))}")
        print(f"  train top-1 accuracy: {ckpt['train_acc'] * 100:.1f}%\n  saved {out}")
        B.save_ckpt(ckpt, out)
        print(note)
        return

    # intent
    feats, y, ids = B.build_intent_dataset(train_rows, kp)
    if len(feats) < 2 or len(set(y)) < 2:
        raise SystemExit(
            f"intent: need ≥2 clips of BOTH classes with keypoints (got {len(feats)} "
            f"clips, classes={sorted(set(y))}). Handover datasets (HOH/H2O) supply "
            "positives; pair them with non-handover negatives — see "
            "docs/PUBLIC_DATASET_ADAPTERS.md. No fake labels are used."
        )
    ckpt = B.train_intent(feats, y, epochs=args.epochs, lr=args.lr)
    print("[baseline] intent = logistic regression (handoff vs non_handoff)")
    print(f"  clips: {len(feats)}   positives: {sum(y)}   negatives: {len(y) - sum(y)}")
    B.save_ckpt(ckpt, out)
    print(f"  saved {out}\n{note}")


# --------------------------------------------------------------------------- #
# torch backend (deep models) — only used with --backend torch
# --------------------------------------------------------------------------- #
def run_torch(args) -> None:
    import csv
    import json

    import torch
    from torch import nn

    sys.path.insert(0, str(BACKEND))
    from ml.models import build_action, build_intent, build_lifting, build_trajectory

    ACTIONS = ["idle", "walking", "reaching", "grasping", "placing", "pointing", "handoff"]

    def manifest(path):
        with open(path, newline="") as f:
            return list(csv.DictReader(f))

    def frames(clip_id):
        p = BACKEND / args.keypoints / f"{clip_id}.json"
        return json.load(open(p))["frames"] if p.exists() else None

    def feat51(fr):
        return [c for kp in fr["body"] for c in kp[:3]]

    def wrist(fr):
        return fr["body"][10][:2]

    rows = manifest(BACKEND / args.manifest)
    tr = [r for r in rows if r.get("split") == "train"] or rows

    if args.model == "action":
        X, Y, win, step = [], [], 27, 8
        for r in tr:
            fr = frames(r["clip_id"])
            if not fr or r["label"] not in ACTIONS:
                continue
            f = [feat51(x) for x in fr]
            for i in range(0, len(f) - win, step):
                X.append(f[i:i + win]); Y.append(ACTIONS.index(r["label"]))
        if not X:
            raise SystemExit("action(torch): no windows — check data.")
        model = build_action(n_actions=len(ACTIONS))
        Xt, Yt = torch.tensor(X).float(), torch.tensor(Y).long()
        loss_fn = nn.CrossEntropyLoss()
    elif args.model == "trajectory":
        X, Y, t_in, hor, step = [], [], 10, 30, 5
        for r in tr:
            fr = frames(r["clip_id"])
            if not fr:
                continue
            tk = [wrist(x) for x in fr]
            for i in range(0, len(tk) - t_in - hor, step):
                X.append(tk[i:i + t_in]); Y.append(tk[i + t_in:i + t_in + hor])
        if not X:
            raise SystemExit("trajectory(torch): no windows — check data.")
        model = build_trajectory()
        Xt, Yt = torch.tensor(X).float(), torch.tensor(Y).float()
        loss_fn = nn.L1Loss()
    else:
        raise SystemExit(f"{args.model}(torch): not wired here; use --backend baseline "
                         "or extend run_torch (lifting/intent need extra labels).")

    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    for ep in range(1, args.epochs + 1):
        model.train(); opt.zero_grad()
        loss = loss_fn(model(Xt), Yt); loss.backward(); opt.step()
        if ep % max(1, args.epochs // 5) == 0:
            print(f"epoch {ep:3d}  loss {loss.item():.4f}")
    out = _resolve_out(args.out, args.model, ".pt")
    out.parent.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), out)
    print(f"[torch] saved {out}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--model", required=True,
                    choices=["action", "intent", "trajectory", "lifting"])
    ap.add_argument("--manifest", default="data/manifest.csv")
    ap.add_argument("--keypoints", default="data/keypoints")
    ap.add_argument("--out", default="ml/weights")
    ap.add_argument("--backend", choices=["auto", "baseline", "torch"], default="auto")
    ap.add_argument("--epochs", type=int, default=300)
    ap.add_argument("--lr", type=float, default=0.5)
    args = ap.parse_args()

    backend = args.backend
    if backend == "auto":
        backend = "torch" if _torch_available() else "baseline"

    if backend == "torch":
        if not _torch_available():
            raise SystemExit("--backend torch but torch isn't installed "
                             "(pip install -r requirements-ml.txt).")
        if args.epochs == 300:  # default was tuned for the baseline; deep wants fewer
            args.epochs = 60
        run_torch(args)
    else:
        run_baseline(args)


if __name__ == "__main__":
    main()

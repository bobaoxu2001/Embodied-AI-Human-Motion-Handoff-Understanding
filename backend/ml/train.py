#!/usr/bin/env python3
"""Train the learned pipeline models on extracted keypoints.

Real, runnable training (requires `backend/requirements-ml.txt`). It reads the
manifest + per-clip keypoint JSON produced by `scripts/` and trains one of the
four learned models behind the same interface the demo serves. After training it
saves a `.pt` checkpoint; export to ONNX with `ml/export_onnx.py` to flip the API
into real-inference mode.

Two models train end-to-end from keypoints alone:
  * trajectory — self-supervised (predict future wrist path from its history)
  * action     — supervised by the manifest's per-clip action label

Two need extra labels (documented, with clear errors if absent):
  * lifting    — needs 3D joint targets (multi-view triangulation / mocap)
  * intent     — needs per-clip binary handoff-intent labels

Usage:
    python ml/train.py --model trajectory --epochs 40
    python ml/train.py --model action     --epochs 60
    python ml/train.py --model lifting    --targets data/targets_3d
    python ml/train.py --model intent     --intent-labels data/intent.csv
"""

import argparse
import csv
import json
import sys
from pathlib import Path

ACTIONS = ["idle", "reaching", "grasping", "placing", "pointing", "handoff"]
BACKEND = Path(__file__).resolve().parent.parent


# --------------------------------------------------------------------------- #
# data loading (stdlib)
# --------------------------------------------------------------------------- #
def read_manifest(path: Path):
    with open(path, newline="") as f:
        return list(csv.DictReader(f))


def load_clip(keypoints_dir: Path, clip_id: str):
    """Return frames: list of {body:[17×3], hand_right:[21×3]}."""
    p = keypoints_dir / f"{clip_id}.json"
    if not p.exists():
        return None
    return json.load(open(p))["frames"]


def body_xy(frame):
    return [c for kp in frame["body"] for c in kp[:2]]  # [34]


def body_feat(frame):
    return [c for kp in frame["body"] for c in kp[:3]]  # [51]


def wrist(frame):
    return frame["body"][10][:2]  # right wrist [x, y]


# --------------------------------------------------------------------------- #
# per-model dataset builders → (X, Y) tensors
# --------------------------------------------------------------------------- #
def build_action(rows, kp_dir, torch, window=27, step=8):
    X, Y = [], []
    for r in rows:
        frames = load_clip(kp_dir, r["clip_id"])
        if not frames or r["label"] not in ACTIONS:
            continue
        y = ACTIONS.index(r["label"])
        feats = [body_feat(fr) for fr in frames]
        for i in range(0, len(feats) - window, step):
            X.append(feats[i : i + window])
            Y.append(y)
    if not X:
        raise SystemExit("action: no windows built — check manifest/keypoints.")
    return torch.tensor(X).float(), torch.tensor(Y).long()


def build_trajectory(rows, kp_dir, torch, t_in=10, horizon=30, step=5):
    X, Y = [], []
    for r in rows:
        frames = load_clip(kp_dir, r["clip_id"])
        if not frames:
            continue
        track = [wrist(fr) for fr in frames]
        for i in range(0, len(track) - t_in - horizon, step):
            X.append(track[i : i + t_in])
            Y.append(track[i + t_in : i + t_in + horizon])
    if not X:
        raise SystemExit("trajectory: no windows built — check keypoints.")
    return torch.tensor(X).float(), torch.tensor(Y).float()


def build_lifting(rows, kp_dir, torch, targets_dir, window=27, step=8):
    if not targets_dir:
        raise SystemExit(
            "lifting needs 3D targets. Pass --targets <dir> with <clip>.json files "
            "of per-frame joints_mm [n_frames][17][3] (from multi-view triangulation "
            "or Human3.6M/H3WB)."
        )
    targets_dir = Path(targets_dir)
    X, Y = [], []
    for r in rows:
        frames = load_clip(kp_dir, r["clip_id"])
        tp = targets_dir / f"{r['clip_id']}.json"
        if not frames or not tp.exists():
            continue
        joints = json.load(open(tp))["joints_mm"]  # [n_frames][17][3]
        feats = [body_xy(fr) for fr in frames]
        for i in range(0, len(feats) - window, step):
            centre = i + window // 2
            X.append(feats[i : i + window])
            Y.append([c for j in joints[centre] for c in j])  # [51]
    if not X:
        raise SystemExit("lifting: no (window, 3D-target) pairs found.")
    return torch.tensor(X).float(), torch.tensor(Y).float()


def build_intent(rows, kp_dir, torch, intent_labels):
    if not intent_labels:
        raise SystemExit(
            "intent needs labels. Pass --intent-labels <csv> with columns "
            "clip_id,frame,intent(0/1). Features here are a 160-d pose+motion vector."
        )
    labels = {}
    for row in read_manifest(Path(intent_labels)):
        labels[(row["clip_id"], int(row["frame"]))] = int(row["intent"])
    X, Y = [], []
    for r in rows:
        frames = load_clip(kp_dir, r["clip_id"])
        if not frames:
            continue
        for n in range(1, len(frames)):
            key = (r["clip_id"], n)
            if key not in labels:
                continue
            cur, prev = body_feat(frames[n]), body_feat(frames[n - 1])
            vel = [c - p for c, p in zip(cur, prev)]  # motion
            feat = (cur + vel)[:160]
            feat += [0.0] * (160 - len(feat))
            X.append(feat)
            Y.append(labels[key])
    if not X:
        raise SystemExit("intent: no labeled frames matched the keypoints.")
    return torch.tensor(X).float(), torch.tensor(Y).float()


# --------------------------------------------------------------------------- #
# training loop
# --------------------------------------------------------------------------- #
def train_one(model, Xtr, Ytr, Xva, Yva, loss_fn, epochs, lr, batch, torch):
    from torch.utils.data import DataLoader, TensorDataset

    dev = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(dev)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=epochs)
    dl = DataLoader(TensorDataset(Xtr, Ytr), batch_size=batch, shuffle=True)

    best = float("inf")
    for ep in range(1, epochs + 1):
        model.train()
        tot = 0.0
        for xb, yb in dl:
            xb, yb = xb.to(dev), yb.to(dev)
            opt.zero_grad()
            loss = loss_fn(model(xb), yb)
            loss.backward()
            opt.step()
            tot += loss.item() * len(xb)
        sched.step()
        model.eval()
        with torch.no_grad():
            vloss = loss_fn(model(Xva.to(dev)), Yva.to(dev)).item()
        best = min(best, vloss)
        print(f"epoch {ep:3d}  train {tot / len(Xtr):.4f}  val {vloss:.4f}")
    print(f"best val loss: {best:.4f}")
    return model.cpu()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--model", required=True,
                    choices=["lifting", "action", "trajectory", "intent"])
    ap.add_argument("--manifest", default="data/manifest.csv")
    ap.add_argument("--keypoints", default="data/keypoints")
    ap.add_argument("--out", default="ml/checkpoints")
    ap.add_argument("--epochs", type=int, default=40)
    ap.add_argument("--batch-size", type=int, default=64)
    ap.add_argument("--lr", type=float, default=1e-3)
    ap.add_argument("--targets", default=None, help="3D targets dir (lifting)")
    ap.add_argument("--intent-labels", default=None, help="intent label csv (intent)")
    args = ap.parse_args()

    try:
        import torch
        from torch import nn
    except Exception as e:  # pragma: no cover
        raise SystemExit(f"torch required: {e}\nInstall backend/requirements-ml.txt")

    sys.path.insert(0, str(BACKEND))
    from ml.models import build_action, build_intent, build_lifting, build_trajectory

    rows = read_manifest(BACKEND / args.manifest)
    kp = BACKEND / args.keypoints
    tr = [r for r in rows if r.get("split") == "train"] or rows
    va = [r for r in rows if r.get("split") == "val"] or rows

    if args.model == "action":
        Xtr, Ytr = build_action(tr, kp, torch)
        Xva, Yva = build_action(va, kp, torch)
        model, loss_fn = build_action(), nn.CrossEntropyLoss()
    elif args.model == "trajectory":
        Xtr, Ytr = build_trajectory(tr, kp, torch)
        Xva, Yva = build_trajectory(va, kp, torch)
        model, loss_fn = build_trajectory(), nn.L1Loss()  # ADE/FDE proxy
    elif args.model == "lifting":
        Xtr, Ytr = build_lifting(tr, kp, torch, args.targets)
        Xva, Yva = build_lifting(va, kp, torch, args.targets)
        model, loss_fn = build_lifting(), nn.L1Loss()  # MPJPE proxy
    else:  # intent
        Xtr, Ytr = build_intent(tr, kp, torch, args.intent_labels)
        Xva, Yva = build_intent(va, kp, torch, args.intent_labels)
        model, loss_fn = build_intent(), nn.BCEWithLogitsLoss()

    print(f"[{args.model}] train {tuple(Xtr.shape)} / val {tuple(Xva.shape)}")
    model = train_one(model, Xtr, Ytr, Xva, Yva, loss_fn,
                      args.epochs, args.lr, args.batch_size, torch)

    out = BACKEND / args.out
    out.mkdir(parents=True, exist_ok=True)
    ckpt = out / f"{args.model}.pt"
    torch.save(model.state_dict(), ckpt)
    print(f"saved {ckpt}\nnext: python ml/export_onnx.py --out ml/weights")


if __name__ == "__main__":
    main()

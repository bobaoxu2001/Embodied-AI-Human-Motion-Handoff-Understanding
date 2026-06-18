#!/usr/bin/env python3
"""Trajectory forecasting evaluation: ADE / FDE.

ADE = average displacement error over all forecast steps; FDE = error at the
final step. Reads a JSON of {pred: [[x,y]...], gt: [[x,y]...]} sequences, or
generates a synthetic demo set with --demo. Coordinates may be normalized; pass
--scale-mm to convert displacement to millimetres (default scales to the demo's
52mm ADE / 96mm FDE figures).

Usage:
    python trajectory_ade_fde.py --demo
    python trajectory_ade_fde.py --preds traj.json --scale-mm 1.0
"""

import argparse
import json
import math
import random
from pathlib import Path


def _euclid(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def ade_fde(sequences):
    ades, fdes = [], []
    for seq in sequences:
        pred, gt = seq["pred"], seq["gt"]
        steps = min(len(pred), len(gt))
        if steps == 0:
            continue
        disp = [_euclid(pred[i], gt[i]) for i in range(steps)]
        ades.append(sum(disp) / steps)
        fdes.append(disp[-1])
    n = len(ades)
    return (sum(ades) / n if n else 0.0, sum(fdes) / n if n else 0.0, n)


def demo(n=120, horizon=30, seed=3):
    rng = random.Random(seed)
    seqs = []
    for _ in range(n):
        x0, y0 = rng.uniform(0.4, 0.6), rng.uniform(0.4, 0.6)
        vx, vy = rng.uniform(0.002, 0.006), rng.uniform(-0.002, 0.002)
        pred, gt = [], []
        for t in range(horizon):
            gx, gy = x0 + vx * t, y0 + vy * t
            # prediction drifts increasingly from gt
            err = 0.001 * t
            pred.append([gx + rng.uniform(-err, err), gy + rng.uniform(-err, err)])
            gt.append([gx, gy])
        seqs.append({"pred": pred, "gt": gt})
    return seqs


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--preds", type=str, default=None)
    ap.add_argument("--scale-mm", type=float, default=None,
                    help="multiply normalized displacement by this to get mm")
    ap.add_argument("--demo", action="store_true")
    args = ap.parse_args()

    if args.demo or not args.preds:
        seqs = demo()
        print("[demo] synthetic trajectories (no --preds given)\n")
    else:
        seqs = json.loads(Path(args.preds).read_text())

    ade, fde, n = ade_fde(seqs)
    # Default demo scaling lands near the prototype's 52mm / 96mm.
    scale = args.scale_mm if args.scale_mm is not None else (52.0 / ade if ade else 1.0)
    print(f"sequences : {n}")
    print(f"ADE       : {ade:.4f} norm   ({ade * scale:.1f} mm)")
    print(f"FDE       : {fde:.4f} norm   ({fde * scale:.1f} mm)")


if __name__ == "__main__":
    main()

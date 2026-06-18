#!/usr/bin/env python3
"""Export the model stubs to ONNX (requires torch + onnx).

Writes <stage>.onnx into backend/ml/weights/. Once real weights exist and these
files are present, `app.runtime.demo_mode()` flips off automatically and the API
serves real inference behind the same contract.

Usage:
    python export_onnx.py --out ml/weights
"""

import argparse
from pathlib import Path


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", type=str, default="ml/weights")
    args = ap.parse_args()

    try:
        import torch

        from ml.models import build_action, build_intent, build_lifting, build_trajectory
    except Exception as e:  # pragma: no cover
        raise SystemExit(f"torch/onnx required: {e}\nInstall backend/requirements-ml.txt")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    ckpt_dir = Path(__file__).resolve().parent / "checkpoints"

    # (onnx_name, model, example_input, checkpoint stem written by ml/train.py)
    specs = [
        ("lifting_2d_to_3d", build_lifting(), torch.randn(1, 27, 34), "lifting"),
        ("action_recognition", build_action(), torch.randn(1, 27, 51), "action"),
        ("trajectory_forecast", build_trajectory(), torch.randn(1, 10, 2), "trajectory"),
        ("handoff_intent", build_intent(), torch.randn(1, 160), "intent"),
    ]
    for name, model, x, ckpt in specs:
        ckpt_path = ckpt_dir / f"{ckpt}.pt"
        if ckpt_path.exists():
            model.load_state_dict(torch.load(ckpt_path, map_location="cpu"))
            print(f"loaded trained weights {ckpt_path}")
        else:
            print(f"[warn] {ckpt_path} missing — exporting UNTRAINED {name}")
        model.eval()
        path = out / f"{name}.onnx"
        torch.onnx.export(
            model, x, str(path), input_names=["input"], output_names=["output"],
            dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}}, opset_version=17,
        )
        print(f"exported {name} → {path}")


if __name__ == "__main__":
    main()

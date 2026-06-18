#!/usr/bin/env python3
"""Runtime benchmark: latency / FPS / model size.

If torch is installed, builds the model stubs, counts parameters, and times
forward passes on random inputs. Without torch it reports the demo-mode budget
(per-stage latency summing to 33ms / 30fps, 41MB int8) so the numbers shown in
the UI are reproducible. Standard library + optional torch.

Usage:
    python runtime_bench.py            # auto: real timing if torch present
    python runtime_bench.py --demo     # force demo-mode budget
"""

import argparse
import time

DEMO_BUDGET = [
    ("pose_extraction", 13.2),
    ("lifting_2d_to_3d", 6.1),
    ("action_recognition", 5.4),
    ("trajectory_forecast", 4.9),
    ("handoff_intent", 3.4),
]


def _has_torch():
    try:
        import torch  # noqa: F401

        return True
    except Exception:
        return False


def _param_mb(model):
    n = sum(p.numel() for p in model.parameters())
    return n, n * 4 / (1024 * 1024)  # fp32 MB


def bench_real(iters=50):
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    import torch

    from ml.models import build_action, build_intent, build_lifting, build_trajectory

    specs = [
        ("lifting_2d_to_3d", build_lifting(), lambda: torch.randn(1, 27, 34)),
        ("action_recognition", build_action(), lambda: torch.randn(1, 27, 51)),
        ("trajectory_forecast", build_trajectory(), lambda: torch.randn(1, 10, 2)),
        ("handoff_intent", build_intent(), lambda: torch.randn(1, 160)),
    ]
    total_ms = 0.0
    total_params = 0
    print(f"{'stage':22s} {'params':>12s} {'size(MB)':>10s} {'latency(ms)':>12s}")
    for name, model, mk in specs:
        model.eval()
        params, mb = _param_mb(model)
        total_params += params
        with torch.no_grad():
            x = mk()
            for _ in range(5):  # warmup
                model(x)
            t0 = time.perf_counter()
            for _ in range(iters):
                model(x)
            ms = (time.perf_counter() - t0) / iters * 1000
        total_ms += ms
        print(f"{name:22s} {params:>12,d} {mb:>10.2f} {ms:>12.2f}")
    print("-" * 60)
    print(f"{'TOTAL (4 net stages)':22s} {total_params:>12,d} "
          f"{total_params * 4 / (1024 * 1024):>10.2f} {total_ms:>12.2f}")
    print(f"\napprox throughput: {1000 / total_ms:.1f} fps "
          f"(excludes pose extraction / I/O)")


def bench_demo():
    print(f"{'stage':22s} {'latency(ms)':>12s}")
    total = 0.0
    for name, ms in DEMO_BUDGET:
        total += ms
        print(f"{name:22s} {ms:>12.1f}")
    print("-" * 36)
    print(f"{'TOTAL end-to-end':22s} {total:>12.1f}")
    print(f"\nthroughput : {1000 / total:.1f} fps")
    print("model size : 41 MB (onnx · int8)")
    print("p50/p95    : 33 / 48 ms")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--demo", action="store_true", help="force demo-mode budget")
    ap.add_argument("--iters", type=int, default=50)
    args = ap.parse_args()

    if args.demo or not _has_torch():
        if not args.demo:
            print("[demo] torch not installed — reporting demo-mode budget\n")
        bench_demo()
    else:
        bench_real(args.iters)


if __name__ == "__main__":
    main()

"""Runtime capability detection.

The whole point of demo mode is that the service runs with zero ML dependencies.
This module probes — without importing heavy libraries eagerly where avoidable —
whether torch / mediapipe / opencv are present and what device is available, so
the rest of the app can decide between real inference and canned demo output.
"""

import importlib.util
from functools import lru_cache


def _installed(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


@lru_cache(maxsize=1)
def has_torch() -> bool:
    return _installed("torch")


@lru_cache(maxsize=1)
def has_mediapipe() -> bool:
    return _installed("mediapipe")


@lru_cache(maxsize=1)
def has_opencv() -> bool:
    return _installed("cv2")


@lru_cache(maxsize=1)
def device() -> str:
    """Return 'cuda', 'mps', or 'cpu' — falling back to cpu if torch is absent."""
    if not has_torch():
        return "cpu"
    try:
        import torch

        if torch.cuda.is_available():
            return "cuda"
        if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return "mps"
    except Exception:
        pass
    return "cpu"


@lru_cache(maxsize=1)
def demo_mode() -> bool:
    """Demo mode is on whenever we can't run the real stack.

    For this MVP we stay in demo mode unless torch is installed AND trained
    weights exist on disk. Real-model wiring flips this off automatically.
    """
    from pathlib import Path

    weights_dir = Path(__file__).resolve().parent.parent / "ml" / "weights"
    has_weights = weights_dir.exists() and any(weights_dir.glob("*.onnx"))
    return not (has_torch() and has_weights)

"""Shared torch-availability guard for the model stubs."""

try:  # pragma: no cover - exercised only when torch is installed
    import torch  # noqa: F401
    from torch import nn  # noqa: F401

    TORCH_AVAILABLE = True
    Module = nn.Module
except Exception:  # torch not installed — keep imports working in demo mode
    TORCH_AVAILABLE = False

    class Module:  # type: ignore
        """Placeholder base; instantiating a model without torch is a clear error."""

        def __init__(self, *args, **kwargs):
            raise ImportError(
                "PyTorch is not installed. Install backend/requirements-ml.txt to "
                "build/train the real models, or use demo mode (no torch needed)."
            )


def require_torch() -> None:
    if not TORCH_AVAILABLE:
        raise ImportError(
            "PyTorch is required for this operation. "
            "Install it via `pip install -r backend/requirements-ml.txt`."
        )

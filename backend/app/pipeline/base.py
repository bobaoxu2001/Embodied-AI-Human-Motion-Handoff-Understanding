"""Stage interface shared by every pipeline component.

Each stage runs in one of two modes:

- **demo** (default): `run()` returns the deterministic demo output passed in, so
  the service produces a valid `InferenceResult` with zero ML dependencies.
- **real**: `run()` executes the exported ONNX graph for the stage via
  onnxruntime. Heavy imports (onnxruntime / numpy) live *inside* the methods so
  importing this module never pulls them in — demo mode stays dependency-free.

A stage flips to real mode when it is constructed with `demo=False` and a matching
`<onnx_name>.onnx` file exists under `backend/ml/weights/` (produced by
`ml/export_onnx.py`). `app.runtime.demo_mode()` decides this globally.
"""

from pathlib import Path
from typing import Any, Optional

DEFAULT_WEIGHTS_DIR = Path(__file__).resolve().parent.parent.parent / "ml" / "weights"


class Stage:
    """A single pipeline stage with an ONNX real path and a demo fallback."""

    name: str = "stage"
    model_name: str = "demo"
    onnx_name: Optional[str] = None  # weight file stem under ml/weights/

    def __init__(self, demo: bool = True, weights_dir: Optional[str] = None):
        self.demo = demo
        self.weights_dir = Path(weights_dir) if weights_dir else DEFAULT_WEIGHTS_DIR
        self._session: Any = None  # lazily-loaded onnxruntime InferenceSession

    # -- real inference -----------------------------------------------------
    def weights_path(self) -> Optional[Path]:
        if not self.onnx_name:
            return None
        return self.weights_dir / f"{self.onnx_name}.onnx"

    def load(self) -> None:
        """Lazily build the onnxruntime session. No-op in demo mode."""
        if self.demo or self._session is not None:
            return
        self._session = self._build_session()

    def _build_session(self) -> Any:
        import onnxruntime as ort  # imported only on the real path

        path = self.weights_path()
        if path is None:
            raise NotImplementedError(
                f"{self.name}: no onnx_name set — this stage has no ONNX graph "
                "(e.g. pose extraction uses a keypoint detector, not ONNX here)."
            )
        if not path.exists():
            raise FileNotFoundError(
                f"{self.name}: weights not found at {path}. Train and export first "
                "(ml/train.py → ml/export_onnx.py), or run in demo mode."
            )
        providers = ort.get_available_providers()
        return ort.InferenceSession(str(path), providers=providers)

    def _run_real(self, x: Any) -> Any:
        """Run the ONNX graph on a single input array → output array."""
        import numpy as np

        if self._session is None:
            self.load()
        inp = self._session.get_inputs()[0].name
        out = self._session.run(None, {inp: np.asarray(x, dtype=np.float32)})
        return out[0]

    # -- dispatch -----------------------------------------------------------
    def run(self, demo_output: Any, *args: Any, **kwargs: Any) -> Any:
        if self.demo:
            return demo_output
        return self._run_real(*args, **kwargs)

"""Stage interface shared by every pipeline component."""

from typing import Any, Optional


class Stage:
    """A single pipeline stage with a demo-mode fallback.

    Subclasses set `name`/`model_name` and implement `_run_real`. Until a real
    model + weights are wired up, `run` returns demo output supplied by the
    caller, keeping the API contract stable.
    """

    name: str = "stage"
    model_name: str = "demo"

    def __init__(self, demo: bool = True, weights: Optional[str] = None):
        self.demo = demo
        self.weights = weights
        self._model = None  # lazily loaded real model

    def load(self) -> None:
        """Lazily load the real model. No-op in demo mode."""
        if self.demo:
            return
        self._model = self._build_model()

    def _build_model(self) -> Any:  # pragma: no cover - real models not shipped
        raise NotImplementedError(
            f"{self.name}: real model loading is not implemented in this MVP. "
            "Run in demo mode or provide weights and implement _build_model()."
        )

    def _run_real(self, *args: Any, **kwargs: Any) -> Any:  # pragma: no cover
        raise NotImplementedError(f"{self.name}: real inference not implemented.")

    def run(self, demo_output: Any, *args: Any, **kwargs: Any) -> Any:
        if self.demo:
            return demo_output
        if self._model is None:
            self.load()
        return self._run_real(*args, **kwargs)

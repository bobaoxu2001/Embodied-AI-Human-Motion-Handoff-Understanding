"""Handoff intent classification (fusion MLP head).

Input:  fused pose + motion + action features, shape [B, F].
Output: a single logit → sigmoid → P(handoff intent). Stage 05 in the graph.

This is the decision head that turns perception into a robot-actionable signal.
Stub only.
"""

from ._torch_guard import TORCH_AVAILABLE, Module, require_torch


class IntentMLP(Module):
    def __init__(self, in_dim: int = 160, hidden: int = 128, dropout: float = 0.2):
        super().__init__()
        require_torch()
        from torch import nn

        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden, hidden // 2),
            nn.ReLU(),
            nn.Linear(hidden // 2, 1),
        )

    def forward(self, feats):  # feats: [B, F]
        return self.net(feats).squeeze(-1)  # [B] logits

    def predict_proba(self, feats):
        import torch

        return torch.sigmoid(self.forward(feats))


def build_intent(**kwargs) -> "IntentMLP":
    if not TORCH_AVAILABLE:
        raise ImportError("PyTorch required to build IntentMLP.")
    return IntentMLP(**kwargs)

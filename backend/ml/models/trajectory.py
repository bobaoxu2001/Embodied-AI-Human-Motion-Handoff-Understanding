"""Hand trajectory forecasting (seq2seq GRU).

Input:  wrist position history, shape [B, T_in, 2].
Output: forecast of the next H steps, shape [B, H, 2] (≈1.0s of future hand path).

Stage 04 in the architecture graph. An encoder GRU summarizes the history; a
decoder GRU rolls out future positions autoregressively. Stub only.
"""

from ._torch_guard import TORCH_AVAILABLE, Module, require_torch

HORIZON = 30  # 30 steps @ 30fps = 1.0s


class TrajectoryGRU(Module):
    def __init__(self, in_dim: int = 2, hidden: int = 128, horizon: int = HORIZON):
        super().__init__()
        require_torch()
        from torch import nn

        self.horizon = horizon
        self.encoder = nn.GRU(in_dim, hidden, batch_first=True)
        self.decoder = nn.GRUCell(in_dim, hidden)
        self.out = nn.Linear(hidden, in_dim)

    def forward(self, history):  # history: [B, T_in, 2]
        _, h = self.encoder(history)  # h: [1, B, H]
        h = h.squeeze(0)
        step = history[:, -1]  # last observed position
        outs = []
        for _ in range(self.horizon):
            h = self.decoder(step, h)
            step = self.out(h)
            outs.append(step)
        import torch

        return torch.stack(outs, dim=1)  # [B, H, 2]


def build_trajectory(**kwargs) -> "TrajectoryGRU":
    if not TORCH_AVAILABLE:
        raise ImportError("PyTorch required to build TrajectoryGRU.")
    return TrajectoryGRU(**kwargs)

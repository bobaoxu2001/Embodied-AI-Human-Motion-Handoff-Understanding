"""Action recognition (causal Pose-TCN).

Input:  a window of 3D pose features, shape [B, T, F].
Output: logits over 6 actions [B, 6] (idle/reaching/grasping/placing/pointing/handoff).

Stage 03 in the architecture graph. Causal dilated 1D convolutions give a
streaming-friendly temporal receptive field. Stub only.
"""

from ._torch_guard import TORCH_AVAILABLE, Module, require_torch

N_ACTIONS = 6


class _CausalBlock(Module):
    def __init__(self, ch: int, dilation: int):
        super().__init__()
        require_torch()
        from torch import nn

        self.pad = (3 - 1) * dilation
        self.conv = nn.Conv1d(ch, ch, kernel_size=3, dilation=dilation)
        self.norm = nn.BatchNorm1d(ch)
        self.act = nn.ReLU()

    def forward(self, x):  # x: [B, C, T]
        import torch.nn.functional as F

        y = F.pad(x, (self.pad, 0))  # left-pad → causal
        y = self.act(self.norm(self.conv(y)))
        return x + y


class ActionTCN(Module):
    def __init__(self, in_dim: int = 51, ch: int = 128, n_actions: int = N_ACTIONS,
                 dilations=(1, 2, 4, 8)):
        super().__init__()
        require_torch()
        from torch import nn

        self.proj = nn.Conv1d(in_dim, ch, kernel_size=1)
        self.blocks = nn.ModuleList([_CausalBlock(ch, d) for d in dilations])
        self.head = nn.Linear(ch, n_actions)

    def forward(self, x):  # x: [B, T, F]
        h = self.proj(x.transpose(1, 2))  # [B, C, T]
        for blk in self.blocks:
            h = blk(h)
        return self.head(h[:, :, -1])  # last (current) timestep → [B, n_actions]


def build_action(**kwargs) -> "ActionTCN":
    if not TORCH_AVAILABLE:
        raise ImportError("PyTorch required to build ActionTCN.")
    return ActionTCN(**kwargs)

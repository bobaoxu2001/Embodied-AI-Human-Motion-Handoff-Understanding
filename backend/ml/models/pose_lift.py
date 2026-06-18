"""2D→3D pose lifting (temporal lifting transformer).

Input:  a window of T frames of 2D keypoints, shape [B, T, J*2].
Output: root-relative 3D joints for the centre frame, shape [B, J*3] (mm).

Stage 02 in the architecture graph. Stub only — wire weights + training to use.
"""

from ._torch_guard import TORCH_AVAILABLE, Module, require_torch

N_JOINTS = 17


class PoseLiftingNet(Module):
    def __init__(self, n_joints: int = N_JOINTS, window: int = 27, d_model: int = 256,
                 n_heads: int = 8, n_layers: int = 4):
        super().__init__()
        require_torch()
        import torch
        from torch import nn

        self.n_joints = n_joints
        self.window = window
        self.input_proj = nn.Linear(n_joints * 2, d_model)
        self.pos = nn.Parameter(torch.zeros(1, window, d_model))
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model, nhead=n_heads, dim_feedforward=d_model * 4,
            batch_first=True, activation="gelu",
        )
        self.encoder = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)
        self.head = nn.Linear(d_model, n_joints * 3)

    def forward(self, x):  # x: [B, T, J*2]
        h = self.input_proj(x) + self.pos[:, : x.shape[1]]
        h = self.encoder(h)
        centre = h[:, h.shape[1] // 2]  # centre-frame token
        return self.head(centre)  # [B, J*3]


def build_lifting(**kwargs) -> "PoseLiftingNet":
    if not TORCH_AVAILABLE:
        raise ImportError("PyTorch required to build PoseLiftingNet.")
    return PoseLiftingNet(**kwargs)

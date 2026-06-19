"""DexYCB — hand grasping of YCB objects (CVPR 2021, NVIDIA).

Official: https://dex-ycb.github.io/   (toolkit: https://github.com/NVlabs/dex-ycb-toolkit)
RGB-D, MANO hand pose, and object 6DoF. Not a handover dataset → hand-object
pretraining / grasp features. Intent left unknown by default.
"""

from .common import DatasetAdapter


class DexYCBAdapter(DatasetAdapter):
    name = "dexycb"
    official_url = "https://dex-ycb.github.io/"
    license_note = "CC BY-NC 4.0 (non-commercial) — not redistributed here"
    registration = "Yes (download form on project page)"
    signature = [("calibration/", False), ("models/", False),
                 ("20200709-subject-01/", False)]  # subject dirs: <date>-subject-NN/
    caps = dict(has_rgb=True, has_depth=True, has_2d_pose=False, has_3d_pose=False,
                has_hand_pose=True, has_object_pose=True)
    default_action = "grasping"
    default_intent = ""        # unknown — not a handover dataset

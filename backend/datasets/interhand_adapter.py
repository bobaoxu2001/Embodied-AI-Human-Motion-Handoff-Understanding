"""InterHand2.6M — 3D interacting hand pose (ECCV 2020, Meta).

Official: https://mks0601.github.io/InterHand2.6M/  (code: facebookresearch/InterHand2.6M)
~2.6M RGB images with 3D hand pose. Used for hand-pose pretraining. Not
action/handover → action/intent left unset.
"""

from .common import DatasetAdapter


class InterHandAdapter(DatasetAdapter):
    name = "interhand"
    official_url = "https://mks0601.github.io/InterHand2.6M/"
    license_note = "CC BY-NC 4.0 (non-commercial) — not redistributed here"
    registration = "Agreement/form on project page"
    signature = [("images/", False), ("annotations/", False)]
    caps = dict(has_rgb=True, has_depth=False, has_2d_pose=True, has_3d_pose=True,
                has_hand_pose=True, has_object_pose=False)
    default_action = ""
    default_intent = ""

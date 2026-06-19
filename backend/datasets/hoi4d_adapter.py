"""HOI4D — category-level Human-Object Interaction (CVPR 2022).

Official: https://hoi4d.github.io/
Egocentric RGB-D with 3D hand pose, object pose, panoptic segmentation, and action
segments. Not a handover dataset → action recognition / hand-object pretraining.
Intent is left unknown by default (not faked as a negative).
"""

from .common import DatasetAdapter


class HOI4DAdapter(DatasetAdapter):
    name = "hoi4d"
    official_url = "https://hoi4d.github.io/"
    license_note = "Academic/research — verify on official page (not redistributed)"
    registration = "Yes (request via project page)"
    signature = [("HOI4D_release/", False), ("HOI4D_annotations/", False),
                 ("camera_params/", False)]
    caps = dict(has_rgb=True, has_depth=True, has_2d_pose=True, has_3d_pose=True,
                has_hand_pose=True, has_object_pose=True)
    default_action = ""        # comes from the dataset's action annotation
    default_intent = ""        # unknown — do NOT fabricate a handoff label

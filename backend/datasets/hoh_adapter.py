"""HOH — Human-Object-Human Handover (NeurIPS 2023). Closest match to our task.

Official: https://tars-home.github.io/hohdataset/
Markerless multi-view RGB-D handovers with skeletons, point clouds, grasp/handedness,
and paired object metadata. Every sample is a handover → positive handoff intent.
"""

from .common import DatasetAdapter


class HOHAdapter(DatasetAdapter):
    name = "hoh"
    official_url = "https://tars-home.github.io/hohdataset/"
    license_note = "Research — verify on official page (not redistributed here)"
    registration = "Yes (request via project page)"
    signature = [("rgb/", False), ("depth/", False), ("skeletons/", False),
                 ("objects/", False)]
    caps = dict(has_rgb=True, has_depth=True, has_2d_pose=True, has_3d_pose=True,
                has_hand_pose=True, has_object_pose=True)
    default_action = "handoff"
    default_intent = "handoff"  # HOH is a handover dataset

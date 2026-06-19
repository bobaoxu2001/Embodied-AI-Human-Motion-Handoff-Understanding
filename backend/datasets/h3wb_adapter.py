"""H3WB — Human3.6M 3D WholeBody (ICCV 2023).

Official: https://github.com/wholebody3d/wholebody3d   (paper: arXiv:2211.15692)
133 whole-body 2D/3D keypoints on 100K images (annotations open on GitHub; the
underlying images require the Human3.6M academic EULA). Used for 2D->3D pose
lifting. Not action/handover → action/intent left unset.
"""

from .common import DatasetAdapter


class H3WBAdapter(DatasetAdapter):
    name = "h3wb"
    official_url = "https://github.com/wholebody3d/wholebody3d"
    license_note = ("Annotations open (GitHub); IMAGES require Human3.6M EULA — "
                    "not redistributed here")
    registration = "Annotations via GitHub; images via Human3.6M academic account"
    signature = [("annotations/", False), ("train.json", False), ("test.json", False)]
    caps = dict(has_rgb=True, has_depth=False, has_2d_pose=True, has_3d_pose=True,
                has_hand_pose=True, has_object_pose=False)
    default_action = ""
    default_intent = ""

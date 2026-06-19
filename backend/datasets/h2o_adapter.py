"""H2O — Visual Human-human Object Handover Analysis (ICCV 2021).

Official: https://sites.google.com/view/handover-h2o/home
~18K RGB clips, 15 people, 30 objects; giver/receiver hand-object states in the
pre-handover phase. Every clip is a handover → positive handoff intent.
"""

from .common import DatasetAdapter


class H2OAdapter(DatasetAdapter):
    name = "h2o"
    official_url = "https://sites.google.com/view/handover-h2o/home"
    license_note = "Research — verify on official page (not redistributed here)"
    registration = "Yes (request via project page)"
    signature = [("clips/", False), ("annotations/", False)]
    caps = dict(has_rgb=True, has_depth=False, has_2d_pose=True, has_3d_pose=False,
                has_hand_pose=True, has_object_pose=True)
    default_action = "handoff"
    default_intent = "handoff"  # H2O is a handover dataset

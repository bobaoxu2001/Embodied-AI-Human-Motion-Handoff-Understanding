"""HOT3D — egocentric Hand and Object Tracking in 3D (Meta / Facebook Research).

Official toolkit: https://github.com/facebookresearch/hot3d
Project page:     https://facebookresearch.github.io/hot3d/
Multi-view egocentric (Project Aria + Quest 3): ~833 min, 19 subjects, 33 rigid
objects, with 3D hand + object pose/shape annotations. **HOT3D-Clips** is a curated
subset in WebDataset format (150 frames / 5 s per clip, ~3832 clips), distributed via
Hugging Face (see the toolkit README for the exact link).

This is the closest public dataset to our hand-object perception front-end. It is NOT a
handover dataset, so intent is left unknown (never faked). Download is license-gated and
large — obtain it via the official toolkit; this repo never redistributes it.

NOTE: URLs are from the official toolkit/screenshot; re-confirm the exact Hugging Face
clip link on the GitHub README before downloading.
"""

from .common import DatasetAdapter


class HOT3DAdapter(DatasetAdapter):
    name = "hot3d"
    official_url = ("https://github.com/facebookresearch/hot3d  "
                    "(project: https://facebookresearch.github.io/hot3d/)")
    license_note = ("HOT3D License Agreement (Meta) — research, accept to get download "
                    "URLs; not redistributed here")
    registration = "Yes — accept license → Hot3DAria_download_urls.json (toolkit); clips via Hugging Face"
    # full sequences (P####_*) and/or HOT3D-Clips WebDataset shards (*.tar)
    signature = [("clips/", False), ("sequences/", False),
                 ("Hot3DAria_download_urls.json", False)]
    caps = dict(has_rgb=True, has_depth=False, has_2d_pose=True, has_3d_pose=True,
                has_hand_pose=True, has_object_pose=True)
    default_action = ""        # tracking dataset — no action labels
    default_intent = ""        # not a handover dataset — intent unknown (not faked)

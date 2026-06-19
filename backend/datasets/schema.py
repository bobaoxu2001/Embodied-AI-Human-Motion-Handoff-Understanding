"""Normalized manifest schema shared by every public-dataset adapter.

One row = one sample (a clip / sequence / image-set) from any supported dataset.
The CSV is intentionally a *superset* and also carries `clip_id` + `label` aliases
so the existing training/eval scripts (which read `clip_id`/`label`/`subject_id`/
`split`) consume it unchanged.

No raw media is ever stored here — only paths/metadata pointing at the locally
downloaded dataset (which the user obtains from official sources).
"""

import csv
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import List, Optional

# Canonical field order for the normalized manifest.
FIELDS = [
    "sample_id",
    "dataset_name",
    "video_path",
    "annotation_path",
    "label",
    "action_label",
    "intent_label",
    "subject_id",
    "object_id",
    "object_name",
    "camera_view",
    "start_time",
    "end_time",
    "fps",
    "num_frames",
    "has_rgb",
    "has_depth",
    "has_2d_pose",
    "has_3d_pose",
    "has_hand_pose",
    "has_object_pose",
    "license_note",
    "split",
]

# Aliases appended so existing scripts (clip_id/label) read the manifest directly.
ALIAS_FIELDS = ["clip_id"]
MANIFEST_COLUMNS = FIELDS + ALIAS_FIELDS


@dataclass
class NormalizedSample:
    sample_id: str
    dataset_name: str
    video_path: str = ""
    annotation_path: str = ""
    label: str = "unlabeled"          # generic label (back-compat)
    action_label: str = ""            # action class when available
    intent_label: str = ""            # handoff | non_handoff | "" (unknown)
    subject_id: str = "unknown"
    object_id: str = ""
    object_name: str = ""
    camera_view: str = ""
    start_time: float = 0.0
    end_time: float = 0.0
    fps: float = 0.0
    num_frames: int = 0
    has_rgb: bool = False
    has_depth: bool = False
    has_2d_pose: bool = False
    has_3d_pose: bool = False
    has_hand_pose: bool = False
    has_object_pose: bool = False
    license_note: str = ""
    split: str = "unassigned"

    def to_row(self) -> dict:
        d = asdict(self)
        # back-compat aliases for existing train/eval/validate scripts
        d["clip_id"] = self.sample_id
        if not d["label"] or d["label"] == "unlabeled":
            d["label"] = self.action_label or "unlabeled"
        # CSV-friendly booleans
        for k in ("has_rgb", "has_depth", "has_2d_pose", "has_3d_pose",
                  "has_hand_pose", "has_object_pose"):
            d[k] = "1" if getattr(self, k) else "0"
        return d


def write_manifest(samples: List[NormalizedSample], out: Path) -> Path:
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=MANIFEST_COLUMNS)
        w.writeheader()
        for s in samples:
            w.writerow(s.to_row())
    return out


def read_manifest(path: Path) -> List[dict]:
    with open(path, newline="") as f:
        return list(csv.DictReader(f))

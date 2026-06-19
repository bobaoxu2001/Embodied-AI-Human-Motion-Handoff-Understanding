"""Shared adapter base + helpers for public-dataset → normalized-manifest conversion.

Adapters never download or redistribute raw data. They validate a locally
downloaded dataset's structure, and convert a *metadata index* (the dataset's own
small index, or one you export per docs/DATASET_DOWNLOAD_MANUAL.md) into the
normalized manifest (schema.py). If no index is found they emit a clear TODO,
never fake labels.
"""

import csv
import json
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .schema import NormalizedSample, write_manifest


@dataclass
class DatasetSummary:
    name: str
    root: str
    present: bool
    found: List[str] = field(default_factory=list)
    missing: List[str] = field(default_factory=list)
    index_file: Optional[str] = None
    n_samples: int = 0
    official_url: str = ""
    license_note: str = ""
    registration: str = ""
    notes: str = ""

    def render(self) -> str:
        lines = [
            f"=== {self.name} ===",
            f"  root      : {self.root}  ({'present' if self.present else 'MISSING'})",
            f"  official  : {self.official_url}",
            f"  license   : {self.license_note}",
            f"  register  : {self.registration}",
            f"  index     : {self.index_file or '(none found)'}",
            f"  samples   : {self.n_samples}",
        ]
        if self.found:
            lines.append(f"  found     : {', '.join(self.found)}")
        if self.missing:
            lines.append(f"  missing   : {', '.join(self.missing)}")
        if self.notes:
            lines.append(f"  notes     : {self.notes}")
        return "\n".join(lines)


class DatasetAdapter:
    """Base adapter. Subclasses configure the class attributes + map records."""

    name: str = "base"
    official_url: str = ""
    license_note: str = ""
    registration: str = ""

    # signature entries (relative path, required?) used to validate a download
    signature: List[Tuple[str, bool]] = []
    # candidate metadata index files (relative to root), first match wins
    index_files: List[str] = ["index.jsonl", "index.csv", "samples.jsonl", "samples.csv"]

    # capability defaults for this dataset
    caps: Dict[str, bool] = {}
    default_action: str = ""          # e.g. "handoff" for handover datasets
    default_intent: str = ""          # "handoff" | "non_handoff" | "" (unknown)

    # ----- structure -----
    def expected_tree(self) -> List[str]:
        return [p for p, _ in self.signature] + [f"{self.index_files[0]}  (metadata index)"]

    def ensure_tree(self, root: Path) -> None:
        root = Path(root)
        (root).mkdir(parents=True, exist_ok=True)
        for rel, _req in self.signature:
            d = root / rel
            (d if rel.endswith("/") else d.parent).mkdir(parents=True, exist_ok=True)
        (root / "SOURCE.md").write_text(
            f"# {self.name}\n\n- Official: {self.official_url}\n"
            f"- License: {self.license_note}\n- Registration: {self.registration}\n\n"
            "This repo does NOT redistribute this dataset. Download it from the official\n"
            "source above (accept its license) and place files here. Nothing is committed.\n"
        )

    def find_index(self, root: Path) -> Optional[Path]:
        root = Path(root)
        for name in self.index_files:
            p = root / name
            if p.exists():
                return p
        return None

    def read_index(self, path: Path) -> List[dict]:
        path = Path(path)
        if path.suffix == ".jsonl":
            return [json.loads(l) for l in path.read_text().splitlines() if l.strip()]
        if path.suffix == ".json":
            data = json.loads(path.read_text())
            return data if isinstance(data, list) else data.get("samples", [])
        with path.open(newline="") as f:
            return list(csv.DictReader(f))

    # ----- scan -----
    def scan(self, root: Path) -> DatasetSummary:
        root = Path(root)
        found, missing = [], []
        for rel, required in self.signature:
            (found if (root / rel).exists() else missing).append(rel + ("" if not required else "*"))
        idx = self.find_index(root)
        n = 0
        if idx:
            try:
                n = len(self.read_index(idx))
            except Exception:
                n = 0
        return DatasetSummary(
            name=self.name, root=str(root), present=root.exists(),
            found=found, missing=missing,
            index_file=str(idx.relative_to(root)) if idx else None,
            n_samples=n, official_url=self.official_url,
            license_note=self.license_note, registration=self.registration,
        )

    # ----- record → sample (subclasses override mapping specifics) -----
    def map_action(self, rec: dict) -> str:
        return str(rec.get("action_label") or rec.get("action") or self.default_action or "")

    def map_intent(self, rec: dict) -> str:
        v = rec.get("intent_label") or rec.get("intent")
        if v:
            return str(v)
        return self.default_intent

    def record_to_sample(self, rec: dict, root: Path) -> NormalizedSample:
        action = self.map_action(rec)
        return NormalizedSample(
            sample_id=str(rec.get("sample_id") or rec.get("id") or rec.get("clip_id")),
            dataset_name=self.name,
            video_path=str(rec.get("video_path") or rec.get("video") or ""),
            annotation_path=str(rec.get("annotation_path") or rec.get("annotation") or ""),
            label=action or "unlabeled",
            action_label=action,
            intent_label=self.map_intent(rec),
            subject_id=str(rec.get("subject_id") or rec.get("subject") or "unknown"),
            object_id=str(rec.get("object_id") or ""),
            object_name=str(rec.get("object_name") or rec.get("object") or ""),
            camera_view=str(rec.get("camera_view") or rec.get("view") or ""),
            start_time=float(rec.get("start_time") or 0.0),
            end_time=float(rec.get("end_time") or 0.0),
            fps=float(rec.get("fps") or 0.0),
            num_frames=int(float(rec.get("num_frames") or 0)),
            has_rgb=self.caps.get("has_rgb", False),
            has_depth=self.caps.get("has_depth", False),
            has_2d_pose=self.caps.get("has_2d_pose", False),
            has_3d_pose=self.caps.get("has_3d_pose", False),
            has_hand_pose=self.caps.get("has_hand_pose", False),
            has_object_pose=self.caps.get("has_object_pose", False),
            license_note=self.license_note,
            split=str(rec.get("split") or "unassigned"),
        )

    # ----- build manifest -----
    def build_manifest(self, root: Path, out: Path, split_strategy: str = "subject",
                       dry_run: bool = False, metadata_only: bool = False) -> Optional[Path]:
        root = Path(root)
        summary = self.scan(root)
        print(summary.render())

        if dry_run:
            print("\n  [dry-run] expected layout:")
            for e in self.expected_tree():
                print(f"    {root}/{e}")
            print("  [dry-run] no files created, nothing written.")
            return None

        self.ensure_tree(root)  # create expected dirs + SOURCE.md (no data)

        idx = self.find_index(root)
        if not idx:
            todo = Path(out).with_suffix(".TODO.md")
            todo.parent.mkdir(parents=True, exist_ok=True)
            todo.write_text(self._todo_report(root))
            print(f"\n  no metadata index found → wrote TODO report: {todo}")
            print("  (place an index file or follow docs/DATASET_DOWNLOAD_MANUAL.md)")
            if metadata_only:
                return None
            raise SystemExit(
                f"{self.name}: cannot build a manifest without a metadata index. "
                f"See {todo}. No fake labels are emitted."
            )

        records = self.read_index(idx)
        samples = [self.record_to_sample(r, root) for r in records]
        assign_splits(samples, split_strategy)
        out_path = write_manifest(samples, Path(out))
        print(f"\n  wrote normalized manifest: {out_path}  ({len(samples)} samples)")
        n_action = sum(1 for s in samples if s.action_label)
        n_intent = sum(1 for s in samples if s.intent_label)
        print(f"  with action_label: {n_action}   with intent_label: {n_intent}")
        return out_path

    def extract_or_link_annotations(self, root: Path, out: Path) -> None:
        """Convert dataset annotations → our keypoints JSON. Per-format parsing is a
        documented TODO; override in adapters where a simple mapping exists."""
        print(f"  {self.name}: annotation conversion is a documented TODO "
              f"(see docs/PUBLIC_DATASET_ADAPTERS.md). Nothing written.")

    def _todo_report(self, root: Path) -> str:
        return (
            f"# TODO — prepare {self.name}\n\n"
            f"Official: {self.official_url}\nLicense: {self.license_note}\n"
            f"Registration: {self.registration}\n\n"
            "No metadata index was found. After downloading the dataset (official source,\n"
            "license accepted), create one of these index files under the dataset root:\n"
            f"  {', '.join(self.index_files)}\n\n"
            "Each row/record needs at least: sample_id, subject_id, and (when available)\n"
            "action_label, intent_label, video_path, annotation_path, fps, num_frames.\n"
            "See docs/DATASET_DOWNLOAD_MANUAL.md for the per-dataset mapping.\n"
        )


def assign_splits(samples: List[NormalizedSample], strategy: str, seed: int = 42,
                  ratios=(0.7, 0.15, 0.15)) -> None:
    """Assign train/val/test in place. 'given' keeps existing splits."""
    if strategy == "given":
        for s in samples:
            if s.split in ("", "unassigned"):
                s.split = "train"
        return
    rng = random.Random(seed)
    if strategy == "subject":
        groups: Dict[str, List[NormalizedSample]] = {}
        for s in samples:
            groups.setdefault(s.subject_id or "unknown", []).append(s)
        keys = list(groups)
        rng.shuffle(keys)
        n = len(keys)
        n_tr = max(1, round(n * ratios[0]))
        n_va = max(1, round(n * ratios[1])) if n >= 3 else 0
        if n >= 3 and n - n_tr - n_va < 1:
            n_tr = max(1, n - n_va - 1)
        for i, k in enumerate(keys):
            split = "train" if i < n_tr else "val" if i < n_tr + n_va else "test"
            for s in groups[k]:
                s.split = split
    else:  # random
        idx = list(range(len(samples)))
        rng.shuffle(idx)
        n = len(samples)
        n_tr = int(n * ratios[0])
        n_va = int(n * ratios[1])
        for rank, i in enumerate(idx):
            samples[i].split = "train" if rank < n_tr else "val" if rank < n_tr + n_va else "test"

"""Tests for the public-dataset adapters + normalized-manifest training shapes.

Uses tiny text/CSV/JSON fixtures (no media) under fixtures/public_datasets/.
"""

import json
import os
import shutil
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datasets import get_adapter, read_manifest  # noqa: E402
from datasets.schema import NormalizedSample, write_manifest  # noqa: E402
from ml import baseline as B  # noqa: E402

FIX = os.path.join(os.path.dirname(__file__), "fixtures", "public_datasets")


def _staged(name, tmp_path):
    """Copy a read-only fixture into tmp (build_manifest writes SOURCE.md/dirs)."""
    dst = tmp_path / name
    shutil.copytree(os.path.join(FIX, name), dst)
    return dst


# ----- scanning -----
def test_scan_hoh_finds_index():
    s = get_adapter("hoh").scan(os.path.join(FIX, "mini_hoh"))
    assert s.present is True
    assert s.index_file and s.n_samples == 3
    assert "hohdataset" in s.official_url


def test_scan_missing_root():
    s = get_adapter("dexycb").scan("/tmp/definitely_missing_xyz")
    assert s.present is False and s.n_samples == 0


# ----- manifest conversion + label/intent mapping -----
def test_hoh_manifest_mapping(tmp_path):
    out = tmp_path / "hoh.csv"
    get_adapter("hoh").build_manifest(_staged("mini_hoh", tmp_path), out, "subject")
    rows = read_manifest(out)
    assert len(rows) == 3
    for r in rows:
        assert r["dataset_name"] == "hoh"
        assert r["action_label"] == "handoff"
        assert r["intent_label"] == "handoff"   # handover dataset → positive
        assert r["clip_id"] == r["sample_id"]    # back-compat alias
        assert r["has_3d_pose"] == "1"
        assert r["split"] in {"train", "val", "test"}


def test_hoi4d_intent_unknown(tmp_path):
    out = tmp_path / "hoi4d.csv"
    get_adapter("hoi4d").build_manifest(_staged("mini_hoi4d", tmp_path), out, "random")
    rows = read_manifest(out)
    actions = {r["action_label"] for r in rows}
    assert {"pickup", "place", "reaching"} <= actions
    # non-handover dataset → intent left unknown, never fabricated as a negative
    assert all(r["intent_label"] == "" for r in rows)


def test_h3wb_caps(tmp_path):
    out = tmp_path / "h3wb.csv"
    get_adapter("h3wb").build_manifest(_staged("mini_h3wb", tmp_path), out, "subject")
    rows = read_manifest(out)
    assert all(r["has_3d_pose"] == "1" and r["has_2d_pose"] == "1" for r in rows)
    assert all(r["intent_label"] == "" and r["action_label"] == "" for r in rows)


def test_missing_index_raises(tmp_path):
    # empty root, no index, not dry-run/metadata-only → clear error, no fake labels
    with pytest.raises(SystemExit):
        get_adapter("hoh").build_manifest(tmp_path / "empty", tmp_path / "m.csv", "subject")


# ----- training shape checks on a normalized manifest -----
def _write_kp(path, n=4, wrist=(0.5, 0.5)):
    frames = []
    for _ in range(n):
        body = [[0.4, 0.3, 0.9] for _ in range(17)]
        body[10] = [wrist[0], wrist[1], 0.9]
        frames.append({"body": body, "hand_right": [[wrist[0], wrist[1], 0.9]] * 21})
    path.write_text(json.dumps({"clip_id": path.stem, "frames": frames}))


def test_train_shapes_from_normalized_manifest(tmp_path):
    kp = tmp_path / "kp"
    kp.mkdir()
    samples = []
    # 2 handoff (positive) + 2 reaching (negative), 2 subjects
    for i, (lab, intent) in enumerate(
        [("handoff", "handoff"), ("handoff", "handoff"),
         ("reaching", "non_handoff"), ("reaching", "non_handoff")]
    ):
        sid = f"x_{i}"
        _write_kp(kp / f"{sid}.json", wrist=(0.5 + 0.05 * i, 0.5))
        samples.append(NormalizedSample(
            sample_id=sid, dataset_name="mix", action_label=lab, label=lab,
            intent_label=intent, subject_id=f"s{i % 2}", split="train"))
    man = tmp_path / "m.csv"
    write_manifest(samples, man)
    rows = read_manifest(man)

    feats, labels, ids = B.build_clip_dataset(rows, kp)
    assert len(feats) == 4 and len(feats[0]) == 74
    ck = B.train_action(feats, labels)
    assert len(ck["actions"]) == 7 and len(ck["W"]) == 7

    fi, y, _ = B.build_intent_dataset(rows, kp)
    assert sorted(set(y)) == [0, 1]            # both classes from intent_label
    ic = B.train_intent(fi, y)
    assert ic["model"] == "intent" and len(ic["w"]) == 74

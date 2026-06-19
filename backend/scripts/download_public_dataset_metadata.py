#!/usr/bin/env python3
"""Safely prepare public datasets — metadata / instructions only, never bulk data.

This DOES NOT download huge raw datasets. It prints **official** download links and
registration requirements, creates the expected local folder structure under
`data/external/<dataset>/`, and writes a `SOURCE.md` provenance file. With
`--metadata-only` it may fetch a small, officially-hosted metadata/sample file **only**
if one is whitelisted for that dataset and it passes a size guard (`--max-mb`).

Design goals (see docs/data_license_notes.md):
  * never auto-download massive raw datasets
  * never scrape YouTube/TikTok/etc.
  * never commit data files (data/external/ is git-ignored)
  * honest, official sources only

Usage:
    python download_public_dataset_metadata.py                      # summary (all, dry-run)
    python download_public_dataset_metadata.py --dataset hoi4d
    python download_public_dataset_metadata.py --dataset h3wb --metadata-only
    python download_public_dataset_metadata.py --dataset all --dry-run
"""

import argparse
import textwrap
from pathlib import Path

# Registry of official sources. `metadata_files` is intentionally empty for every
# dataset: the small annotation files that exist are still behind registration or
# are too large to treat as "metadata", so we never hardcode an auto-download. The
# fetch mechanism (with a size guard) is implemented below for the day an officially
# small + license-clean file is available — add {filename: url} to enable it.
DATASETS = {
    "hoi4d": {
        "name": "HOI4D",
        "urls": ["https://hoi4d.github.io/"],
        "modality": "RGB-D egocentric, 3D hand pose, object pose, segmentation, meshes",
        "tasks": "human-object interaction, hand pose, action segmentation",
        "size": "~2.4M RGB-D frames / 4000 sequences",
        "license": "Academic/research — verify on project page",
        "registration": "Yes (request via project page)",
        "download": "Follow the download links + form on https://hoi4d.github.io/",
        "metadata_files": {},
    },
    "ego4d": {
        "name": "Ego4D / Ego-Exo4D",
        "urls": ["https://ego4d-data.org/", "https://ego-exo4d-data.org/",
                 "https://github.com/facebookresearch/Ego4d"],
        "modality": "egocentric (multimodal) video; Ego-Exo4D adds exocentric",
        "tasks": "video understanding, hand-object, forecasting",
        "size": "thousands of hours (TB)",
        "license": "Ego4D License Agreement (sign → ~48h → AWS credentials)",
        "registration": "Yes (license agreement, often institutional)",
        "download": "Sign the agreement, then use the official Ego4D CLI downloader.",
        "metadata_files": {},
    },
    "human36m": {
        "name": "Human3.6M",
        "urls": ["http://vision.imar.ro/human3.6m/", "http://vision.imar.ro/human3.6m/eula.php"],
        "modality": "RGB + 3D mocap (17 joints)",
        "tasks": "2D->3D pose lifting",
        "size": "large (TB)",
        "license": "Academic use only (EULA)",
        "registration": "Yes (account with academic email + EULA)",
        "download": "Create an academic account and accept the EULA on the official site.",
        "metadata_files": {},
    },
    "h3wb": {
        "name": "H3WB (Human3.6M 3D WholeBody)",
        "urls": ["https://github.com/wholebody3d/wholebody3d", "https://arxiv.org/abs/2211.15692"],
        "modality": "2D/3D whole-body keypoints (133) on 100K images",
        "tasks": "whole-body 2D->3D pose lifting",
        "size": "100K images (annotations comparatively small)",
        "license": "Annotations on GitHub; IMAGES require the Human3.6M EULA",
        "registration": "Annotations via GitHub; images via Human3.6M account",
        "download": "Clone the GitHub repo for annotations; obtain images through Human3.6M.",
        "metadata_files": {},
    },
    "interhand26m": {
        "name": "InterHand2.6M",
        "urls": ["https://mks0601.github.io/InterHand2.6M/",
                 "https://github.com/facebookresearch/InterHand2.6M"],
        "modality": "RGB, 3D interacting-hand pose",
        "tasks": "3D hand pose",
        "size": "~2.6M images",
        "license": "CC BY-NC 4.0 (non-commercial)",
        "registration": "Agreement/form on project page",
        "download": "Follow the download instructions on the project page.",
        "metadata_files": {},
    },
    "dexycb": {
        "name": "DexYCB",
        "urls": ["https://dex-ycb.github.io/", "https://github.com/NVlabs/dex-ycb-toolkit"],
        "modality": "RGB-D, hand pose, object 6DoF",
        "tasks": "hand-object grasp, object pose",
        "size": "~119 GB",
        "license": "CC BY-NC 4.0 (non-commercial)",
        "registration": "Yes (download form)",
        "download": "Use the download form on https://dex-ycb.github.io/ (single tar or parts).",
        "metadata_files": {},
    },
    "sthv2": {
        "name": "Something-Something V2",
        "urls": ["https://20bn.com/datasets/something-something/v2"],
        "modality": "RGB video",
        "tasks": "temporal action recognition",
        "size": "220,847 clips (~19.4 GB)",
        "license": "Qualcomm academic license",
        "registration": "Yes (account)",
        "download": "Create an account and follow the official download instructions.",
        "metadata_files": {},
    },
    "epic_kitchens": {
        "name": "EPIC-KITCHENS-100",
        "urls": ["https://epic-kitchens.github.io/",
                 "https://github.com/epic-kitchens/epic-kitchens-100-annotations"],
        "modality": "egocentric RGB (+ optical flow)",
        "tasks": "action recognition, hand-object, anticipation",
        "size": "~100 hours (large)",
        "license": "CC BY-NC 4.0 (non-commercial; contact UoB for commercial)",
        "registration": "Download via data.bris / academic torrents",
        "download": "Annotations: clone the annotations GitHub repo. Media: data.bris.",
        "metadata_files": {},
    },
    "ntu_rgbd": {
        "name": "NTU RGB+D (60/120)",
        "urls": ["https://rose1.ntu.edu.sg/dataset/actionRecognition/",
                 "https://github.com/shahroudy/NTURGB-D"],
        "modality": "RGB, depth, IR, 3D skeleton (25 joints)",
        "tasks": "skeleton action recognition",
        "size": "~1.3 TB / 56,880 samples",
        "license": "ROSE Lab academic agreement (required acknowledgement string)",
        "registration": "Yes (validated request to ROSE Lab)",
        "download": "Submit the request form to the ROSE Lab; download after approval.",
        "metadata_files": {},
    },
    "hoh": {
        "name": "HOH (Human-Object-Human Handover)",
        "urls": ["https://tars-home.github.io/hohdataset/", "https://arxiv.org/abs/2310.00723"],
        "modality": "multi-view RGB-D, skeletons, point clouds, grasp/handedness, comfort",
        "tasks": "handover parameter estimation, grasp, giver/receiver",
        "size": "2,720 interactions, 136 objects, 40 participants",
        "license": "Research — verify on project page",
        "registration": "Yes (likely; via project page)",
        "download": "Follow the access instructions on https://tars-home.github.io/hohdataset/",
        "metadata_files": {},
    },
}


def _print_dataset(key: str) -> None:
    d = DATASETS[key]
    print(f"\n=== {d['name']}  [{key}] ===")
    print("  official : " + "  ".join(d["urls"]))
    print(f"  modality : {d['modality']}")
    print(f"  tasks    : {d['tasks']}")
    print(f"  size     : {d['size']}")
    print(f"  license  : {d['license']}")
    print(f"  register : {d['registration']}")
    print(textwrap.fill(f"download : {d['download']}", width=92,
                        initial_indent="  ", subsequent_indent="             "))


def _source_md(key: str) -> str:
    d = DATASETS[key]
    return (
        f"# Source — {d['name']}\n\n"
        f"- Official: {', '.join(d['urls'])}\n"
        f"- Modality: {d['modality']}\n"
        f"- Tasks: {d['tasks']}\n"
        f"- Size: {d['size']}\n"
        f"- License: {d['license']}\n"
        f"- Registration: {d['registration']}\n"
        f"- Download: {d['download']}\n\n"
        "This project does NOT redistribute this dataset. Obtain it from the official\n"
        "source above and respect its license (see docs/data_license_notes.md).\n"
        "Place raw files under ./raw/ (git-ignored). Nothing here is committed.\n"
    )


def _prepare_folders(key: str, out_root: Path, dry_run: bool) -> Path:
    ds_dir = out_root / key
    if dry_run:
        print(f"  [dry-run] would create {ds_dir}/(raw, metadata) + SOURCE.md")
        return ds_dir
    for sub in ("raw", "metadata"):
        (ds_dir / sub).mkdir(parents=True, exist_ok=True)
    (ds_dir / "SOURCE.md").write_text(_source_md(key))
    print(f"  prepared {ds_dir}/ (raw, metadata, SOURCE.md)")
    return ds_dir


def _fetch_metadata(key: str, ds_dir: Path, max_mb: float) -> None:
    """Fetch whitelisted small metadata files only (size-guarded). Stdlib urllib."""
    files = DATASETS[key].get("metadata_files") or {}
    if not files:
        print("  metadata: none auto-downloadable (registration/size) — see links above.")
        return
    import urllib.request

    meta_dir = ds_dir / "metadata"
    meta_dir.mkdir(parents=True, exist_ok=True)
    for fname, url in files.items():
        try:
            req = urllib.request.Request(url, method="HEAD")
            with urllib.request.urlopen(req, timeout=20) as resp:
                size = int(resp.headers.get("Content-Length") or 0)
            if size and size > max_mb * 1024 * 1024:
                print(f"  skip {fname}: {size/1e6:.1f}MB > --max-mb {max_mb} (treat as bulk).")
                continue
            urllib.request.urlretrieve(url, meta_dir / fname)
            print(f"  fetched {fname} → {meta_dir/fname}")
        except Exception as e:  # network/permission/etc. — never fatal
            print(f"  could not fetch {fname} ({e}); follow manual steps above.")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dataset", default="all",
                    choices=["all", *DATASETS.keys()],
                    help="dataset key, or 'all' (default)")
    ap.add_argument("--out", default="data/external", help="output root (git-ignored)")
    ap.add_argument("--metadata-only", action="store_true",
                    help="prepare folders + fetch only small whitelisted metadata files")
    ap.add_argument("--dry-run", action="store_true",
                    help="print only; create nothing, download nothing")
    ap.add_argument("--max-mb", type=float, default=25.0,
                    help="size cap (MB) for any metadata fetch (default 25)")
    args = ap.parse_args()

    keys = list(DATASETS) if args.dataset == "all" else [args.dataset]
    out_root = Path(args.out)

    print("Public dataset preparation — official links & metadata only.")
    print("No bulk data is downloaded; nothing is committed (data/external/ is git-ignored).")
    print("Licenses & policy: docs/data_license_notes.md\n")

    for key in keys:
        _print_dataset(key)
        if args.dry_run:
            print("  [dry-run] no folders created, no downloads.")
            continue
        ds_dir = _prepare_folders(key, out_root, dry_run=False)
        if args.metadata_only:
            _fetch_metadata(key, ds_dir, args.max_mb)

    print("\nDone. Next: register/download from the official sources above into")
    print(f"  {out_root}/<dataset>/raw/   (git-ignored). See docs/dataset_research.md.")


if __name__ == "__main__":
    main()

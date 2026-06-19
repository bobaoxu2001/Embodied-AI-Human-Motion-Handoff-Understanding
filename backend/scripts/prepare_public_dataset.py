#!/usr/bin/env python3
"""Prepare a manually-downloaded public dataset → normalized manifest.

SAFE BY DESIGN: never downloads bulk data, never scrapes, never commits data.
It validates the dataset's folder structure, prints the official URL + license
reminder, creates the expected directory tree, and — if a metadata index is
present — converts it to the normalized manifest (backend/datasets/schema.py).
If no index is present it writes a clear TODO report instead of faking labels.

Examples:
    python scripts/prepare_public_dataset.py --dataset hoh \\
        --root data/external/hoh --out data/manifests/hoh_manifest.csv --dry-run
    python scripts/prepare_public_dataset.py --dataset hoi4d \\
        --root data/external/hoi4d --out data/manifests/hoi4d_manifest.csv --metadata-only
    python scripts/prepare_public_dataset.py --dataset h3wb \\
        --root data/external/h3wb --out data/manifests/h3wb_manifest.csv --dry-run
"""

import argparse
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))

from datasets import ADAPTERS, get_adapter  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dataset", required=True, choices=list(ADAPTERS),
                    help="which public dataset adapter to use")
    ap.add_argument("--root", required=True, help="local dataset root (downloaded manually)")
    ap.add_argument("--out", default=None, help="output manifest CSV path")
    ap.add_argument("--split-strategy", default="subject",
                    choices=["subject", "random", "given"])
    ap.add_argument("--dry-run", action="store_true",
                    help="print structure check + expected tree; write nothing")
    ap.add_argument("--metadata-only", action="store_true",
                    help="prepare tree + manifest if index exists; never error on missing raw data")
    ap.add_argument("--link-annotations", action="store_true",
                    help="attempt annotation→keypoints conversion (documented TODO per dataset)")
    args = ap.parse_args()

    adapter = get_adapter(args.dataset)
    out = args.out or f"data/manifests/{args.dataset}_manifest.csv"

    print("Public dataset preparation — official sources only, no redistribution.")
    print("Raw data must be downloaded manually after accepting the dataset license.\n")

    adapter.build_manifest(Path(args.root), Path(out),
                           split_strategy=args.split_strategy,
                           dry_run=args.dry_run, metadata_only=args.metadata_only)

    if args.link_annotations and not args.dry_run:
        print()
        adapter.extract_or_link_annotations(Path(args.root), Path(out))


if __name__ == "__main__":
    main()

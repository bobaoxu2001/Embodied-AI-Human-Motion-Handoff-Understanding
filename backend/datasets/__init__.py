"""Public-dataset adapters: official datasets → normalized manifest (no redistribution).

Each adapter validates a locally downloaded dataset's structure and converts an
available metadata index into the normalized manifest schema (schema.py). Adapters
never download bulk data, never scrape, and never fabricate labels.

Use via scripts/prepare_public_dataset.py.
"""

from .common import DatasetAdapter, DatasetSummary, assign_splits
from .dexycb_adapter import DexYCBAdapter
from .h2o_adapter import H2OAdapter
from .h3wb_adapter import H3WBAdapter
from .hoh_adapter import HOHAdapter
from .hoi4d_adapter import HOI4DAdapter
from .interhand_adapter import InterHandAdapter
from .schema import FIELDS, NormalizedSample, read_manifest, write_manifest

ADAPTERS = {
    cls.name: cls
    for cls in [HOHAdapter, H2OAdapter, HOI4DAdapter, DexYCBAdapter,
                H3WBAdapter, InterHandAdapter]
}


def get_adapter(name: str) -> DatasetAdapter:
    if name not in ADAPTERS:
        raise SystemExit(f"unknown dataset '{name}'. choices: {', '.join(ADAPTERS)}")
    return ADAPTERS[name]()


__all__ = [
    "DatasetAdapter", "DatasetSummary", "assign_splits", "ADAPTERS", "get_adapter",
    "NormalizedSample", "read_manifest", "write_manifest", "FIELDS",
]

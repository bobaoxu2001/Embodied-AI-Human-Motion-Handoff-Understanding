# No-self-recording plan

**Decision:** for now I am **not** recording my own clips. The project uses **existing
official public datasets** instead — prioritizing handover / hand-object interaction data.

This does not change the honesty posture: the app stays **demo-mode simulated** until real
training is actually run, and **no raw data is redistributed** in this repo.

## Why this is viable

The whole train→eval loop already runs on a normalized manifest + keypoints
([TRAINING_BASELINES.md](TRAINING_BASELINES.md)). Swapping the *source* of that manifest
from self-recorded clips to **public-dataset adapters**
([PUBLIC_DATASET_ADAPTERS.md](PUBLIC_DATASET_ADAPTERS.md)) is all that's needed.

## Recommended order

1. **Handover / handoff intent → HOH or H2O.** These are the closest to the core task and
   give **positive** handoff samples (giver/receiver). Start here.
2. **2D→3D pose lifting → H3WB / Human3.6M.** Trains Stage 02 with real 3D supervision.
3. **Hand-object pretraining → HOI4D / DexYCB.** Rich hand+object pose for the perception
   front-end and grasp features.
4. **Hand-pose pretraining → InterHand2.6M.** Optional, for hand realism.
5. **Action-recognition fallback → EPIC-KITCHENS / Something-Something V2.** Only if you
   need more generic action data.

## Intent training without self-recorded negatives

Handover datasets are all positives. To train the **intent** baseline you must pair them
with **negatives** from a non-handover source (e.g. HOI4D/DexYCB actions). The adapters
leave non-handover `intent_label` **empty (unknown)** by default — they are not faked as
negatives. Opt them in explicitly as negatives only if defensible for your setup, and say
so. (Action recognition and pose lifting do **not** need this pairing.)

## What stays the same

- Live Vercel site: **static frontend + browser MediaPipe + demo fallback** (no backend) —
  see [DEPLOYMENT_NOTES.md](DEPLOYMENT_NOTES.md).
- On-screen metrics: **demo-mode simulated** until you actually run training and replace
  them with measured numbers (and cite the split size).
- The `/capture` page still exists for anyone who *does* want to record later; it is now
  optional, not the primary route.

## Honest claims checklist

- ✅ "Public-dataset adapter / metadata-only integration / planned extension."
- ✅ "Trained a baseline on <dataset> split X" — **only after** you run the scripts.
- ❌ Never imply training on a dataset you only downloaded or only wrote an adapter for.

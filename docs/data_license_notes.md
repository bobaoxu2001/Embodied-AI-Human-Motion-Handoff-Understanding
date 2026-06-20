# Data license notes

Plain-language license/access summary for every dataset referenced by this project, plus
our own data-handling policy. **This is guidance, not legal advice** — always read and
follow the current terms on each dataset's official page (links in
[dataset_research.md](dataset_research.md)). Licenses and access rules change.

## Our policy (this repo)

- **No raw data in Git.** Videos, depth, point clouds, weights, and large arrays are
  git-ignored (`data/raw/`, `data/external/`, `data/processed/`, `*.mp4/*.mov/*.avi`,
  `*.npz/*.pt/*.pth/*.onnx`). Only **small example manifests** and **docs** are committed.
- **No redistribution.** We do **not** mirror or re-host any third-party dataset. The
  helper script only prints **official** links and creates local folders.
- **No scraping.** We do **not** scrape YouTube, TikTok, Instagram, or any platform for
  video. Public datasets are obtained **only** through their official channels.
- **Self-recorded data** is captured with **informed participant consent** for
  research/portfolio use; faces are not the learning signal and can be blurred on request.
- **Non-commercial respect.** Several sets are CC BY-NC / academic-only. This project is a
  portfolio/research demo; if any usage ever becomes commercial, those sets must be
  removed or separately licensed.

## Per-dataset summary

| Dataset | License (verify on site) | Commercial use? | Access path |
|---|---|---|---|
| HOT3D | HOT3D License Agreement (Meta), research | No (assume non-commercial) | Accept license → toolkit URLs; clips via Hugging Face |
| HOI4D | Academic/research (see site) | No (assume non-commercial) | Request via project page |
| Ego4D / Ego-Exo4D | Ego4D License Agreement | Restricted; per agreement | Sign agreement → AWS creds (~48h) |
| Human3.6M | **Academic use only** (EULA) | **No** | Academic-email account + EULA |
| H3WB | Annotations open (GitHub); **images = Human3.6M EULA** | Images: no | GitHub annotations; images via Human3.6M |
| InterHand2.6M | **CC BY-NC 4.0** | **No** | Project page / agreement |
| DexYCB | **CC BY-NC 4.0** | **No** | Download form on project page |
| Something-Something V2 | Qualcomm academic license | No | Account on Qualcomm/20BN page |
| EPIC-KITCHENS-100 | **CC BY-NC 4.0** | **No** (contact UoB for commercial) | data.bris / academic torrents |
| NTU RGB+D (60/120) | ROSE Lab academic agreement | **No** | Request form (ROSE Lab) |
| HOH | Research (see site) | Assume non-commercial | Project page |

### Notes

- **CC BY-NC 4.0** (DexYCB, InterHand2.6M, EPIC-KITCHENS): free for **non-commercial**
  use **with attribution**. Keep the citation and don't use commercially.
- **Human3.6M / H3WB**: H3WB's *annotations* are distributed openly, but the underlying
  *images* come from Human3.6M, which is **academic-only**. You need a Human3.6M account
  to use the imagery.
- **Ego4D / Ego-Exo4D**: a formal license agreement is required (often institutional);
  approval takes ~48h and yields AWS credentials. Treat as access-controlled.
- **NTU RGB+D**: download requires a validated request to the ROSE Lab; publications must
  include the required acknowledgement string.

## Attribution / citation

If you use any dataset, cite the original paper (see Sources in
[dataset_research.md](dataset_research.md)) and include any required acknowledgement
(e.g., NTU RGB+D's ROSE Lab statement). Keep `data/external/<dataset>/SOURCE.md` (created
by `scripts/download_public_dataset_metadata.py`) as a local record of where each set came
from and under what terms.

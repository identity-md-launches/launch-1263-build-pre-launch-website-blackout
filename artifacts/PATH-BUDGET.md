# Explicit artifact path budget

The new root `.gitignore` admits only these review artifacts over the inherited local `artifacts/` exclusion. Total artifact budget: **768,000 bytes (750 KiB)**.

| Paths | Maximum bytes | Purpose |
| --- | ---: | --- |
| `artifacts/PATH-BUDGET.md`, `artifacts/validation.md` | 30,000 | Scope, review and actual check results |
| `artifacts/screenshots/*.webp` | 640,000 | Required Home, Packs, Farm and Rewards screenshots at 375 and 1440; supporting states |
| `artifacts/v11/*.json` | 98,000 | Compact live, browser, performance, interaction, integrity and byte evidence |

Dependency/cache directories are ignored at every nesting level. No manifest, lockfile, runtime asset, proof, source directory or static export is excluded. Earlier generated PNG screenshots and the verbose v9 taste dump are superseded by this revision’s screenshots and review, and removed to keep the complete submission below 8 MiB. Historical textual reports remain as historical records; their removed screenshot links are not evidence for this revision.

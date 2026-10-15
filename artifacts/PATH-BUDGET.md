# Explicit artifact path budget

This UX revision admits the paths below through `.gitignore`. Maximum review-artifact allocation is **5,500,000 bytes**. This is a raw-file ceiling, not permission to exceed the **8,388,608-byte complete Git submission bundle** limit. The final temporary bundle measurement is recorded in `artifacts/v14/bundle-trial.json`.

| Paths | Maximum bytes | Purpose |
| --- | ---: | --- |
| `artifacts/PATH-BUDGET.md`, `artifacts/validation.md` | 80,000 | Budget, current validation, six-domain review and limitations |
| `artifacts/PR.md` | 20,000 | Reviewable PR description and screenshot links |
| `artifacts/screenshots/*.webp` | 3,800,000 | Retained evidence plus Home, wallet, Invite and Leaderboard at 375/1440; live dispatch/telemetry details |
| `artifacts/recordings/*.webm` | 1,250,000 | Retained single/bulk opening recordings for all five rarities |
| `artifacts/v11/*.json`, `artifacts/v12/*.json`, `artifacts/v13/*.json`, `artifacts/v14/*.json` | 300,000 | Historical evidence and this revision's compact check results |
| `**/.playwright-mcp/` | 0 submitted | Disposable browser-tool traces; excluded at every nesting level |

Allocated total: **5,450,000 bytes**. Source, manifests, lockfiles, Merkle proofs and complete runtime assets remain deliverables. No dependency, registry archive, browser download or cache is admitted. Existing recursive node_modules/package-cache exclusions remain. Temporary tests live in `test/scratch/`, which is removed before submission. No required recordings or runtime/proof assets are dropped for size.

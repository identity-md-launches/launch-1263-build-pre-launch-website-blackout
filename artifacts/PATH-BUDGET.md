# Explicit artifact path budget

The ignore-file changes admit these review deliverables. They do not ignore source, locked dependencies, proofs, runtime assets, or the production export. Maximum total review artifact allocation: **4,700,000 bytes**; the entire Git submission still must remain below **8,388,608 bytes**.

| Paths | Maximum bytes | Purpose |
| --- | ---: | --- |
| `artifacts/PATH-BUDGET.md`, `artifacts/validation.md` | 60,000 | Implementation review, actual commands and limitations |
| `artifacts/screenshots/*.webp` | 3,100,000 | Every page at 375 and 1440, plus connected state evidence |
| `artifacts/recordings/*.webm` | 1,250,000 | Single and bulk opening for all five rarities; local dev-only mock mode |
| `artifacts/v11/*.json`, `artifacts/v12/*.json`, `artifacts/v13/*.json` | 215,000 | Retained historical evidence plus current compact test, live-read, performance and delivery results |

Generated dependencies, package caches, browser downloads, video intermediates and test scratch remain outside Git at all nesting levels. Existing runtime/proof assets remain intact. Screenshots superseded by the current revision can be replaced in place; current videos must not be dropped to reduce size.

The gameplay revision explicitly admits `artifacts/v13/*.json` (within the 215,000-byte shared JSON budget) and `artifacts/screenshots/gameplay-*.webp` (within the 3,100,000-byte screenshot budget). `artifacts/PR.md` has a separate 10,000-byte limit for the review description and screenshot links. These allocations total 4,635,000 bytes, below the 4,700,000-byte artifact ceiling. No new cache or dependency paths are admitted.

# Explicit artifact path budget

The ignore-file changes admit these review deliverables. They do not ignore source, locked dependencies, proofs, runtime assets, or the production export. Maximum total review artifact allocation: **4,194,304 bytes (4 MiB)**; the entire Git submission still must remain below **8,388,608 bytes**.

| Paths | Maximum bytes | Purpose |
| --- | ---: | --- |
| `artifacts/PATH-BUDGET.md`, `artifacts/validation.md` | 35,000 | Implementation review, actual commands and limitations |
| `artifacts/screenshots/*.webp` | 2,700,000 | Every page at 375 and 1440, plus connected state evidence |
| `artifacts/recordings/*.webm` | 1,250,000 | Single and bulk opening for all five rarities; local dev-only mock mode |
| `artifacts/v11/*.json`, `artifacts/v12/*.json` | 209,304 | Retained historical evidence plus current compact test, live-read, performance and delivery results |

Generated dependencies, package caches, browser downloads, video intermediates and test scratch remain outside Git at all nesting levels. Existing runtime/proof assets remain intact. Screenshots superseded by the current revision can be replaced in place; current videos must not be dropped to reduce size.

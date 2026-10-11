# Review revision validation

Both reported defects reproduced in the original production export and were corrected with targeted changes to `src/main.ts` and `src/style.css`. The existing pixel art, palette, guide, shared status bar, game rules and adapter architecture remain in use. This report records the revision checks on 2026-10-11 and supplements the preceding [tabs review](tabs-validation.md).

## Reproduction and corrections

Original observations were made with the supplied Chromium browser connector, reduced motion, fresh browser storage and a 390×844 viewport. Measurements are preserved in [fidelity-before.json](fidelity-before.json).

| Finding | Reproduced behavior | Correction and final result |
| --- | --- | --- |
| `41662d13af917a569abedc434a24e156b445eef14e8194a1a30e91d136d899c0` — high, layout | Landing → Play demo, without scrolling: Room 01 top **820.828125**, bottom tabs top **783**; starter GPU sprite began at **897.828125**. The screenshot showed the duplicate intro occupying the first screen and every slot below navigation. | `src/main.ts:140` removes the duplicate Farm intro; `:141` retains Mining rooms/count and shortens the instruction. `src/style.css:741` gives only Farm 16px top padding at ≤600px. Mining rooms is the single h1, with room titles promoted to h2 and their previous visual styling retained (`src/main.ts:107`, `src/style.css:116`, `:121`, `:518`). Both fresh entry paths now put the room at **650.25**, room header bottom **692.25**, and full GPU sprite at **727.25–781.640625**, above navigation at **783**. Guide and CLAIM also fit. |
| `926dc1878b9d6350cae894df97a220b17e92a045db72382ee4a215f0b5616ffd` — high, warning/recovery | Skip → Demo tools → Next epoch twice: GPU durability **99%**, hashrate **9.9 H/s**, **0** warnings. | `src/main.ts:168–170` detects installed items with 0 < durability < 100 without requiring an active event. It renders the requested worn-hardware explanation and existing Repair hardware link. Active local fire retains contextual wording. Tests confirm the banner on every game tab, persistence after fire expiry, and no warning for worn spares. Repair restores **100% / 10 H/s** and clears the banner. |
| Associated recovery focus — accessibility | A local-fire fixture with broken GPU in slot 1 and worn Power Supply in slot 2 made Repair hardware focus the broken GPU (`slot-0-0`). | `src/main.ts:157` narrows the worn-item focus selector to exclude durability 0. Separate worn/broken shortcuts now target `slot-0-1` and `slot-0-0`, respectively. This was reproduced before correction. |

The first-screen check establishes that room hardware is visible; it does not claim the whole six-slot room or inventory fits without scrolling. The existing pack guide action remains visible and working. No unreported redesign or changes to protected configuration/dependencies were needed.

## Commands and actual results

Dependencies were installed from the unchanged manifest and lockfile into `/tmp/blackout-revision-tools`; browser binaries and npm cache also stayed in `/tmp`. No repository dependency directory, ignore rule or submodule was created. Production build/typecheck and both interaction suites ran after the last application-source edit.

```sh
/tmp/blackout-revision-tools/node_modules/.bin/tsc --noEmit
/tmp/blackout-revision-tools/node_modules/.bin/vite build
BLACKOUT_TOOLCHAIN=/tmp/blackout-revision-tools /tmp/blackout-revision-tools/node_modules/.bin/vitest run
BLACKOUT_TOOLCHAIN=/tmp/blackout-revision-tools PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-revision-browsers node scripts/smoke.mjs
BLACKOUT_TOOLCHAIN=/tmp/blackout-revision-tools PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-revision-browsers node scripts/fidelity-smoke.mjs
node scripts/check-delivery.mjs
```

| Check | Result |
| --- | --- |
| Strict typecheck | Passed, exit 0 |
| Production build | Passed, exit 0; Vite transformed 11 modules; current relative-URL export in `dist/` |
| Engine/documentation suite | **67 tests passed** in two files |
| Existing production interaction suite | **16 scenarios passed**, 0 console/page errors, 0 failed requests |
| Focused production regressions | **4 scenarios passed**, 0 console/page errors, 0 failed requests |
| Responsive suite | All seven routes at 320, 390, 768 and 1440px: **28 document-overflow checks passed**; 390px with 200% root text enlargement also passed |
| Metadata and assets | Existing suite verifies title/description, favicon, OG metadata and loaded local fonts; delivery checker verifies relative URLs, referenced assets and 1200×630 social image |
| Delivery | Exact final source/export/evidence accounting and export hashes are in [bundle-budget.json](bundle-budget.json); checker verifies required files and absence of dependency/cache/archive directories |

Both browser suites serve the actual `dist/` under `/preview/` and use isolated browser contexts. A paused clock makes epoch/day checks deterministic without waiting in real time. The new script tests both fresh entry paths before any scrolling, exposed two-epoch wear across all six game tabs, keyboard Docs → Repair hardware → item-menu recovery, actual repair, and no-event/spare-only/broken-only/active-fire/expired-fire/mixed-hardware fixtures. Fixture mutation is confined to browser-local test saves; the reported normal-wear reproduction uses only exposed controls.

Machine-readable results: [fidelity-results.json](fidelity-results.json), [tabs-results.json](tabs-results.json). Current screenshots: [fresh Farm](screenshots/fidelity/direct-farm-390.png), [landing → Farm](screenshots/fidelity/landing-farm-390.png), [wear warning](screenshots/fidelity/worn-warning-390.png), [desktop Farm](screenshots/tabs/farm-desktop.png). The supplied connector was also used to inspect the original/final export. Before/after mobile Farm, mobile warning and desktop Farm images were opened and visually reviewed.

## Better Interface six-domain review

The pinned workflow and all six domain core principles were read before implementing these corrections. Review scope is the changed Farm layout, shared warning/recovery UI and their affected shared components. Existing tokens and visual decisions were preserved.

| Domain | Coverage, findings and verification |
| --- | --- |
| Accessibility | Preserved one h1 and coherent room-heading levels without changing their appearance. Native warning links and item disclosures retain keyboard operation. Cross-tab repair focus computed a **3px solid yellow** outline; mixed worn/broken targets were corrected and tested. Stable `#mining-status` receives/clears warning text. Existing keyboard-only pack/install/claim flow and axe checks passed; zero reported violations across six routes and the overclock dialog. |
| Layout | Reproduced the first-screen obstruction, removed redundant content and applied the scoped 16px spacing correction. Two fresh 390×844 entry checks assert complete GPU art, room header, guide/action and CLAIM above fixed tabs at scrollY 0. Existing mobile/desktop grids and all 28 reflow checks pass. |
| Writing | Room instruction is “Six slots. One of each item type.” Wear text names the cause and fix; Repair hardware leads to the affected installed item. Fire-specific context is retained only for relevant active local fire damage. Existing persistent beta/demo labels remain. |
| Typography | Retained the local Pixel/Mono families and six-size scale. Mining rooms h1 retains the former section size; room h2 retains Mono 600/14px/1.5. Reviewed actual mobile/desktop text wrapping. Existing font-loading and enlarged-root-text tests passed. |
| Colors | Reused the established warning background/text/action styles. Full suite remeasured opaque rendered pairs: warning **13.26:1**, HUD supporting text **8.58:1**, cyan HUD value **12.76:1**, primary text **14.52:1**, body **18.04:1**. These describe those exact pairs, not all imagery or states. |
| UI | Reused the existing warning banner, repair link and native item menu. Tested healthy, worn, broken, mixed, spare-only, active-fire and expired-fire states plus repair removal of the warning. Guide skip/replay and primary interactions pass in reduced-motion contexts. No new animation or UI system was introduced. |

All applicable findings in this revision are fixed. Remaining coverage limits: Chromium only in this run; WebKit/Safari, Firefox, physical phones/safe areas, actual screen readers, native browser zoom, RTL/pseudo-localization and DevTools slow-motion replay were not performed. The 200% check changes root text size rather than native zoom. Axe retains incomplete color-contrast checks and one Farm `aria-prohibited-attr` check in its JSON; no accessibility certification is claimed. There is no live chain behavior to test in DEMO mode.

## Submission and publication

Both finding verdicts are in root `.imd-responses.json`. `DESIGN.md`, README and the short changelog describe the final implementation. The full static export, existing source and unchanged lockfile remain complete. Stale hashed export bundles were removed by Vite’s build; no dependency archives were added.

The job publisher handles the committed-export handoff, preferring **blackout** and otherwise retaining the current automatic label. This worker did not run a member-site publishing command or verify a new live CID. See [publication.md](publication.md). Git metadata was not modified; byte accounting measures deliverable files, not a separately created Git bundle.

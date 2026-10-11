# Changelog

## Review revision: visible rooms and wear recovery

- Removed the duplicate Farm intro and shortened its room instruction; the first room and starter GPU now appear above the tabs at 390×844 with onboarding retained.
- Added repair warnings for all worn installed hardware, including damage after a fire ends. Repair shortcuts distinguish worn items from broken ones.
- Rebuilt `dist/`. Strict typecheck/build, 67 engine/docs tests, 16 existing browser scenarios and four focused regressions passed. [Revision evidence](reports/fidelity-validation.md).

## Simpler first-play update

All gameplay numbers are **beta values, may change**.

- Split Farm, Packs, City, Season, Wallet and Docs into focused tabs; added the shared claim/status bar and mobile bottom navigation.
- Added skippable, replayable four-step onboarding, item-local menus, room combo chips and actionable mining warnings. Kept practice controls inside Demo tools.
- Added explicit farm sync, automatic sync on actions, a three-day idle pause that preserves earned rewards, and the weekly sync deadline.
- Corrected audits to a configurable hash threshold; set pack/lobby/sell revenue to 88/10/2; added swap fee and launch allocation wording. Removed merging throughout the current game.
- Added day-gated levels, a shared 400/day purchase XP cap, and average district scoring with a strict 10% wallet cap. Retained corrected rarity, Triple Core, overclock and tariff rules.
- Updated both guides, design documentation, production interaction checks and the complete relative-URL `dist/` export. Preserved old saves and the future ChainAdapter boundary.

Current evidence: [tabs validation](reports/tabs-validation.md), [browser results](reports/tabs-results.json). Publication is handed to the job plane with `blackout` preferred and the existing automatic label as fallback.


## Previous release: game design corrections

All gameplay numbers are **beta values, may change**.

- Corrected the BLACKOUT token launch through IMD on Robinhood Chain, contributor-agent allocation and reward-pool wording.
- Limited audits to the top 10% by hashrate; only 10% of that epoch’s mining enters the pool. Stored balances are untouched.
- Fixed rarity sets to Rare +5%, Epic +10%, Legendary +20%, Mythic +30%, with no Common bonus and only the strongest set active.
- Made Triple Core replace Compute Duo instead of stacking.
- Set overclock to +10% hash per level, up to 5, with increasing costs and a confirmation showing wear, power and tariff changes.
- Removed electricity reserves/refills; retained the 15% base mining tariff and its modifiers. Preserved existing demo saves, updated both guides and rebuilt `dist/`.

Validation: typecheck/build, 62 unit/documentation tests and 46 production-browser checks passed. Historical results and limitations: [rules validation](reports/rules-validation.md).

## Earlier delivery

Revision: kept the mobile beta notice visible, fixed docs returns and currency keyboard focus, moved inventory actions beside the selection, clarified task headings and stabilized mobile card reveals. Rebuilt `dist/`; 47 engine tests, 14 full browser checks and 18 focused revision checks pass.

- Split BLACKOUT into static Landing, Farm, Open Packs and Docs routes with shared browser saves.
- Added the complete beta demo model: 12 item types, five rarities, six-slot rooms, combinations, levels, pricing, inventory actions, taxes and upkeep.
- Expanded the city to eight districts with protected event effects, dispatcher letters, seasons, referrals and the demo NFT holder pack.
- Added staged pack opening, 60 pixel item sprites, reduced-motion support and a complete player guide.
- Refined mobile layouts, keyboard focus, confirmation flows and contrast; rebuilt the portable production export and social image.
- Verified 47 engine tests and 14 browser scenarios. Recorded publication handoff and remaining limitations.

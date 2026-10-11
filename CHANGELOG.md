# Changelog

## Game design corrections

All gameplay numbers are **beta values, may change**.

- Corrected the BLACKOUT token launch through IMD on Robinhood Chain, contributor-agent allocation and reward-pool wording.
- Limited audits to the top 10% by hashrate; only 10% of that epoch’s mining enters the pool. Stored balances are untouched.
- Fixed rarity sets to Rare +5%, Epic +10%, Legendary +20%, Mythic +30%, with no Common bonus and only the strongest set active.
- Made Triple Core replace Compute Duo instead of stacking.
- Set overclock to +10% hash per level, up to 5, with increasing costs and a confirmation showing wear, power and tariff changes.
- Removed electricity reserves/refills; retained the 15% base mining tariff and its modifiers. Preserved existing demo saves, updated both guides and rebuilt `dist/`.

Validation: typecheck/build, 62 unit/documentation tests and 46 production-browser checks passed. Current results and limitations: [rules validation](reports/rules-validation.md).

## Earlier delivery

Revision: kept the mobile beta notice visible, fixed docs returns and currency keyboard focus, moved inventory actions beside the selection, clarified task headings and stabilized mobile card reveals. Rebuilt `dist/`; 47 engine tests, 14 full browser checks and 18 focused revision checks pass.

- Split BLACKOUT into static Landing, Farm, Open Packs and Docs routes with shared browser saves.
- Added the complete beta demo model: 12 item types, five rarities, six-slot rooms, combinations, levels, pricing, inventory actions, taxes and upkeep.
- Expanded the city to eight districts with protected event effects, dispatcher letters, seasons, referrals and the demo NFT holder pack.
- Added staged pack opening, 60 pixel item sprites, reduced-motion support and a complete player guide.
- Refined mobile layouts, keyboard focus, confirmation flows and contrast; rebuilt the portable production export and social image.
- Verified 47 engine tests and 14 browser scenarios. Recorded publication handoff and remaining limitations.

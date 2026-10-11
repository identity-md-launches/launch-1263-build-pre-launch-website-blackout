# Revision validation

Complete for the stated revision scope. All six independent-review findings reproduced against the accepted `dist/` export before edits. Changes are limited to the affected labels, return/focus handlers, inventory ordering and mobile card minimum. Pixel art, palette, demo mechanics, saves and adapter architecture are retained.

The pinned Better Interface workflow and all six domain core principles were read and applied. [Before measurements](revision-before.json), [regression results](revision-results.json) and the root [.imd-responses.json](../.imd-responses.json) record this revision. The earlier review in [validation.md](validation.md) remains historical evidence; its old screenshots and coordinates do not describe the newly rebuilt export.

## Findings, fixes and rechecks

| Finding | Reproduced behavior | Final source and correction | Recheck |
| --- | --- | --- | --- |
| Mobile beta qualification (high) | At 320/390px, `.demo-strip span` was `display:none`, its box was zero and rendered body text contained no beta notice on Farm/Packs. Desktop was visible. | `src/style.css:484`: removed the mobile hiding rule; existing column layout places the notice on its own line. | Both routes visibly qualify values at 320, 390, 580, 768 and 1440px; screenshots show the notice in the first screen. |
| Docs return (medium) | Direct `#/docs`, scroll to Risks: clicking Back left hash/scroll unchanged at scrollY 17693. | `src/main.ts:237`, `src/docs.ts:122`: handle `.docs-back` directly, normalize a deep-link hash with history, focus the programmatically focusable contents heading and scroll contents into view. | All 19 same-hash links work with Enter at 320/390/1440px; deep-link returns and browser Back also retain section navigation. |
| Currency focus (medium) | ArrowRight selected Tokens but moved focus to BODY; ArrowLeft could not return to ETH. | `src/main.ts:160`: stable `currency-eth`, `currency-tokens`, `currency-free` IDs reuse existing render focus restoration. | Consecutive forward/backward arrows retain checked-radio focus at 320/390/1440px, including a holder free-pack credit. Yellow radio focus ring inspected in screenshot. |
| Inventory actions (medium) | Selected Power Supply at y546; Install at y1139 on a 390×844 viewport, after 15 cells. | `src/main.ts:111`, `src/main.ts:249`: move existing action panel after filter/before grid and scroll to it when the stacked Farm layout is active (≤820px). | At 390px, Install occupies y112.55–156.55; selected item follows at y266.92–419.92. At 320/768px, selection and Install also fit the viewport. All 15 cells remain; installation succeeds and selected actions collapse. |
| Task headings (medium) | Farm description occupied 44.78px; city, lobbying, referrals and pricing used the reported slogans. | `src/main.ts:87`, `src/main.ts:121`, `src/main.ts:131`, `src/main.ts:135`, `src/main.ts:163`: omit blank descriptions; use City grid, Lobby your district, Referrals and Pack pricing. | Farm renders zero description paragraphs; all headings match their task and Lobbying filed still appears after the action. Screenshots inspected. |
| Reveal displacement (medium) | Fresh Common Router reveal grew cards from 224 to 263.94px and moved Reveal all from y597.39 to y637.33. | `src/style.css:573`: increase mobile card minimum to 288px; existing grid stretches all three cards. | Fresh ordinary reveals preserve row height, next-control viewport position and scroll position. Every 12 types × 5 rarities at 320/390px preserves 288px through individual/all reveals; text and lock labels remain inside card bounds. |

The two writing findings are justified by identifiable functional panels and redundant space on the task screen. The landing tagline and dispatcher voice remain as implemented.

## Six-domain coverage

| Domain | Coverage and evidence | Limits |
| --- | --- | --- |
| Accessibility — Checked | Native links, buttons and radios retained; all docs return links receive keyboard activation; contents heading gets focus; consecutive currency arrows retain focus; installation works; existing keyboard, confirmation, reduced-motion and axe scenarios pass. Focus screenshot inspected. | No actual screen reader, forced-colors rendering or physical-device session. Passing axe is not full compliance. |
| Layout — Checked | Production export at `/preview/`; all routes reflow at 320/390/768/1440px. Inventory action panel and selected item are adjacent; all 15 cells remain. Card rows/control positions measured before/after actual reveals. Current narrow screenshots inspected. | No browser-native zoom, RTL or localization/pseudolocalization testing. Docs 200% text enlargement in the existing smoke suite is not native zoom. |
| Writing — Checked | Reproduced and replaced the four functional slogans; blank Farm description omitted without an empty paragraph. Beta wording visible on gameplay routes. Return/action labels describe what they do. | Other established copy was outside the bounded revision. |
| Typography — Checked | Existing fonts/six-size scale retained. All 60 item/rarity variants measured for containment at 320/390px; long names and equip levels inspected in screenshots. Local fonts load in smoke checks. | No additional languages or OS font stacks tested. |
| Colors — Checked | Palette unchanged. Rendered opaque beta notice pair: `#ffe600` / `#090e1d`, 15.17:1; install text: `#111323` / `#ffe600`, 14.52:1; filter text: `#edf2ff` / `#080e1e`, 17.17:1. Yellow focus versus surrounding opaque inventory panel: 15.17:1. Values computed from current rendered colors. | Gradients, art, all possible states and incomplete axe contrast checks remain unverified. Text contrast and outline contrast are measured against their respective backgrounds, not against an unrelated fill. |
| UI — Checked | Existing surfaces, sprite art, native controls, disabled states and confirmations preserved. Mobile reveal geometry stays stable, equip locks remain readable, and currency focus survives updates. Existing pack animation/reduced-motion scenario passes. | No browser Animations-panel replay at 10% speed or physical touch testing. |

## Commands and actual outcomes

Dependencies stayed in `/tmp/blackout-deps`, Chromium in `/tmp/blackout-browser`; no repository dependency directories, protected manifests/lockfiles, build configuration or ignore files were changed. Node: v24.21.0. Each browser script owns and closes its foreground preview and browser.

```sh
/tmp/blackout-deps/node_modules/.bin/tsc --noEmit
/tmp/blackout-deps/node_modules/.bin/vite build
BLACKOUT_TOOLCHAIN=/tmp/blackout-deps /tmp/blackout-deps/node_modules/.bin/vitest run
BLACKOUT_TOOLCHAIN=/tmp/blackout-deps PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browser node scripts/smoke.mjs
BLACKOUT_TOOLCHAIN=/tmp/blackout-deps PLAYWRIGHT_BROWSERS_PATH=/tmp/blackout-browser node scripts/review-regressions.mjs
node scripts/check-delivery.mjs
git diff --check
```

Typecheck and production build passed after the final source change. Engine tests: **47 passed**. Full production suite: **14 checks passed**, zero failures, console exceptions/errors, failed requests or HTTP errors. Focused revision suite: **18 checks passed**, zero failures or runtime/resource errors, including **120 item/rarity/viewport cases**. Delivery audit and whitespace checks passed; byte counts and export hashes are in [bundle-budget.json](bundle-budget.json).

The supplied Browser MCP could not launch: its Chrome executable at `/opt/imd-worker/ms-playwright/chromium-1246/chrome-linux64/chrome` was absent. The external pinned Playwright dependency supplied a working Chromium instead. Actual export screenshots were generated by that bounded script and opened with the image-view tool; no MCP rendering success is claimed for this revision.

An initial regression-script attempt compared viewport coordinates across Playwright's automatic scroll, and compared a yellow outline to the button fill instead of the surrounding panel. The harness was corrected to compare document coordinates for fixture rows and measure the actual surrounding outline background. A separate fresh-pack reproduction now also asserts unchanged viewport coordinates and scroll position. Those harness corrections required no further card/color source changes.

Fresh dependency installation reported four audit findings (one moderate, one high, two critical). Protected versions were kept; these development packages are absent from `dist/`.

## Current rendered evidence

Screenshots in [screenshots/revision/](screenshots/revision/) come from this final export, using Chromium and reduced motion. Inspected images: Farm first screen; currency focus; inventory actions; docs return; city, referrals and pricing; ordinary reveal at 390px; locked long-name cards at 320/390px. The runner also captures the ordinary 320px reveal.

The current landing action is at y340.75–388.75 in the 390×844 first screen; title and product description are also fully visible. The beta line increased the landing strip height by 19.19px, without obscuring the main action. Metadata, favicon, local fonts and social image pass the production suite.

No wallet/chain, real referrals/NFT ownership or publication URL was validated. Hosting remains the established job-submission handoff described in [publication.md](publication.md), with preferred label `blackout` and automatic label fallback. This revision prepares the complete static export for that handoff; it does not claim the new version is already live.

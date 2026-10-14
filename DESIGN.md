# BLACKOUT — implemented live-app design

This records the final implementation in `src/style.css`, `src/landing.ts`, `src/sprites.ts`, and `web/src/`. It describes the shipped export, not a proposed redesign. The original 16-bit city, three skyline layers, grid tower, dispatcher, hardware sprites, district landmarks, navy/purple sky and CRT scanlines remain. The landing now leads into a live wallet app.

## Product hierarchy

At 390 CSS pixels, the first screen shows BLACKOUT, a plain description of the mining game, the yellow **Enter your farm** action, the external **Free starter pack** link, Connect and the city art. The primary button is above the fold. The header's Free pack link and the hero's starter link both go to the independently hosted `https://playblackout.xyz/freepack`.

The landing continues with live chain statistics, How to play in 60 seconds, hardware, the dispatcher, Launch, Civic feature phases, FAQ and a final action. Farm, Packs, City, Season, Billboards, Contracts and Field guide are separate hash views. Farm groups rewards, rooms and inventory; item actions live in details disclosures. Packs separates purchase limits, eligibility and pending receipts. Each form places units and relevant instructions next to its controls.

## Color tokens

| Token | Value | Implemented use |
| --- | --- | --- |
| `--bg` / `--navy-950` | `#05060F` | Main background and dark text on the yellow action |
| `--surface` / `--navy-900` | `#090E1D` | Panels, wallet sheet and transaction feedback |
| `--surface-raised` / `--navy-850` | `#0E1428` | Inputs and elevated controls |
| `--hover` / `--navy-800` | `#141D33` | Hovered secondary controls |
| `--border` / `--navy-600` | `#354664` | Structural separators |
| `--border-control` | `#65748F` | Visible input/button boundaries |
| `--text` / `--gray-100` | `#EDF2FF` | Main text |
| `--muted` / `--gray-400` | `#B3BFD3` | Supporting information |
| `--accent` / `--cyan-400` | `#39E6FF` | Links, connection controls, city lights and Rare items |
| `--highlight`, `--focus` | `#FFE600` | Primary action, focus ring, launch emphasis and Legendary items |
| `--magenta-400` | `#FF3DF2` | Epic item accents and retained city light |
| `--danger` | `#FF869C` | Errors and destructive-action labels |
| `--color-success` | `#93F5C6` | Verified/live states and confirmed transaction border |
| `--common` / `--mythic` | `#BDC8DD` / `#FF6475` | Named item rarity treatments |

No state depends on hue alone: rarity has text, transaction states have words, disabled phases say Coming soon, and funding/read errors have explanations. Text is not rendered as a gradient. Cards use a background/separator without stacked border-and-shadow decoration; retained neon effects belong to the artwork.

Measured opaque color pairs use WCAG relative luminance: primary text/background 18.04:1, muted/raised surface 9.84:1, cyan/surface 12.76:1, dark/yellow action 15.94:1, error/surface 8.37:1, control border/raised surface 3.87:1. These measurements do not cover translucent gradients or artwork. The pinned rendered probe separately passed its measured-text contrast check and marked 20 text boxes over art/gradients unmeasured.

## Typography

Local **Press Start 2P** (`Pixel`, weight 400) supplies the brand and headings. Local **IBM Plex Mono** (`Mono`, weights 400 and 600) supplies data, controls and compact game labels. System UI sans serif handles longer descriptions, guide paragraphs and dispatcher quotes. The export bundles the three WOFF2 font files and uses `font-display: swap`.

The scale has six sizes: **12, 14, 16, 20, 32 and 64px**. Existing tokens are `--font-small`/`--font-label` 14px, `--font-body` 16px, `--font-title` 20px, `--font-display` 32px and `--font-logo` 64px. Twelve pixels is reserved for the six-item mobile navigation and narrow slot labels. At 390px the hero is 32px; desktop uses 64px. Long body text remains 16px, with 1.6 general line height and 1.75 in the guide. Headings use 1.4–1.6. Numeric readouts use tabular figures where appropriate.

Content uses normal capitalization. The BLACKOUT wordmark remains uppercase as identity. Small tracked uppercase eyebrow labels were removed. The rendered landing probe found three font families, two weights, four recurring sizes at each tested width and at most five sizes including one-offs.

## Spacing and responsive layout

The inherited spacing scale is **4, 8, 12, 16, 24, 32, 48 and 80px**. The outer wrapper caps at 1200px. Existing narrow-screen wrapper rules provide mobile gutters. Grid columns use `minmax(0, 1fr)` and wrapping text; addresses, hashes and receipt IDs can break anywhere. Wide data tables have their own horizontal scroll container.

- Above 1100px, the navigation sits in the header, district cards use four columns, and the game has room for multiple inventory columns.
- At 1100px and below, header navigation wraps, districts become two columns and inventory becomes two columns.
- At 760px and below, rooms and purchase/claim panels become one column; the guide navigation loses its sticky sidebar; addresses form a single-column list.
- At 600px and below, game navigation becomes six fixed bottom tabs with safe-area padding. The landing keeps its uncluttered header/hero and hides that bottom bar. Forms, receipt rows and item actions stack; wallet selection becomes a bottom sheet. Controls keep their labels and amounts.
- At 360px and below, the small brand icon is hidden, district cards and guide links use one column, and selected labels use the 12px size.

When root text exceeds 20px, `reflow-mode` lets the header wrap, makes it non-sticky, places game navigation in document flow, stacks statistics and guide links, and permits grid children to shrink. The 200% text-size check uses this layout.

Controls normally have a minimum 44px height; main actions use 48px and wallet rows 56px. Native select/input controls have visible labels, 16px input text, appropriate numeric input modes and explicit units. Links within prose retain normal inline treatment and adequate spacing. The probe's 24px-or-spacing target rule passed; ten inline targets were below its preferred 44px size.

## Components and states

**Header and wallet sheet.** One Connect control discovers named EIP-6963 wallets and hides the generic duplicate when named wallets exist. Official wallet marks identify mobile browser links and Coinbase Smart Wallet. The native dialog has a labeled heading, a close control, Escape support, focus trapping and focus restoration. Wrong-chain state offers Switch network; network addition is followed by an explicit switch.

**Live statistics.** Semantic definition lists show actual chain reads. Loading, unavailable, retry, unfunded and not-ready states are explicit. No demo value fills a failed read. Civic notices and flags control the phase labels; all eight flags are shown. Periodic reads update state; Refresh data is available on game pages.

**Farm.** Six slot buttons per room contain sprite, item name and durability. Empty slots offer placement. Item details contain place/unplace, repair and scrap actions; repair and room dialogs show fresh quotes. Scrap uses an irreversible-action confirmation and minimum payout. Reward claims show gross credits, estimated tax and net output from simulation. Insufficient eligibility disables the relevant action with adjacent explanation.

**Packs and reveal.** Token purchases show the quoted cost and exact approval. The ETH disclosure labels ETH input, minimum BLACKOUT output and maximum pack cost separately. Snapshot token IDs and free eligibility appear only after proof verification. Receipt rows show type, decimal ID, target/native blocks, remaining packs, capture state and the 256-block window. Active receipt clocks refresh every three seconds without replacing forms or moving focus. Reveal follows the upstream loop and presents the original hardware artwork as three cards; users can stop waiting between wallet requests.

**Transaction feedback.** A polite live region distinguishes awaiting wallet, pending, confirmed, reverted and error. Pending/finished states include an explorer link and hash. Known contract errors use their decoded names with recovery guidance. Busy state prevents duplicate actions. Failed reads offer Retry; a registry mismatch warns and disables writes. Optional local storage retains transaction hashes and receipt scan cursors, never keys.

**City, Season and Billboards.** The dispatcher and district art accompany chain values. Disabled modules remain Coming soon. Season scores are correctly labeled as token spend per active farm and counted BLACKOUT spend. Chain-supplied text is HTML-escaped. Billboard input mirrors the deployed character and length restrictions before requesting approval.

**Guide and contracts.** The guide has persistent section anchors and a readable prose column. Contract rows show full addresses and explorer/copy actions. The guide includes launch taxes, buying limits, claim windows, randomness, liquidity and contract risks.

## Accessibility and motion

A skip link, semantic header/nav/main/footer, logical headings, form labels, named buttons, text alternatives, semantic meters and status/error live regions support keyboard and assistive-technology use. Yellow 3px focus rings with 4px offsets are visible on interactive elements. Native dialogs trap focus. Page navigation moves focus to main without a page scroll jump; guide deep links scroll to their named section.

CRT scanlines and pixel art preserve the requested visual identity. A Pause city control stops ambient motion; the user's `prefers-reduced-motion` setting disables animations, transitions and smooth scrolling. The rendered probe observed 165 ambient animations normally and zero running under reduced motion. Sound starts off and requires a user action. Forced-colors rules preserve control boundaries and focus.

## Review evidence and boundaries

The pinned Better Interface guide was applied across accessibility, layout, writing, typography, colors and UI during implementation. The final pinned design probe passed **16/16** checks at 320, 390 and 1440px. The 390px first-screen screenshot was inspected manually; product and primary action are visible. Functional browser checks cover 320, 390, 768 and 1440px. See `reports/live/validation.md` for exact commands, findings, fixes, browser/axe coverage and remaining limits.

This is not a claim of complete WCAG conformance. Native screen readers, physical phones, external wallet onboarding and text-over-art contrast were not fully evaluated. The supplied on-chain phase/funding state limits real successful transaction testing; the populated game checks use controlled browser fixtures, with that boundary recorded explicitly.

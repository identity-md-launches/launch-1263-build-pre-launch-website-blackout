# Publication handoff — art and landing upgrade

Deliverable: the complete rebuilt `dist/` export, source, unchanged manifest/lockfile, design documentation, player guide and validation evidence. Runtime URLs are relative and were tested under `/preview/`; all navigation uses hashes.

Keep the exact label **blackout-mine-the-city-pray-the** and public domain **playblackout.xyz**. The corresponding existing name is **blackout-mine-the-city-pray-the.site.identitymd.eth**. `src/config.ts` now records that exact label; no fallback/new label is requested.

The pinned project input identifies the prior version as `ipfs://bafybeifvzbwfdzatfwrhybrjfa5qfnnvrpj74fqip3hoasmw6bzdnxx4ue`. It is historical context, not the CID of this new export.

The IdentityMD job plane performs publication after this submission. No direct publish command or on-chain action was run. The final CID, domain update and public X unfurl are not verified in this worker session. The protected legacy package publish command was not used.

The export includes `index.html`, hashed JS/CSS, three local fonts, logo favicon, 512px app icon, manifest and 1200×630 `og.png`. OG/Twitter image metadata uses the requested public domain; the same HTML metadata applies to all static hash routes. Upload the entire export without relocating assets.

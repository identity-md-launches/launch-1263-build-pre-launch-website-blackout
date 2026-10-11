# Publication handoff — BLACKOUT launch update

Deliver the complete `dist/` export under the existing **blackout-mine-the-city-pray-the** label. Keep **blackout-mine-the-city-pray-the.sites.imd.fun**, the existing **blackout-mine-the-city-pray-the.site.identitymd.eth** name, and **playblackout.xyz** associated with that label.

The IdentityMD job plane pins and publishes the submitted export after this task. No direct publication command was run. No new live CID, domain update or public availability is claimed. The protected legacy package publish script was not used.

Upload the contents of `dist/` together. It includes index.html, hashed JS/CSS, local fonts, favicon, manifest, 512px app icon and the retained 1200×630 OG image. Runtime assets use relative paths and were tested at `/preview/`; navigation uses hashes. Hosting does not need a build or rewrite service.

**Preserve the separate `https://playblackout.xyz/freepack` service.** This export links to it in the header and hero but intentionally contains no freepack page. The public OG/Twitter image URL is `https://playblackout.xyz/og.png`.

No wallet connection, deployment or chain mutation occurs. Contract addresses are maintained in the single `config.contracts` block in `src/config.ts`, currently “TBA at launch.” The site remains a demo even after those display values are filled.

Source, protected manifest/lockfile, export, player guide, README, DESIGN and current validation are supplied. Old validation files are historical. See `reports/launch-validation.md` for this revision’s results and limitations.

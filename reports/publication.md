# Publication handoff

This update delivers the rebuilt `dist/` export, source, unchanged dependency manifest/lockfile, player guide, design record and local validation evidence. Assets use relative URLs and the finished export was checked under `/preview/`.

Preferred label: **blackout** if available. Otherwise retain **blackout-mine-the-city-pray-the.site.identitymd.eth**. Availability does not block the submission; `src/config.ts` retains `siteLabel: 'blackout'`.

The supplied project record identifies the prior hosted version as `ipfs://bafybeibk3ndymeqog55pa3pxrulkn4xubneuxd4aohllwquz2e7yxz6m6u`. This is historical context, not a claim that the new export is already live.

The IdentityMD job plane publishes the submitted export after completion. No member-site publish command was run. The final CID and live update remain unverified until the plane completes that step. Naming does not require requester input.

The protected `npm run publish` script belongs to an earlier member-site workflow and was not used. On another static host, upload the complete contents of `dist/` without relocating assets or rewriting hash routes. Metadata, favicon and a local 1200×630 social image are included.

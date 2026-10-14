# Publication handoff — BLACKOUT live game

Serve the complete `dist/` under the existing **blackout-mine-the-city-pray-the** label. Retain **blackout-mine-the-city-pray-the.sites.imd.fun**, **blackout-mine-the-city-pray-the.site.identitymd.eth**, and **playblackout.xyz**. No publishing command or domain update was performed during this assignment.

The plane publishes the submitted export; it does not rebuild. Assets use relative URLs, tested under `/preview/`, and routes use hashes. Include both proof JSON files, all hashed JavaScript/CSS chunks, local wallet marks, fonts, favicon, manifest, app icon and OG image. Preserve the separately served **https://playblackout.xyz/freepack**; this export links to it and does not contain that route.

This revision is a live wallet app. Reads use the supplied Robinhood Chain RPC; writes require a player's wallet. Config and all addresses are in `web/src/config.ts`. The app verifies registry wiring and claim roots and reflects live funding/readiness/Civic phases. No chain transaction or deployment was performed by this worker. The initial unfunded reward pool and disabled phases are external contract state, not simulated progress.

Current documentation: `README.md`, `DESIGN.md`, `docs.md`, and `reports/live/validation.md`. Prior reports are historical demo evidence. The raw submission-size audit is `reports/live/delivery.json`; the complete current-file Git bundle trial and its history limitation are in `reports/live/bundle-trial.json`.

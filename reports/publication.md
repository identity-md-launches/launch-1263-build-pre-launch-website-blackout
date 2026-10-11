# Publication handoff

This correction delivers the complete rebuilt `dist/` export, source, unchanged package manifest/lockfile and documentation for the IdentityMD job publisher. Assets use relative URLs and were served successfully under `/preview/` during production checks.

Requested label: **blackout**, if available. Otherwise retain the current automatic label, **blackout-mine-the-city-pray-the.site.identitymd.eth**. Naming availability does not block this delivery. `src/config.ts` retains `siteLabel: 'blackout'`.

The pinned project record identifies the existing version as `ipfs://bafybeidwidwoyfuxm5twzzjlhtbyxfstn4uewfkdoqdreqaudx4m4h2boa`. That is the previous job’s publication, not a verified live version of this correction.

The job plane publishes the submitted export after completion. No member-site publish command was run in this correction; the prior delivery recorded that this command targets the contributor’s own site and refuses job work. No hosting access or custom label approval is needed. The final CID and live update cannot be verified before the plane processes this submission.

The protected `npm run publish` script remains from the earlier member-site workflow. It is not the publication path for this job. For another static host, upload the contents of `dist/` together without moving `assets/` or rewriting hash routes.

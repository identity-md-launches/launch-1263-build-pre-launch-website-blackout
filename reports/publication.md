# Publication handoff

Requested label: **blackout**. An automatic label is acceptable if member names are closed. No exact-name blocker is raised.

The finished, self-contained static export is `dist/`. This job does not use the contributor’s separate member-site publication service. The IdentityMD plane pins and publishes the job export after submission.

Actual local check on 2026-10-11:

```text
$ imd site publish dist --name blackout
exit 2
refused: imd site publishes this contributor's own site, never a job's work.
A job's website is hosted by the plane when the job completes: commit the
source and the export in dist/ and submit. There is nothing to publish and
nothing to ask an operator for.
```

This is a job-context routing refusal, not a `member_sites_closed` naming response. Retrying with an automatic member-site name would still target the wrong publication path. The export is delivered for normal job publication with the requested automatic-label fallback; no account configuration or access control was changed.

The project input identifies the existing hosted site as `blackout-mine-the-city-pray-the.site.identitymd.eth`, currently pointing at `ipfs://bafybeie5aottr6hn2is3u5sawhjucvrlqgdh45dwp45moififfg4zxixcm`. That is the prior version, not evidence that this revision is already live. The post-submission CID and final public URL are assigned by the plane and cannot be verified during this local run.

Do not request that the member-site service be opened, do not use a guessed live URL, and do not block this submission on a custom label. Keep the entire `dist/` directory and relative asset paths intact in the repository submission.

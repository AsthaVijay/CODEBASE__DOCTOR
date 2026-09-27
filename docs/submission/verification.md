# Final local verification — 2026-09-26

- TypeScript check: passed.
- Automated tests: 20 passed, zero failed (latest verification update).
- Next.js 15.5.26 production build: passed.
- Production HTTP workflow test: passed proposal creation, unchanged health before approval, rejection, explicit-approval requirement, successful application, improved health, duplicate-application protection, cross-origin rejection, ZIP download/upload, and partial verification for uploaded repositories.
- Provider for this final rehearsal: deterministic demo. No Bob calls or additional Bob credits were used.
- Live Bob proposal generation and Bob IDE test authorship are separately documented in [evidence](../evidence/README.md). This rehearsal does not claim a newly verified live-Bob end-to-end run.

The corrected server is running on http://127.0.0.1:3000 with the configured live Bob provider. Final HTTP regression checks used a separate demo-mode server on port 3001 without paid requests. To repeat a zero-credit rehearsal, use `BOB_PROVIDER=demo npm start` after building.

The expanded tests cover partial complexity improvement, unresolved finding retention, unchanged health, Java verification exclusions, rollback for worsening complexity or new findings, mixed-language syntax reporting, and explicit demo-provider messaging. The live Bob adapter was not called during this correction pass. Original user repositories and historical failed results were not reapplied or rewritten.

Still required: participant review of the on-screen recording, MP4 creation/upload, public repository publication and anonymous-access check, team-member evidence completeness, and final dashboard submission. No public publication or submission is claimed.

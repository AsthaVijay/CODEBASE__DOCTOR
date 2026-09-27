# Demo narration and screen cues

Target: 2 minutes 50 seconds. Rehearse timing; final MP4 must remain under 3 minutes. Keep the solution operating on screen from 0:15 through 2:10. Do not show credentials.

## 0:00–0:15 — Introduction

“Codebase Doctor helps developers move from repository warnings to reviewed, verified improvements. It brings diagnosis, proposed fixes, and human approval into one interface.”

## 0:15–0:40 — Dashboard and scan

Show the controlled demo, health score, category scores, and findings.

“Here is our demo repository. Deterministic rules identify issues, and category scores help prioritize them. These scores are transparent heuristics—not security certification or measured test coverage.”

## 0:40–1:00 — Select a finding

Use search or severity filters; select the hardcoded-credential finding.

“I can filter the findings and inspect a specific issue. The activity panel keeps the proposed treatment and verification steps visible alongside the repository report.”

## 1:00–1:30 — Proposal and rejection

Generate the demo proposal, inspect the diff, reject it, then request it again. Do not imply the deterministic provider is live AI.

“This recording uses the labelled deterministic adapter to conserve credits. We separately verified a real IBM Bob Shell proposal, documented in the repository. In either workflow, a proposal does not modify source files. I can inspect the diff and reject it without applying changes.”

## 1:30–2:10 — Approval and verification

Approve the demo proposal, show checks and health update, then show repository ZIP upload and its resulting report.

“Now I explicitly approve this change. Codebase Doctor applies it, verifies it, and rescans to update health. The controlled demo runs real tests. Users can also upload a repository ZIP. For uploaded repositories, we do not execute their test suites on this host; skipped tests are reported rather than represented as passing.”

## 2:10–2:35 — Actual Bob IDE contribution

Show the original Bob session completion screenshot and tests/bob-proposal.test.ts.

“IBM Bob IDE authored two regression tests protecting proposal validation against duplicate paths and no-op changes. This genuine session shows human approval and the passing result. We independently confirmed all fourteen tests pass. The repository distinguishes this Bob contribution from the application's prior Codex-assisted implementation.”

## 2:35–2:50 — Close

Show the actual public repository URL once available; do not invent one.

“Codebase Doctor keeps AI-assisted maintenance reviewable: diagnose, propose, approve, and verify. The repository includes runnable source, setup instructions, limitations, and original IBM Bob session evidence.”

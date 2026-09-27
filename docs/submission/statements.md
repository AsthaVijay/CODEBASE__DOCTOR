# Submission statements

Each statement below is under 500 words. Copy only the relevant statement body into its submission field.

## Problem & Solution Statement

Developers inheriting an unfamiliar repository often face scattered warnings without a clear path from identifying a problem to safely fixing it. Small teams need an understandable view of repository health, actionable findings, and evidence that a proposed change helps rather than creates another problem. AI-generated patches introduce an additional concern: developers must retain control over what changes.

Codebase Doctor is a local web application that brings diagnosis, treatment, and verification into one review workflow. Users upload a repository ZIP or explore a controlled demo. The application scans repository metadata and applies deterministic rules for issues such as hardcoded JavaScript credentials, SQL interpolation, risky eval usage, complexity, and missing tests. Category scores and a weighted health score make the findings easier to prioritize.

For a selected finding, the IBM Bob integration can request a structured code-change proposal. The interface presents the proposed diff alongside an activity timeline. Users can reject the proposal without changing files, or explicitly approve its application. Verification then checks the change and rescans the repository to show the resulting health update. Failed verification restores the original source.

The MVP uses Next.js, React, and Tailwind. A clearly labelled deterministic demo workflow remains available without AI credentials; live Bob failures are not disguised as successful AI responses. Uploaded repositories receive syntax checks and rule rescanning, while their test suites are deliberately not executed on the host. The controlled demo runs real tests. Health scores are transparent heuristics, not a security certification or measured test coverage.

Codebase Doctor demonstrates a practical approach to AI-assisted maintenance: prioritize understandable findings, keep proposed modifications behind human approval, and show what verification actually established.

## IBM Bob Usage Statement

IBM Bob contributed both through a genuine IDE development session and through Codebase Doctor's live proposal integration.

In IBM Bob IDE, a focused task requested two regression tests for the proposal validator: rejection of duplicate file paths and rejection of a no-op proposal. Bob read the scoped source and test files, proposed a new tests/bob-proposal.test.ts file, and paused for human approval. The completed session reported both new tests passing and a full-suite result of 14/14. A separate local run independently confirmed all 14 tests passed. The repository includes original screenshots of the submitted task, approval step, and completion summary in docs/evidence, alongside the Bob-authored test file.

The application also integrates IBM Bob Shell through a separate adapter in lib/bob/live.ts. It sends limited context for a selected finding and requests a structured proposal, with credential redaction, response validation, and restricted file paths. A real authenticated call returned a proposal for the controlled demo's src/config/api.js; the source remained unchanged while awaiting review. The application requires explicit approval before applying proposed changes and then performs verification and rescanning.

To conserve credits, deterministic scanning and local verification do not invoke Bob. The integration limits requests and keeps a local usage ledger, which does not replace IBM's account balance or track IDE usage. A separate, clearly labelled demo adapter supports use without credentials.

The broader application was implemented with Codex assistance; the evidence attributes the two regression tests specifically to Bob IDE and distinguishes that development contribution from the live Bob Shell integration. We do not claim the entire application was authored in Bob IDE.

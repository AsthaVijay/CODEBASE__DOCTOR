# IBM Bob IDE task-session evidence

Latest implementation and test status: [no-credit verification](no-credit-verification.md). That later pass was authorized Codex work, not Bob-authored evidence. The 14-test result below describes the original screenshot milestone.

Status: **completed and independently verified**. IBM Bob IDE created `tests/bob-proposal.test.ts` with two regression tests for duplicate paths and no-op proposals. Bob reported 14/14 tests passing. A separate local verification on 2026-09-26 also passed all 14 tests, with zero failures and no live Bob request.

This folder is reserved for genuine screenshots of the Bob IDE task session requested for the hackathon submission. A successful Bob Shell integration call is separate evidence and is not a substitute for an IDE session screenshot.

## Original task-session screenshots

1. [01-bob-ide-task.png](01-bob-ide-task.png): Codebase Doctor open in IBM Bob with the submitted task prompt visible. The editor contains the earlier evidence checklist; the live task is visible in the right-hand panel.
2. [02-bob-ide-approval.png](02-bob-ide-approval.png): User-supplied screenshot at 4:33:41 PM showing the write-file action awaiting human approval. This is approval evidence, not a code-diff screenshot.
3. [03-bob-ide-result.png](03-bob-ide-result.png): User-supplied screenshot at 4:36:04 PM showing Bob's completion summary, the created file, and its reported 14/14 passing result.

These are unmodified original screenshots, not reconstructed conversations. The editor visible in them contains an earlier checklist status; the Bob panel at right shows the session's progress and completion. No API key values are visible. Bob's completion summary reports rebuilding esbuild after a mixed-architecture binary failure; that repair is reported by Bob, not independently audited here.

The intended task prompt is in [task-prompt.md](task-prompt.md). The submitted message repeats this scope due to an input retry, without expanding it. It scopes the IDE contribution to two regression tests so additional Bob usage remains small. IDE usage is separate from the app's request ledger and must be checked in Bob's account UI.

## Existing live integration evidence

IBM Bob Shell returned a real proposal for `src/config/api.js`. The source remained unchanged while awaiting review. Bob task ID: `510025f39344e1953e608042c1b026f3`. This proves the live adapter call, not an IDE-authored implementation session.

The existing application was built in Codex. The two regression tests in [bob-proposal.test.ts](../../tests/bob-proposal.test.ts) were authored in the genuine Bob IDE session documented above. Do not claim the entire application was authored in Bob IDE.

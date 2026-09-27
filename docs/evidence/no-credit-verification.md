# No-credit reliability verification — 2026-09-27

After Bobcoins were exhausted, the user explicitly authorized Codex to finish local implementation and testing. The work described here was performed in Codex, not in an IBM Bob IDE task. Original Bob screenshots remain unchanged. No live Bob request was made in this pass; the running server uses BOB_PROVIDER=demo.

## Results

- Baseline: 52 tests passed before this pass.
- Final: 62 tests passed, 0 failed, 0 skipped.
- Type checking: passed (`node node_modules/typescript/bin/tsc --noEmit`).
- Production build: passed (Next.js 15.5.26).
- HTTP smoke: passed proposal creation, explicit approval requirement, reject, apply, repeat-approval rejection, origin check, ZIP upload, and incomplete uploaded verification.
- Browser: local demo proposal required approval; approval yielded Treatment verified and health 72 → 79. The new UI displayed Demo mode and no-live-call disclosure.
- Browser: unsupported complexity treatment displayed an actionable error, without a stuck spinner or file changes.

All commands used the installed `/usr/local/bin/node`. Production server started on port 3001 with the demo override. The older process on port 3000 could not be stopped under the available process permissions; use port 3001 for this verified build. Existing uploaded session data was preserved; browser demo testing used a separate localhost cookie scope.

## Implemented changes

- TS, TSX and JSX syntax parsing uses the installed production TypeScript dependency, without executing uploaded configuration. It is not type checking or behavioral validation. JS/CJS/MJS retain bounded node --check with a sanitized child environment.
- Missing uploaded-test sandbox is an explicit unsupported check and prevents verified status. All required checks must pass. New helpers do not masquerade as generated tests.
- Complexity context permits one new helper only if its path does not already exist. Validation still restricts proposed paths and rejects duplicate/no-op/invalid responses.
- Test paths recognize nested test directories, colocated files, safe JSON Jest roots/testMatch, and common Java/Python/Go naming. Executable configs are not imported; not every ecosystem is supported.
- New test files receive security scanning. A new insecure helper causes rollback of both original and new files. The SQL heuristic distinguishes query literals from HTTP method names without excluding real queries passed to db.get.
- Failed-proposal retry behavior is tested using a mocked adapter and prior feedback, without credits. Pending proposals remain reused.
- Client requests have a deadline, release busy state after errors, and never automatically retry mutations. Local-mode buttons disclose local proposals. Failed/incomplete verification receives distinct colors.

## Remaining limitations (not completed or claimed)

No Docker/Podman runtime was available. Uploaded repository tests are not executed, and arbitrary uploaded projects cannot receive full verification. Representative CJS and TSX fixtures passed supported syntax and rule checks, improved health, and correctly remained partial. Unsupported-language syntax remains unrun. Rule-based scanning is heuristic, not a full audit.

Live Bob inference requires credits; local recipes cannot replace general AI refactoring. No claim is made that every repository or all identified issues can be fixed. Human approval remains required. This pass did not publish a public repository, record an MP4, or submit the hackathon entry.

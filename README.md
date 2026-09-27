# Codebase Doctor

Diagnose. Treat. Verify. A local Next.js + React + Tailwind MVP built from the supplied specification and UI screenshot.

## Hackathon evidence

See [IBM Bob IDE task-session evidence](docs/evidence/README.md) for original screenshots of the submitted task, human approval step, and completion. The original Bob IDE contribution included two proposal-validation tests (14/14 tests at that milestone). Subsequent Bob work and the no-credit Codex reliability pass are documented separately. The current suite passes 62/62; see [latest verification](docs/evidence/no-credit-verification.md).

## Run

Requires Node.js 22 or later.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. For production: `npm run build` then `npm start`. The server binds to loopback; this is a local hackathon application, not a hosted multi-user service.

### Bob-only default

`npm run dev` and `npm start` explicitly select IBM Bob. There is no automatic local fallback when credentials are missing or credits run out. Old local proposals cannot be approved in Bob-only mode. Credit/quota errors are displayed without applying changes. A configured provider does not prove a successful live connection.

### Optional offline testing (not Bob-generated fixes)

Use `npm run build` then `npm run start:demo -- --port 3001`, and open http://localhost:3001. This explicitly overrides saved Bob configuration without modifying credentials. For development use `npm run dev:demo`. Demo mode uses local recipes, not a live AI service. The controlled demo supports credential remediation, its included SQL query, and authentication test generation. Other findings may require a manual fix or a funded live provider; arbitrary repository refactoring is not available offline.

On this Mac, `/usr/local/bin/node` was used for verification to avoid the previously encountered mixed-architecture Node environment. If your terminal selects a different Node installation and reports native-module errors, select the matching installed Node runtime before running npm.

## IBM Bob connection

1. Install IBM Bob Shell from https://bob.ibm.com/docs/shell/getting-started/install-and-setup and complete its initial sign-in/license flow in your own terminal.
2. Copy `.env.example` to `.env.local` and enter an Inference API key as `BOB_API_KEY`, or point `BOB_API_KEY_FILE` at an existing local key file. The latter accepts plain keys, a BOB_API_KEY assignment, or JSON fields apiKey/api_key/apikey/key. Never add credentials to version control. A key exported in a separate terminal is not automatically visible to this app.
3. Use an **Inference** API key for automated proposals. Browser sign-in alone did not authenticate `bob run` in the installed Bob Shell 2.0.5. General keys also require `BOB_TEAM_ID`. A local `.pages` key document is supported; it is decoded on this Mac without an external conversion service.
4. Restart the server. Settings shows whether Bob is configured. A successful proposal is the proof that authentication works; configuration alone is not labelled a successful connection.
5. Choose a single finding and click **Fix with IBM Bob**. The adapter invokes `bob run --format json` with a maximum of two turns and a default 0.5 Bobcoin limit. No automatic retry is made.

Source: https://bob.ibm.com/docs/shell/getting-started/start-bobshell-non-interactive

The app supports the documented Bob Shell 2.x result envelope. Bob receives the selected file, a compact repository summary, and the selected finding. Detected credential literals are redacted. Repository material is treated as data. All documented read/edit/execute/MCP/skill/subagent/mode tools are disabled, and Bob runs in an empty temporary workspace. The model returns a JSON proposal; source files are not writable through this path. Only explicitly allowed paths and bounded source text are accepted.

`lib/bob/live.ts` implements the provider; `lib/bob/adapter.ts` retains the zero-credit demo recipes. Live failures are displayed as errors and never silently replaced with a demo response.

### 40 Bobcoin budget

`BOB_MAX_COST` defaults to **0.5**, with this application's allowed range above 0 and at most 1. The persistent ledger `.doctor/bob-usage.json` covers **all sessions in this app** against a 40-Bobcoin budget. Requests are serialized with a filesystem lock. A call reserves its full cap before execution; confirmed usage replaces the reservation. If usage cannot be confirmed, the full reservation remains counted. Interrupted calls leave a lock that requires local inspection before retrying. Scan, diff review, approval, and verification do not call Bob.

This ledger is not the account balance and cannot track spending in the IBM Bob IDE or other applications. Bob's per-session cap may stop only after a metered model response; the app records actual reported usage even if it exceeds the reservation. Review the account balance before substantial use.

## Workflow

### Verification outcomes

An approved complexity reduction that remains above the scanner threshold is retained as **Improved · finding unresolved**, not marked verified. The finding remains and its severity-based health penalty is unchanged. Unchanged/worse complexity, failing supported syntax checks, or additional detected rule findings cause rollback. Uploaded repositories remain **partial** even when the target rule clears because their tests are not run. Mixed-language changes list unsupported syntax checks explicitly.

Historical failed proposals keep their original results; upgrading does not apply or rewrite them. Review any new proposal before approval. A fully verified seven-stage demonstration is supported by the controlled JavaScript demo, not arbitrary Java uploads without an isolated Java test runner.

- Initial load scans the controlled E-commerce demo.
- ZIP upload accepts up to 20 MB extracted content, 1 MB per file, and 2,000 files. Archive traversal, symlinks, encrypted entries, and duplicate paths are rejected. Common generated/dependency directories are excluded.
- Deterministic rules cover hardcoded JS credentials, SQL interpolation, eval, module decision-count complexity, missing tests, a local Express version policy, and missing README documentation.
- Category scores start at 100. Penalties are critical 26, high 24, medium 16, and low 8; missing lockfile subtracts 8 from Dependencies. The weighted score is Security 25%, Code Quality 20%, Testing 20%, Dependencies 15%, Documentation 10%, Performance 10%.
- These are Codebase Doctor heuristics, not industry-standard metrics. No live dependency advisory lookup or performance benchmark is included. Test-file discovery is not measured coverage. Displayed counts come from actual findings, not the screenshot's illustrative numbers.
- Reject preserves the files. Approve checks that the proposal is current, applies exactly the displayed files, runs verification, rescans, and updates health. Failed verification restores the original source.
- The controlled demo runs real Node.js tests. Uploaded project tests are **not executed on the host**; syntax checking and rule rescanning run, and unrun tests are clearly listed. Download the treated ZIP to run its suite in your own environment.
- New scans replace the current session's report and treatment history. Data survives a restart in `.doctor/`. The source demo folder remains unchanged.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

The tests use local fixtures and do not spend Bobcoins. They check deterministic findings, no changes before approval, successful remediation, stale-proposal rejection, rollback, live response validation, ZIP path validation, and budget reservations.

## UI

The interface preserves the reference's dark desktop three-column layout, serif titles, peach buttons, category bars, issue cards, persistent agent timeline, code diff, and review controls. Sidebar controls, search, severity/category filters, metadata tabs, ZIP upload, treatment history, and settings are functional. Smaller screens stack the activity panel below the report.
# CODEBASE__DOCTOR

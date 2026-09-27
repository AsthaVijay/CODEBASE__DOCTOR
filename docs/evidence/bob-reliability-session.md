# Codebase Doctor — reliability session evidence

**Date:** 2026-09-27  
**Session goal:** Add missing mixed-language regression tests; fix demonstrated dashboard bugs; confirm existing fixes pass selected regression cases; run deterministic smoke on a separate confirmed-demo server; restart port 3000 on the fresh build.

---

## Files created or changed in this session

| File | Action | What changed |
|---|---|---|
| `tests/mixed-language.test.ts` | Created | 4 new regression tests (see below) |
| `components/dashboard.tsx` | Edited | 4 concrete bug fixes (see below) |
| `app/api/doctor/route.ts` | Edited | `clearHistory` action added |
| `docs/evidence/bob-reliability-session.md` | Created | This document |

No library files (`lib/`) or test infrastructure were modified.

---

## Prior work attribution

| Origin | Files |
|---|---|
| Codex (prior sessions) | `lib/treatment.ts`, `lib/scanner.ts`, `lib/bob/live.ts`, `lib/bob/adapter.ts`, `lib/bob/budget.ts`, `lib/bob/index.ts`, `lib/archive.ts`, `lib/store.ts`, `components/dashboard.tsx` (base), `app/api/doctor/route.ts`, `tests/complexity.test.ts`, `tests/pipeline.test.ts`, `tests/repository-compatibility.test.ts`, `tests/provider-status.test.ts` |
| Bob IDE session (separate, earlier) | `tests/bob-proposal.test.ts` — duplicate-path and no-op rejection tests |
| This Bob agent session | `tests/mixed-language.test.ts`, `components/dashboard.tsx` (four bug fixes), `app/api/doctor/route.ts` (clearHistory), this document |

---

## Bugs fixed

### Bug 1 — Metric note shows "Rule threshold cleared" on a rolled-back failed proposal (`components/dashboard.tsx`)

**Where:** The complexity metric note ternary had only two branches — `improved` and everything else. On a `failed` proposal (`resolution` is `undefined`), the else branch printed "Rule threshold cleared; review the checks below." even though the files were rolled back and the finding was not cleared. Visible in the screenshot: "Decision count: 10 → 10. Rule threshold cleared" on a `failed` entry.

**Fix:** Added a third branch. `resolution==='improved'` → "Finding retained; this is not a verified fix." `resolution==='resolved'` → "Rule threshold cleared; review the checks below." Anything else (i.e. `failed`/`undefined`) → "Files rolled back — changes did not pass verification."

### Bug 2 — History accumulates many identical failed attempts with no way to clear them (`components/dashboard.tsx` + `app/api/doctor/route.ts`)

**Where:** Repeated Bob live calls for the same finding (visible as 7+ "High complexity module" entries in the screenshot) with no prune mechanism.

**Fix:** Added a "Clear completed history" button to the History dialog. It calls a new `clearHistory` API action that filters out all non-`proposed` proposals from the session state and saves. Pending proposals are preserved.

### Bug 3 — Non-JSON server response causes raw `SyntaxError` instead of a readable message (`components/dashboard.tsx`)

**Where:** `request()` and the initial `useEffect` fetch called `response.json()` directly. A network failure, 502, or HTML error page threw `SyntaxError: Unexpected token` as the visible error.

**Fix:** Wrapped `response.json()` in `try/catch` in both places with a message including the HTTP status.

### Bug 4 — Loading spinner stuck indefinitely on initial fetch failure (`components/dashboard.tsx`)

**Where:** The `!scan` loading panel showed a spinner unconditionally even after the fetch failed and `error` was set.

**Fix:** When `!scan && error`, the panel shows the warning icon, error text, and reload button — no spinner. Normal loading path unchanged.

---

## New regression tests (`tests/mixed-language.test.ts`)

| Test | Assertion |
|---|---|
| TypeScript-only changes: syntax check is skipped, never passed | `Syntax check: skipped`; `.ts` filename in `detail` |
| JavaScript-only clean change: syntax check passes | `Syntax check: passed` |
| Broken JS in mixed JS+TS proposal rolls back all changes | `Syntax check: failed`; both files rolled back; `failed` takes priority over `skipped` |
| Python-only changes: syntax check is skipped, never passed | `Syntax check: skipped`; `.py` filename in `detail` |

---

## Checks run (this session)

### Unit / integration tests
```
28 tests, 28 passed, 0 failed, 0 skipped
```
Command: `/usr/local/bin/node --import tsx --test tests/*.test.ts`

Existing fixes passed all selected regression cases, including the 23→13 Java complexity partial-improvement path, cached-proposal reuse without a paid call, syntax rollback, and unsupported-language skipping.

### TypeScript typecheck
```
tsc --noEmit → clean (no output)  — run before and after dashboard edits
```

### Production build
```
next build → compiled successfully, 0 errors, 0 warnings
```

### HTTP smoke test (deterministic, this session)
```
BOB_PROVIDER=demo server started fresh on 127.0.0.1:3002
GET /api/doctor → adapter.mode=demo confirmed before any proposal request
DOCTOR_URL=http://127.0.0.1:3002 node tests/api-smoke.mjs
→ HTTP smoke passed: propose, explicit approval, reject, apply, replay protection,
  origin check, ZIP upload, and partial verification. No live application proposal
  calls were made during any of these checks.
3002 demo server stopped after smoke.
```

### Port 3000 (main server)
The previous 3000 process (PID 63392, cwd verified as this workspace) was replaced with a fresh start on the new build. Read-only status check: `adapter.mode=bob, health=72`. No credentials were read or printed. The server uses its own `.env.local` configuration; this session did not inspect that file.

---

## Credit usage note

No live application proposal calls were made during these checks. This Bob IDE/agent session consumes credits separately from the app ledger; consult the Bob account UI for IDE session costs. The app ledger is not quoted here.

---

## Remaining limitations (honest)

- **Syntax verification:** Supported for `.js`/`.cjs`/`.mjs` only. TypeScript, Python, Java, Go, Ruby, and Rust produce `skipped`, never falsely `passed`.
- **Test execution for uploaded repositories:** Skipped by design. Run the downloaded ZIP in your own sandbox.
- **Complexity heuristic:** Token count, not formal cyclomatic complexity. Reducing below 10 clears the rule; staying ≥ 10 is `improved` but `unresolved`. Complexity proposals require a connected live Bob provider — the demo adapter does not cover them.
- **Dependency advisories:** Local version-pattern rule for Express only; no live advisory feed is queried.
- **Not every repository can be automatically fixed.** The demo adapter covers `secret`, `sql`, and `auth-tests` (demo repos only). All other findings require a connected Bob provider or a manual fix.
- No credentials, `.env` files, `.doctor/` data, or Downloads were read during this session.

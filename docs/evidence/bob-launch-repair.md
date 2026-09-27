# Bob Shell launch repair — 2026-09-27

The user requested restoration of the previously working Bob-only integration.

Read-only local checks found the configured Bob executable and credential file present. Invoking the Bob npm launcher through its `#!/usr/bin/env node` shebang failed locally with `SecItemCopyMatching failed -50`. Invoking the same launcher explicitly with `/usr/local/bin/node` returned Bob Shell 2.0.5 successfully.

The live adapter now launches Node-based Bob scripts with the application's own Node executable. Native executables retain direct invocation. This avoids selecting the unrelated Node runtime earlier on PATH. Authentication configuration and credentials were not modified. No demo fallback was introduced.

66 automated tests passed, including two launcher regression tests. No inference request was made during this repair. The successful local version check does not establish remote authentication, available Bobcoins, or successful proposal generation. Those remain unverified until a live request succeeds.

## Subsequent diagnostic: confirmed remaining blocker

The user requested further diagnosis after the launch repair. A minimal diagnostic capped at 0.1 Bobcoin first failed locally with `attempt to write a readonly database`. Write permission was granted specifically for `~/.bob/db` and `~/.bob/logs/shell`. Retrying the minimal diagnostic then returned: `Error: Budget Exceeded. Oh no! It looks like you've gone over your budget allowance of 40 Bobcoins.` No proposal was returned and no source changes were applied. Actual service usage was not reported, so the app conservatively retained the diagnostic reservations.

This confirms a credit-budget blocker after the local database permission issue was removed. The UI error classifier now recognizes both observed errors. The server must run with Bob database/log write access (for example from the user's normal terminal), and the IBM account needs additional credits before live proposals can succeed. Do not reset the app usage ledger or substitute local proposals as a workaround.

/**
 * Regression tests for mixed-language repository verification.
 *
 * These tests exercise the syntax-check branching in treatment.ts to ensure
 * unsupported languages are never reported as "passed" and that a failing JS
 * syntax check still triggers a rollback even when unsupported files are
 * present in the same proposal.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {scanRepository} from '../lib/scanner';
import {applyAndVerify} from '../lib/treatment';
import type {Repository, Proposal} from '../lib/types';

// Minimal JS source that triggers the hardcoded-credential rule.
const credentialSource = `const API_KEY = "sk_demo_not_a_real_secret_123abc";\nmodule.exports={API_KEY};\n`;
const cleanSource     = `const API_KEY = process.env.API_KEY;\nmodule.exports={API_KEY};\n`;
const brokenJs        = `const broken = ;\n`;

async function makeRepo(files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'doctor-ml-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    await fs.mkdir(path.dirname(abs), {recursive: true});
    await fs.writeFile(abs, content);
  }
  return root;
}

// ── 1. TypeScript-only change: syntax check must be skipped, not passed ────────
test('TypeScript-only changes: real parser checks syntax', async () => {
  const root = await makeRepo({'src/index.ts': `const x: number = 1;\nexport default x;\n`});
  try {
    const scan = await scanRepository(root);
    // Inject a synthetic issue against the TS file so we have something to treat.
    const issue = {id: 'ts-synthetic', severity: 'medium' as const, category: 'Code Quality' as const,
      title: 'Synthetic', description: '', file: 'src/index.ts', line: 1,
      rule: 'Test', recommendation: '', fixKind: 'eval' as const};
    scan.issues.push(issue);
    const p: Proposal = {
      id: 'ts-test', issueId: 'ts-synthetic', title: 'Synthetic TS fix',
      provider: 'demo', status: 'proposed', explanation: 'test',
      changes: [{path: 'src/index.ts', before: `const x: number = 1;\nexport default x;\n`, after: `const x: number = 2;\nexport default x;\n`}],
      checks: [], before: scan, createdAt: new Date().toISOString(),
    };
    const repo: Repository = {id: 'ts', kind: 'upload', label: 'TS', scan, proposals: [p]};
    await applyAndVerify(root, repo, p.id);
    const syntaxCheck = p.checks.find(c => c.name === 'Syntax check');
    assert.ok(syntaxCheck, 'Syntax check entry must be present');
    // TS is now checked via esbuild parse-only — valid TS must pass, not skip.
    assert.equal(syntaxCheck.status, 'passed',
      `Valid TypeScript file must produce passed, not ${syntaxCheck.status}`);
  } finally {
    await fs.rm(root, {recursive: true, force: true});
  }
});

test('SQL injection rule does not fire on HTTP client method calls or URL path interpolations', async () => {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'doctor-sql-fp-'));
  try {
    // HTTP client DELETE with URL path — must NOT be flagged (false positive seen in real upload).
    await fs.writeFile(path.join(root, 'users.ts'),
      'async deleteUser(id: number) {\n  return this.client.delete(`/users/${id}`);\n}\n');
    // Real SQL with interpolation — MUST be flagged.
    await fs.writeFile(path.join(root, 'migrator.js'),
      'db.query(`SELECT name FROM ${tableName} ORDER BY executed_at`);\n');
    const scan = await scanRepository(root);
    const sql = scan.issues.filter(i => i.fixKind === 'sql');
    assert.ok(!sql.some(i => i.file === 'users.ts'),
      'HTTP client .delete() with URL path must not be reported as SQL injection');
    assert.ok(sql.some(i => i.file === 'migrator.js'),
      'Real SQL string interpolation must still be detected');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

// ── 2. JavaScript-only clean change: syntax check must pass ────────────────────
test('JavaScript-only clean change: syntax check passes', async () => {
  const root = await makeRepo({'src/config/api.js': credentialSource});
  try {
    const scan = await scanRepository(root);
    const issue = scan.issues.find(i => i.fixKind === 'secret')!;
    assert.ok(issue, 'Hardcoded-credential issue must be detected');
    const p: Proposal = {
      id: 'js-clean', issueId: issue.id, title: issue.title,
      provider: 'demo', status: 'proposed', explanation: 'env var',
      changes: [{path: issue.file, before: credentialSource, after: cleanSource}],
      checks: [], before: scan, createdAt: new Date().toISOString(),
    };
    const repo: Repository = {id: 'jsclean', kind: 'upload', label: 'JSClean', scan, proposals: [p]};
    await applyAndVerify(root, repo, p.id);
    const syntaxCheck = p.checks.find(c => c.name === 'Syntax check')!;
    assert.equal(syntaxCheck.status, 'passed',
      'Pure JS clean change must produce a passed syntax check');
  } finally {
    await fs.rm(root, {recursive: true, force: true});
  }
});

// ── 3. JS syntax failure in a mixed JS+TS proposal rolls back all changes ──────
test('Broken JS in mixed JS+TS proposal rolls back and reports failed', async () => {
  const root = await makeRepo({
    'src/config/api.js': credentialSource,
    'src/index.ts': `const x: number = 1;\nexport default x;\n`,
  });
  try {
    const scan = await scanRepository(root);
    const issue = scan.issues.find(i => i.fixKind === 'secret')!;
    assert.ok(issue);
    const p: Proposal = {
      id: 'js-broken-mixed', issueId: issue.id, title: issue.title,
      provider: 'demo', status: 'proposed', explanation: 'bad fix',
      changes: [
        {path: issue.file,        before: credentialSource,                         after: brokenJs},
        {path: 'src/index.ts',    before: `const x: number = 1;\nexport default x;\n`, after: `const x: number = 2;\nexport default x;\n`},
      ],
      checks: [], before: scan, createdAt: new Date().toISOString(),
    };
    const repo: Repository = {id: 'jsmixed', kind: 'upload', label: 'Mixed', scan, proposals: [p]};
    await applyAndVerify(root, repo, p.id);

    assert.equal(p.status, 'failed', 'Proposal with broken JS must fail');
    const syntaxCheck = p.checks.find(c => c.name === 'Syntax check')!;
    assert.equal(syntaxCheck.status, 'failed',
      'Syntax check must be failed when JS is broken, even with unsupported TS file');
    // Both files must be rolled back to original content.
    assert.equal(await fs.readFile(path.join(root, issue.file), 'utf8'), credentialSource,
      'JS file must be rolled back');
    assert.equal(await fs.readFile(path.join(root, 'src/index.ts'), 'utf8'),
      `const x: number = 1;\nexport default x;\n`,
      'TS file must be rolled back');
  } finally {
    await fs.rm(root, {recursive: true, force: true});
  }
});

// ── 4. Python-only change: syntax check skipped, never falsely passed ──────────
test('Python-only changes: syntax check is skipped, never passed', async () => {
  const root = await makeRepo({'app.py': `def greet(name):\n    return "hello " + name\n`});
  try {
    const scan = await scanRepository(root);
    const issue = {id: 'py-synthetic', severity: 'medium' as const, category: 'Code Quality' as const,
      title: 'Synthetic', description: '', file: 'app.py', line: 1,
      rule: 'Test', recommendation: '', fixKind: 'eval' as const};
    scan.issues.push(issue);
    const p: Proposal = {
      id: 'py-test', issueId: 'py-synthetic', title: 'Synthetic PY fix',
      provider: 'demo', status: 'proposed', explanation: 'test',
      changes: [{path: 'app.py', before: `def greet(name):\n    return "hello " + name\n`,
                                  after:  `def greet(name):\n    return f"hello {name}"\n`}],
      checks: [], before: scan, createdAt: new Date().toISOString(),
    };
    const repo: Repository = {id: 'py', kind: 'upload', label: 'Py', scan, proposals: [p]};
    await applyAndVerify(root, repo, p.id);
    const syntaxCheck = p.checks.find(c => c.name === 'Syntax check')!;
    assert.equal(syntaxCheck.status, 'skipped',
      `Python file must produce skipped, not ${syntaxCheck.status}`);
    assert.match(syntaxCheck.detail, /app\.py/,
      'Detail must name the unsupported Python file');
  } finally {
    await fs.rm(root, {recursive: true, force: true});
  }
});

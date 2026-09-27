/**
 * Regression tests for the pure finalStatus helper and detectTestConvention.
 * No paid calls, no adapter, no filesystem — all inputs are synthetic.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {finalStatus, detectTestConvention} from '../lib/treatment';
import {applyAndVerify} from '../lib/treatment';
import {scanRepository} from '../lib/scanner';
import type {Check, Repository, Proposal} from '../lib/types';

// ── helpers ───────────────────────────────────────────────────────────────────
function allPass(extra: Partial<Check>[] = []): Check[] {
  return [
    {name:'Syntax check',      status:'passed', detail:'ok'},
    {name:'Existing tests',    status:'passed', detail:'ok'},
    {name:'Targeted re-scan',  status:'passed', detail:'ok'},
    {name:'Regression re-scan',status:'passed', detail:'ok'},
    ...extra as Check[],
  ];
}

// ── finalStatus unit tests ────────────────────────────────────────────────────

test('finalStatus: all required checks passed, no tests added, not improved → verified', () => {
  assert.equal(finalStatus(allPass(), false, false), 'verified');
});

test('finalStatus: improved → partial even when all other checks pass', () => {
  assert.equal(finalStatus(allPass(), true, false), 'partial');
});

test('finalStatus: Syntax check skipped → partial', () => {
  const checks = allPass();
  checks.find(c=>c.name==='Syntax check')!.status = 'skipped';
  assert.equal(finalStatus(checks, false, false), 'partial');
});

test('finalStatus: Syntax check warning → partial (warning is not passed)', () => {
  const checks = allPass();
  checks.find(c=>c.name==='Syntax check')!.status = 'warning';
  assert.equal(finalStatus(checks, false, false), 'partial');
});

test('finalStatus: Existing tests skipped → partial', () => {
  const checks = allPass();
  checks.find(c=>c.name==='Existing tests')!.status = 'skipped';
  assert.equal(finalStatus(checks, false, false), 'partial');
});

test('finalStatus: Existing tests warning → partial', () => {
  const checks = allPass();
  checks.find(c=>c.name==='Existing tests')!.status = 'warning';
  assert.equal(finalStatus(checks, false, false), 'partial');
});

test('finalStatus: Targeted re-scan skipped → partial', () => {
  const checks = allPass();
  checks.find(c=>c.name==='Targeted re-scan')!.status = 'skipped';
  assert.equal(finalStatus(checks, false, false), 'partial');
});

test('finalStatus: Targeted re-scan warning → partial (complexity improved but unresolved)', () => {
  const checks = allPass();
  checks.find(c=>c.name==='Targeted re-scan')!.status = 'warning';
  assert.equal(finalStatus(checks, false, false), 'partial');
});

test('finalStatus: Regression re-scan missing → partial', () => {
  const checks = allPass().filter(c=>c.name!=='Regression re-scan');
  assert.equal(finalStatus(checks, false, false), 'partial');
});

test('finalStatus: proposalAddsTests=true and Generated tests skipped → partial', () => {
  const checks = allPass([{name:'Generated tests',status:'skipped',detail:'none'}]);
  assert.equal(finalStatus(checks, false, true), 'partial');
});

test('finalStatus: proposalAddsTests=true and Generated tests passed → verified', () => {
  const checks = allPass([{name:'Generated tests',status:'passed',detail:'ok'}]);
  assert.equal(finalStatus(checks, false, true), 'verified');
});

test('finalStatus: proposalAddsTests=false and Generated tests absent → verified', () => {
  // Generated tests not added by this proposal — its absence does not prevent verified.
  assert.equal(finalStatus(allPass(), false, false), 'verified');
});

test('finalStatus: no-tests-found skipped (Existing tests) → partial, never verified', () => {
  // "No existing tests found" produces skipped — must not yield verified.
  const checks = allPass();
  checks.find(c=>c.name==='Existing tests')!.status = 'skipped';
  checks.find(c=>c.name==='Existing tests')!.detail = 'No existing tests found.';
  assert.equal(finalStatus(checks, false, false), 'partial');
});

// ── upload repo partial verification (integration) ───────────────────────────

test('upload repo: approved treatment is partial because tests are skipped', async () => {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'doctor-upload-'));
  try {
    const before = `const API_KEY = "sk_demo_not_a_real_secret_123abc";\nmodule.exports={API_KEY};\n`;
    const after  = `const API_KEY = process.env.API_KEY;\nmodule.exports={API_KEY};\n`;
    await fs.writeFile(path.join(root,'api.js'), before);
    const scan = await scanRepository(root);
    const issue = scan.issues.find(i=>i.fixKind==='secret')!;
    const p: Proposal = {
      id:'upload-test', issueId:issue.id, title:issue.title,
      provider:'demo', status:'proposed', explanation:'env var',
      changes:[{path:'api.js', before, after}],
      checks:[], before:scan, createdAt:new Date().toISOString(),
    };
    const repo: Repository = {id:'u', kind:'upload', label:'Upload', scan, proposals:[p]};
    await applyAndVerify(root, repo, p.id);
    assert.equal(p.status, 'partial', 'upload with skipped tests must be partial, not verified');
    const existing = p.checks.find(c=>c.name==='Existing tests')!;
    assert.equal(existing.status, 'unsupported');
    // Must not contain string-based sentinel — check uses name/status only
    assert.ok(!existing.detail.includes('not executed on this host'),
      'old sentinel string must not appear');
    assert.match(existing.detail, /sandboxed test runner is not configured|not configured on this installation|No sandboxed test runner is configured on this installation/);
  } finally {
    await fs.rm(root, {recursive:true, force:true});
  }
});

// ── detectTestConvention unit tests ──────────────────────────────────────────

test('detectTestConvention: tests/ dir → tests/ glob', () => {
  const r = detectTestConvention(['tests/foo.test.js','src/index.js'], {});
  assert.equal(r.testGlob, 'tests/');
});

test('detectTestConvention: __tests__/ dir → __tests__/ glob', () => {
  const r = detectTestConvention(['__tests__/foo.test.js','src/index.js'], {});
  assert.equal(r.testGlob, '__tests__/');
});

test('detectTestConvention: test/ dir → test/ glob', () => {
  const r = detectTestConvention(['test/foo.js'], {});
  assert.equal(r.testGlob, 'test/');
});

test('detectTestConvention: no test dir → colocated', () => {
  const r = detectTestConvention(['src/index.js','src/index.test.js'], {});
  assert.equal(r.testGlob, 'colocated');
});

test('detectTestConvention: jest config in package.json → jest runner', () => {
  const r = detectTestConvention([], {jest:{}});
  assert.equal(r.runner, 'jest');
});

test('detectTestConvention: vitest config file → vitest runner', () => {
  const r = detectTestConvention(['vitest.config.ts'], {});
  assert.equal(r.runner, 'vitest');
});

test('detectTestConvention: test script in package.json → mocha runner', () => {
  const r = detectTestConvention([], {scripts:{test:'mocha --recursive'}});
  assert.equal(r.runner, 'mocha');
});

test('detectTestConvention: no hints → node:test runner', () => {
  const r = detectTestConvention(['src/index.js'], {});
  assert.equal(r.runner, 'node:test');
});

// ── TS/TSX syntax check via esbuild (integration) ────────────────────────────

test('broken TSX rolls back and reports failed', async () => {
  const root = await fs.mkdtemp(path.join(tmpdir(), 'doctor-tsx-'));
  try {
    const good = 'const x = 1;\n';
    await fs.writeFile(path.join(root,'App.tsx'), good);
    const scan = await scanRepository(root);
    // Inject synthetic issue
    const issue = {id:'tsx-s', severity:'medium' as const, category:'Code Quality' as const,
      title:'T', description:'', file:'App.tsx', line:1, rule:'R', recommendation:'', fixKind:'eval' as const};
    scan.issues.push(issue);
    const p: Proposal = {
      id:'tsx-test', issueId:'tsx-s', title:'T', provider:'demo', status:'proposed',
      explanation:'t', changes:[{path:'App.tsx', before:good, after:'const x = <;\n'}],
      checks:[], before:scan, createdAt:new Date().toISOString(),
    };
    const repo: Repository = {id:'tsx', kind:'upload', label:'TSX', scan, proposals:[p]};
    await applyAndVerify(root, repo, p.id);
    assert.equal(p.status, 'failed', 'broken TSX must fail and roll back');
    assert.equal(await fs.readFile(path.join(root,'App.tsx'),'utf8'), good, 'file must be restored');
    assert.equal(p.checks.find(c=>c.name==='Syntax check')?.status, 'failed');
  } finally {
    await fs.rm(root, {recursive:true, force:true});
  }
});

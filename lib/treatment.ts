import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import type {Repository, Proposal, Check} from './types';
import {getBobAdapter} from './bob';
import {listFiles,scanRepository,decisionCount} from './scanner';
import {safePath} from './archive';
import ts from 'typescript';
import {isTestFile} from './test-conventions';
export {detectTestConvention} from './test-conventions';

// ─── syntax checking ──────────────────────────────────────────────────────────
// JS/CJS/MJS: node --check (existing behaviour, per spec).
// TS/TSX/JSX: TypeScript parser — no execution or uploaded configuration.
// All other extensions: skipped (never falsely passed).
const PARSED_EXTS = new Set(['.ts','.tsx','.jsx']);
const JS_EXTS = new Set(['.js','.cjs','.mjs']);

async function syntaxCheck(filePath: string, source: string, root: string): Promise<Check> {
  const ext = path.extname(filePath).toLowerCase();
  if (JS_EXTS.has(ext)) {
    const {execFile} = await import('node:child_process');
    const {promisify} = await import('node:util');
    const exec = promisify(execFile);
    const abs = path.join(root, filePath);
    try {
      const {stdout,stderr} = await exec(process.execPath, ['--check', abs],
        {cwd:root,timeout:8000,maxBuffer:256*1024,env:{PATH:process.env.PATH,NODE_ENV:'test'}});
      return {name:'',status:'passed',detail:(stdout||stderr||'Syntax OK.').slice(-2000)};
    } catch(err) {
      const e = err as Error & {stderr?:string;stdout?:string};
      return {name:'',status:'failed',detail:(e.stderr||e.stdout||e.message).slice(-2000)};
    }
  }
  if (!PARSED_EXTS.has(ext)) return {name:'',status:'skipped',detail:`Not checked: ${filePath}. Syntax verification is not supported for ${ext||'this file type'}.`};
  const result=ts.transpileModule(source,{fileName:filePath,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.Preserve,isolatedModules:true}});
  const errors=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
  return {name:'',status:errors.length?'failed':'passed',detail:errors.length?`${filePath}: Syntax error: ${errors.map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')).join('\n')}`:`${filePath}: Parse-only syntax check passed (TypeScript parser; not type checking or test execution).`};
}

// ─── pure final-status helper ─────────────────────────────────────────────────
// Required checks: Syntax check, Existing tests, Targeted re-scan, Regression re-scan.
// Generated tests: required only when the proposal adds/modifies a test file
//   (path matches a test convention); otherwise skipped is acceptable.
// No message-string inspection — uses only check name and status.
export function finalStatus(
  checks: Check[],
  improved: boolean,
  proposalAddsTests: boolean,
): 'verified'|'partial' {
  if(checks.some(c=>c.status==='failed'))return 'partial';
  const get = (name: string) => checks.find(c => c.name === name);
  const required = [
    get('Syntax check'),
    get('Existing tests'),
    get('Targeted re-scan'),
    get('Regression re-scan'),
  ];
  // Any required check missing or not explicitly passed prevents verified.
  if (required.some(c => !c || c.status !== 'passed')) return 'partial';
  // Generated tests required when proposal adds/modifies test files.
  if (proposalAddsTests) {
    const gen = get('Generated tests');
    if (!gen || gen.status !== 'passed') return 'partial';
  }
  // Improvement without full resolution prevents verified.
  if (improved) return 'partial';
  return 'verified';
}

// ─── safe test convention detection ───────────────────────────────────────────
// Reads package.json scripts/jest keys as plain JSON — never require()s them.

export async function propose(root:string,repo:Repository,issueId:string):Promise<Proposal>{
  const issue=repo.scan.issues.find(i=>i.id===issueId);
  if(!issue)throw new Error('Issue no longer exists. Rescan the repository.');
  const adapter=getBobAdapter();
  // Return an existing pending proposal for the same issue+provider — no new call.
  const existing=repo.proposals.find(p=>p.issueId===issueId&&p.status==='proposed'&&p.provider===adapter.mode);
  if(existing)return existing;
  // Removed: failed-proposal recycling.
  // A failed proposal is not reused. Prior check feedback is already forwarded to
  // buildContext (see live.ts) so the next adapter call receives that context.
  const result=await adapter.propose(root,repo,issue);
  const proposal:Proposal={id:randomUUID(),issueId,title:issue.title,provider:adapter.mode,status:'proposed',...result,checks:[],before:repo.scan,createdAt:new Date().toISOString()};
  repo.proposals.unshift(proposal);
  return proposal;
}

export async function applyAndVerify(root:string,repo:Repository,proposalId:string){
  const p=repo.proposals.find(p=>p.id===proposalId);
  if(!p||p.status!=='proposed')throw new Error('This proposal is not awaiting approval.');
  if(!p.changes.length||new Set(p.changes.map(c=>c.path)).size!==p.changes.length)throw new Error('Proposal must contain unique paths and an actual change.');
  if(!repo.scan.issues.some(i=>i.id===p.issueId))throw new Error('Finding no longer exists. Rescan before requesting another proposal.');
  for(const c of p.changes){
    safePath(c.path);
    const current=await fs.readFile(path.join(root,c.path),'utf8').catch(()=>null);
    if(current!==c.before)throw new Error('Source changed since the proposal. Rescan and request a fresh proposal.');
  }
  p.before=await scanRepository(root,repo.label);
  const checks:Check[]=[];
  try{
    if(p.changes.every(c=>c.before===c.after))throw new Error('Proposal contains no changes. Original files are unchanged.');
    // Apply changes
    for(const c of p.changes){
      const file=path.join(root,c.path);
      await fs.mkdir(path.dirname(file),{recursive:true});
      await fs.writeFile(file,c.after);
    }

    // ── B: syntax check — JS via node --check, TS/TSX/JSX via TypeScript parser ───
    const syntaxResults:Check[]=[];
    for(const c of p.changes){
      const r=await syntaxCheck(c.path,c.after,root);
      syntaxResults.push(r);
    }
    const syntaxFailed=syntaxResults.some(r=>r.status==='failed');
    const syntaxSkipped=syntaxResults.some(r=>r.status==='skipped');
    const syntaxDetail=syntaxResults.map(r=>r.detail).join('\n');
    checks.push({
      name:'Syntax check',
      status: syntaxFailed?'failed': syntaxSkipped?'skipped':'passed',
      detail: syntaxDetail||'No files checked.',
    });

    // ── Test execution ─────────────────────────────────────────────────────────
    if(repo.kind==='demo'){
      const testFiles=(await listFiles(root)).filter(f=>f.startsWith('tests/')&&f.endsWith('.test.cjs'));
      const existingTests=testFiles.filter(f=>!p.changes.some(c=>c.path===f));
      const generatedTests=testFiles.filter(f=>p.changes.some(c=>c.path===f));
      checks.push(existingTests.length
        ?{...await nodeTest(existingTests,root),name:'Existing tests'}
        :{name:'Existing tests',status:'skipped',detail:'No existing tests found.'});
      checks.push(generatedTests.length
        ?{...await nodeTest(generatedTests,root),name:'Generated tests'}
        :{name:'Generated tests',status:'skipped',detail:'This treatment did not generate tests.'});
    } else {
      // No sandboxed test runner is configured on this installation.
      // Uploaded code is never executed on the host. Criterion C is blocked (no container runtime detected).
      checks.push({name:'Existing tests',status:'unsupported',detail:'No sandboxed test runner is configured on this installation. Uploaded repository code is not executed on the host. Download the treated repository and run its tests in your own sandbox.'});
      checks.push({name:'Generated tests',status:'unsupported',detail:'No sandboxed test runner is configured on this installation.'});
    }

    // ── Targeted re-scan ───────────────────────────────────────────────────────
    const after=await scanRepository(root,repo.label);
    const original=p.before.issues.find(i=>i.id===p.issueId);
    const remains=after.issues.some(i=>i.id===p.issueId||(original&&i.file===original.file&&i.rule===original.rule));
    const target=p.changes.find(c=>c.path===original?.file);
    if(original?.fixKind==='complexity'&&target){
      p.complexity={before:decisionCount(target.before||''),after:decisionCount(target.after)};
    }
    const improved=remains&&!!p.complexity&&p.complexity.after<p.complexity.before;
    checks.push({
      name:'Targeted re-scan',
      status:improved?'warning':remains?'failed':'passed',
      detail:improved
        ?`Decision count improved from ${p.complexity!.before} to ${p.complexity!.after}, but the file is still above the threshold (10 or more). Finding retained; health remains rule-based. Behavior is not established by this metric.`
        :remains
          ?'The original finding is still detected without a supported measurable improvement.'
          :'The original finding is no longer detected by its rule. This is not a full security audit.',
    });

    // ── Regression re-scan (whole-repo, not gamed by complexity count changes) ─
    const key=(i:{file:string;rule:string})=>`${i.file}:${i.rule}`;
    const previous=new Map<string,number>();
    for(const i of p.before.issues)previous.set(key(i),(previous.get(key(i))||0)+1);
    const current=new Map<string,number>();
    for(const i of after.issues)current.set(key(i),(current.get(key(i))||0)+1);
    const regressions=[...current].filter(([k,n])=>n>(previous.get(k)||0));
    checks.push({
      name:'Regression re-scan',
      status:regressions.length?'failed':'passed',
      detail:regressions.length
        ?'New or additional rule findings detected. Changes will be rolled back.'
        :'No additional findings detected by the available rules. This does not establish behavioral equivalence.',
    });

    // ── A: Derive final status from check outcomes (no string inspection) ──────
    if(checks.some(c=>c.status==='failed')){
      throw new Error('Verification failed. Original files have been restored.');
    }
    p.checks=checks;
    p.after=after;
    p.resolution=improved?'improved':'resolved';
    const proposalAddsTests=p.changes.some(c=>isTestFile(c.path));
    p.status=finalStatus(checks,improved,proposalAddsTests);
    repo.scan=after;
    return p;
  } catch(error){
    // Rollback all changed files
    for(const c of p.changes){
      const file=path.join(root,c.path);
      if(c.before===null)await fs.rm(file,{force:true});
      else await fs.writeFile(file,c.before);
    }
    p.checks=checks;
    p.status='failed';
    p.explanation+=`\n${(error as Error).message}`;
    repo.scan=await scanRepository(root,repo.label);
    return p;
  }
}

async function nodeTest(files:string[],cwd:string):Promise<Omit<Check,'name'>>{
  const {execFile}=await import('node:child_process');
  const {promisify}=await import('node:util');
  const exec=promisify(execFile);
  try{
    const {stdout,stderr}=await exec(process.execPath,['--test',...files],{cwd,timeout:10000,maxBuffer:256*1024,env:{PATH:process.env.PATH,NODE_ENV:'test'}});
    return {status:'passed',detail:(stdout||stderr||'Completed successfully.').slice(-6000)};
  }catch(error){
    const e=error as Error & {stdout?:string;stderr?:string};
    return {status:'failed',detail:(e.stderr||e.stdout||e.message).slice(-6000)};
  }
}

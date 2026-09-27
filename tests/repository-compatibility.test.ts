import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {scanRepository} from '../lib/scanner';
import {buildContext,validateProposal} from '../lib/bob/live';
import {propose} from '../lib/treatment';
import type {Repository,Proposal} from '../lib/types';

async function fixture(fn:(root:string)=>Promise<void>){const root=await fs.mkdtemp(path.join(tmpdir(),'doctor-compat-'));try{await fn(root);}finally{await fs.rm(root,{recursive:true,force:true});}}
test('Java findings send the actual language, acceptance criteria and prior feedback',async()=>fixture(async root=>{
 const source=`class Game { void go(boolean x) { ${'if(x){} '.repeat(23)} } }`;
 await fs.writeFile(path.join(root,'Game.java'),source);const scan=await scanRepository(root);scan.language='Ruby';
 const repo:Repository={id:'test',kind:'upload',label:'Mixed',scan,proposals:[]};
 const ctx=await buildContext(root,repo,scan.issues.find(i=>i.fixKind==='complexity')!);
 assert.match(ctx.prompt,/Selected-file language: Java/);assert.match(ctx.prompt,/Below 10 decision tokens/);assert.match(ctx.prompt,/FILE-level/);
 const tests=await buildContext(root,repo,scan.issues.find(i=>i.fixKind==='missing-tests')!);
 assert.ok(Object.hasOwn(tests.originals,'Game.java'));
 // No tests/ dir in fixture → detectTestConvention returns colocated → test file is same dir.
 assert.ok(Object.keys(tests.originals).some(f=>f.endsWith('GameTest.java')),'GameTest.java must be in originals');
 assert.ok(!Object.keys(tests.originals).some(f=>f.endsWith('.cjs')));
}));
test('native test naming is recognized for Python, Go, Ruby, and Java',async()=>fixture(async root=>{
 for(const name of ['test_app.py','app_test.go','app_test.rb','GameTest.java'])await fs.writeFile(path.join(root,name),'');
 const scan=await scanRepository(root);assert.equal(scan.tests,4);assert.ok(!scan.issues.some(i=>i.fixKind==='missing-tests'));
}));
test('Bob refusal reports a useful reason instead of a generic schema error',()=>{
 assert.throws(()=>validateProposal(JSON.stringify({explanation:'Need database driver context',files:[]}),{}),/Need database driver context/);
});
test('failed complexity proposal is NOT recycled; a fresh adapter call is made on retry',async()=>fixture(async root=>{
 const previous=process.env.BOB_PROVIDER;process.env.BOB_PROVIDER='demo';
 try{
  const before='if(x){} '.repeat(23);await fs.writeFile(path.join(root,'Game.java'),before);
  const scan=await scanRepository(root);const issue=scan.issues.find(i=>i.fixKind==='complexity')!;
  const old:Proposal={id:'old',issueId:issue.id,title:issue.title,provider:'demo',status:'failed',explanation:'Old proposal',changes:[{path:'Game.java',before,after:before}],checks:[{name:'Targeted re-scan',status:'failed',detail:'Finding remains'}],before:scan,createdAt:new Date().toISOString()};
  const repo:Repository={id:'test',kind:'upload',label:'Test',scan,proposals:[old]};
  // Demo adapter has no recipe for Java complexity — it throws.
  // The key invariant: propose() must NOT return old (no recycling), must attempt fresh adapter call.
  await assert.rejects(propose(root,repo,issue.id),/No automatic treatment recipe|custom treatment/);
  // old proposal untouched and source file unchanged
  assert.equal(old.status,'failed');
  assert.equal(await fs.readFile(path.join(root,'Game.java'),'utf8'),before);
  // A pending proposal for this issue (if any) would be returned on repeat call — but there is none.
  assert.equal(repo.proposals.filter(p=>p.status==='proposed').length,0);
 }finally{if(previous===undefined)delete process.env.BOB_PROVIDER;else process.env.BOB_PROVIDER=previous;}
}));

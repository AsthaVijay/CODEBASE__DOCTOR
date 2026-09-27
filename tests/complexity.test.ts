import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {scanRepository} from '../lib/scanner';
import {applyAndVerify} from '../lib/treatment';
import type {Repository,Proposal} from '../lib/types';

const source=(n:number)=>`class Game { void run(boolean x) { ${'if(x) {} '.repeat(n)} } }`;
async function fixture(after:string,fn:(repo:Repository,p:Proposal,root:string)=>Promise<void>){
 const root=await fs.mkdtemp(path.join(tmpdir(),'doctor-complexity-'));
 try{
  const before=source(23);await fs.writeFile(path.join(root,'Game.java'),before);
  const scan=await scanRepository(root);const issue=scan.issues.find(i=>i.fixKind==='complexity')!;
  const p:Proposal={id:'regression-fixture',issueId:issue.id,title:issue.title,provider:'demo',status:'proposed',explanation:'Synthetic fixture; no Bob call.',changes:[{path:'Game.java',before,after}],checks:[],before:scan,createdAt:new Date().toISOString()};
  const repo:Repository={id:'fixture',kind:'upload',label:'Fixture',scan,proposals:[p]};
  await applyAndVerify(root,repo,p.id);await fn(repo,p,root);
 }finally{await fs.rm(root,{recursive:true,force:true});}
}
test('complexity improvement retains finding and score without claiming Java verification',async()=>fixture(source(13),async(repo,p,root)=>{
 assert.equal(p.status,'partial');assert.equal(p.resolution,'improved');assert.deepEqual(p.complexity,{before:23,after:13});
 assert.equal(p.after!.health,p.before.health);assert.ok(repo.scan.issues.some(i=>i.id===p.issueId));
 assert.equal(p.checks.find(c=>c.name==='Targeted re-scan')!.status,'warning');
 assert.equal(p.checks.find(c=>c.name==='Syntax check')!.status,'skipped');
 assert.equal(p.checks.find(c=>c.name==='Existing tests')!.status,'unsupported');
 assert.equal(await fs.readFile(path.join(root,'Game.java'),'utf8'),source(13));
 await assert.rejects(applyAndVerify(root,repo,p.id),/not awaiting approval/);
}));
test('cleared Java complexity finding still reports incomplete verification',async()=>fixture(source(9),async(repo,p)=>{
 assert.equal(p.status,'partial');assert.equal(p.resolution,'resolved');assert.ok(p.after!.health>p.before.health);
 assert.ok(!repo.scan.issues.some(i=>i.id===p.issueId));
}));
test('unchanged and worse complexity roll back',async()=>{
 for(const n of [23,25])await fixture(source(n),async(_repo,p,root)=>{
  assert.equal(p.status,'failed');assert.equal(await fs.readFile(path.join(root,'Game.java'),'utf8'),source(23));
 });
});
test('complexity improvement introducing a rule regression rolls back',async()=>fixture(source(13)+'\neval(input);',async(_repo,p,root)=>{
 assert.equal(p.status,'failed');assert.equal(p.checks.find(c=>c.name==='Regression re-scan')!.status,'failed');
 assert.equal(await fs.readFile(path.join(root,'Game.java'),'utf8'),source(23));
}));

test('mixed JavaScript and Java changes never claim complete syntax verification',async()=>{
 const root=await fs.mkdtemp(path.join(tmpdir(),'doctor-mixed-'));
 try{
  await fs.writeFile(path.join(root,'Game.java'),source(23));
  await fs.writeFile(path.join(root,'helper.js'),'const x = 1;');
  const scan=await scanRepository(root);const issue=scan.issues.find(i=>i.fixKind==='complexity')!;
  const p:Proposal={id:'mixed',issueId:issue.id,title:issue.title,provider:'demo',status:'proposed',explanation:'Local fixture',checks:[],before:scan,createdAt:new Date().toISOString(),changes:[{path:'Game.java',before:source(23),after:source(9)},{path:'helper.js',before:'const x = 1;',after:'const x = 2;'}]};
  const repo:Repository={id:'mixed',kind:'upload',label:'Mixed',scan,proposals:[p]};
  await applyAndVerify(root,repo,p.id);
  assert.equal(p.status,'partial');assert.equal(p.checks.find(c=>c.name==='Syntax check')?.status,'skipped');
  assert.match(p.checks.find(c=>c.name==='Syntax check')!.detail,/Game.java/);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});

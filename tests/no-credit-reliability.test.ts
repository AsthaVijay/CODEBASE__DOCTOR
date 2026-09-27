import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {detectTestConvention,suggestedTestPath} from '../lib/test-conventions';
import {buildContext,validateProposal} from '../lib/bob/live';
import {scanRepository} from '../lib/scanner';
import {applyAndVerify,propose,finalStatus} from '../lib/treatment';
import {demoAdapter} from '../lib/bob/adapter';
import {doctorRequest} from '../lib/client-request';
import type {Repository,Proposal} from '../lib/types';

async function fixture(fn:(root:string)=>Promise<void>){const root=await fs.mkdtemp(path.join(tmpdir(),'doctor-reliability-'));try{await fn(root);}finally{await fs.rm(root,{recursive:true,force:true});}}
test('test discovery supports nested dirs, JSON Jest paths, colocated tests and safe fallback',()=>{
 assert.equal(detectTestConvention(['src/__tests__/a.test.ts'],{}).testGlob,'src/__tests__/');
 assert.equal(detectTestConvention([],{jest:{testMatch:['<rootDir>/checks/**/*.test.ts']}}).testGlob,'checks/');
 assert.equal(detectTestConvention([],{jest:{roots:['<rootDir>/unit-tests']}}).testGlob,'unit-tests/');
 assert.equal(detectTestConvention([],{jest:{testMatch:['<rootDir>/../../outside/**/*.ts']}}).testGlob,'tests/');
 assert.equal(detectTestConvention(['src/a.test.ts'],{}).testGlob,'colocated');
 assert.equal(detectTestConvention([],{}).testGlob,'tests/');
 assert.equal(suggestedTestPath('src/main/java/com/Game.java',[],{}),'src/test/java/com/GameTest.java');
 assert.equal(suggestedTestPath('src/app.py',[],{}),'tests/test_app.py');
 assert.equal(suggestedTestPath('app.go',[],{}),'app_test.go');
 assert.equal(suggestedTestPath('App.tsx',['App.test.tsx'],{}),'App.test.tsx');
});
test('helper whitelist permits one new helper but never an existing collision',async()=>fixture(async root=>{
 await fs.writeFile(path.join(root,'app.ts'),'export function app(x:boolean){'+ 'if(x){} '.repeat(12)+'}');
 const scan=await scanRepository(root), repo:Repository={id:'r',kind:'upload',label:'r',scan,proposals:[]}, issue=scan.issues.find(i=>i.fixKind==='complexity')!;
 const fresh=await buildContext(root,repo,issue);assert.equal(fresh.originals['app.helpers.ts'],null);
 await fs.writeFile(path.join(root,'app.helpers.ts'),'// user-owned');
 const collision=await buildContext(root,repo,issue);assert.ok(!Object.hasOwn(collision.originals,'app.helpers.ts'));
 assert.throws(()=>validateProposal(JSON.stringify({explanation:'overwrite',files:[{path:'app.helpers.ts',after:'bad'}]}),collision.originals),/unexpected/);
 assert.equal(await fs.readFile(path.join(root,'app.helpers.ts'),'utf8'),'// user-owned');
}));
test('security scanning includes generated tests and detects SQL inside db.get',async()=>fixture(async root=>{
 await fs.mkdir(path.join(root,'tests'));
 await fs.writeFile(path.join(root,'tests/new.test.ts'),'const API_KEY = "not-a-real-secret-value";\ndb.get(`SELECT * FROM users WHERE id = ${id}`);');
 const scan=await scanRepository(root);assert.ok(scan.issues.some(i=>i.fixKind==='secret'));assert.ok(scan.issues.some(i=>i.fixKind==='sql'));
}));
for(const extension of ['cjs','tsx'])test(`${extension} uploaded proposal parses but cannot claim tests passed`,async()=>fixture(async root=>{
 const file=`app.${extension}`, before='const API_KEY = "not-a-real-secret-value";\n'+(extension==='tsx'?'export const App = () => <main>Hello</main>;':'module.exports = {};');
 await fs.writeFile(path.join(root,file),before);const scan=await scanRepository(root),issue=scan.issues.find(i=>i.fixKind==='secret')!;
 const p:Proposal={id:'p',issueId:issue.id,title:issue.title,provider:'demo',status:'proposed',explanation:'fixture',changes:[{path:file,before,after:before.replace('"not-a-real-secret-value"','process.env.API_KEY')}],checks:[],before:scan,createdAt:new Date().toISOString()};
 const repo:Repository={id:'r',kind:'upload',label:'r',scan,proposals:[p]};await applyAndVerify(root,repo,p.id);
 assert.equal(p.status,'partial');assert.equal(p.checks.find(c=>c.name==='Syntax check')?.status,'passed');assert.equal(p.checks.find(c=>c.name==='Existing tests')?.status,'unsupported');assert.ok(repo.scan.health>scan.health);
}));
test('a new insecure helper rolls back both files',async()=>fixture(async root=>{
 const before='function app(x){'+ 'if(x){} '.repeat(12)+'}';await fs.writeFile(path.join(root,'app.js'),before);
 const scan=await scanRepository(root),issue=scan.issues.find(i=>i.fixKind==='complexity')!;
 const p:Proposal={id:'p',issueId:issue.id,title:issue.title,provider:'demo',status:'proposed',explanation:'fixture',changes:[{path:'app.js',before,after:'function app(x){return x;}'},{path:'app.helpers.js',before:null,after:'const SECRET = "not-a-real-secret-value";'}],checks:[],before:scan,createdAt:new Date().toISOString()};
 await applyAndVerify(root,{id:'r',kind:'upload',label:'r',scan,proposals:[p]},p.id);assert.equal(p.status,'failed');assert.equal(await fs.readFile(path.join(root,'app.js'),'utf8'),before);await assert.rejects(fs.stat(path.join(root,'app.helpers.js')));
}));
test('failed proposal retry makes a fresh adapter request and sends previous feedback',async()=>fixture(async root=>{
 const priorProvider=process.env.BOB_PROVIDER,original=demoAdapter.propose;process.env.BOB_PROVIDER='demo';let calls=0;
 try{
 const before='const API_KEY = "not-a-real-secret-value";';await fs.writeFile(path.join(root,'app.js'),before);const scan=await scanRepository(root),issue=scan.issues.find(i=>i.fixKind==='secret')!;
 const repo:Repository={id:'r',kind:'upload',label:'r',scan,proposals:[]};
 demoAdapter.propose=async()=>{calls++;return {changes:[{path:'app.js',before,after:'const API_KEY = process.env.API_KEY;'}],explanation:'mock (no live request)'};};
 const first=await propose(root,repo,issue.id);first.status='failed';first.checks=[{name:'Regression re-scan',status:'failed',detail:'fixture feedback'}];
 const second=await propose(root,repo,issue.id);assert.equal(calls,2);assert.notEqual(first.id,second.id);assert.match((await buildContext(root,repo,issue)).prompt,/fixture feedback/);
 await propose(root,repo,issue.id);assert.equal(calls,2,'pending proposal is reused without spending again');
 }finally{demoAdapter.propose=original;if(priorProvider===undefined)delete process.env.BOB_PROVIDER;else process.env.BOB_PROVIDER=priorProvider;}
}));
test('null structured responses are rejected cleanly',()=>assert.throws(()=>validateProposal('null',{}),/schema/));
test('any failed check prevents verified status',()=>assert.equal(finalStatus([{name:'Syntax check',status:'failed',detail:'failure'}],false,false),'partial'));
test('client deadline reports uncertain state and never retries a mutation',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(_input,init)=>{calls++;return new Promise((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new Error('aborted'))));};
 try{await assert.rejects(doctorRequest({method:'POST'},10),/Reload to check/);assert.equal(calls,1);}finally{globalThis.fetch=original;}
});

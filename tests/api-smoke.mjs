import assert from 'node:assert/strict';
const base=process.env.DOCTOR_URL||'http://127.0.0.1:3000';
let cookie='';
async function request(body,expect=200,extra={}){const response=await fetch(base+'/api/doctor',{method:body?'POST':'GET',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json',...extra},body:body?JSON.stringify(body):undefined});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];const data=await response.json();assert.equal(response.status,expect,data.error);return data;}
let state=await request();assert.equal(state.adapter.mode,'demo','Smoke test requires demo mode to avoid spending credits.');const initial=state.repository.scan.health;const issue=state.repository.scan.issues.find(i=>i.fixKind==='secret');
state=await request({action:'propose',issueId:issue.id});let p=state.repository.proposals[0];assert.equal(p.status,'proposed');assert.equal(state.repository.scan.health,initial);
await request({action:'approve',proposalId:p.id},400);
state=await request({action:'reject',proposalId:p.id});assert.equal(state.repository.proposals[0].status,'rejected');assert.equal(state.repository.scan.health,initial);
const zip=await (await fetch(base+'/api/doctor?download=true',{headers:{Cookie:cookie}})).arrayBuffer();
state=await request({action:'propose',issueId:issue.id});p=state.repository.proposals[0];state=await request({action:'approve',proposalId:p.id,approved:true});assert.equal(state.repository.proposals[0].status,'verified');assert.ok(state.repository.scan.health>initial);
await request({action:'approve',proposalId:p.id,approved:true},400);
await request({action:'rescan'},403,{Origin:'https://unrelated.example'});
const upload=await fetch(base+'/api/doctor',{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/zip'},body:zip});assert.equal(upload.status,200);state=await upload.json();assert.equal(state.repository.kind,'upload');assert.equal(state.repository.proposals.length,0);assert.equal(state.repository.scan.health,initial);
const uploadedIssue=state.repository.scan.issues.find(i=>i.fixKind==='secret');state=await request({action:'propose',issueId:uploadedIssue.id});p=state.repository.proposals[0];state=await request({action:'approve',proposalId:p.id,approved:true});assert.equal(state.repository.proposals[0].status,'partial');assert.equal(state.repository.proposals[0].checks.find(c=>c.name==='Existing tests').status,'unsupported');
console.log('HTTP smoke passed: propose, explicit approval, reject, apply, replay protection, origin check, ZIP upload, and partial verification. No Bob calls made.');

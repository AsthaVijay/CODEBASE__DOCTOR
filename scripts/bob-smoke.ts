import fs from 'node:fs/promises';
import path from 'node:path';
import {loadEnvConfig} from '@next/env';
import {bobKey} from '../lib/bob/credentials';
import {budgetStatus} from '../lib/bob/budget';
import {propose} from '../lib/treatment';
import {resetDemo,repoRoot,save} from '../lib/store';
import {randomUUID} from 'node:crypto';
loadEnvConfig(process.cwd());
async function main(){
 if(process.env.BOB_AUTH_MODE!=='session'&&!await bobKey())throw new Error('No Bob credential found.');
 console.log(process.env.BOB_AUTH_MODE==='session'?'Using Bob Shell’s signed-in session.':'Credential loaded locally; value withheld.');
 console.log('Budget before:',JSON.stringify(await budgetStatus()));
 const session=randomUUID();const repo=await resetDemo(session);const issue=repo.scan.issues.find(i=>i.fixKind==='secret')!;const original=await fs.readFile(path.join(repoRoot(session),issue.file),'utf8');
 const proposal=await propose(repoRoot(session),repo,issue.id);await save(session,repo);
 const unchanged=original===await fs.readFile(path.join(repoRoot(session),issue.file),'utf8');
 console.log(JSON.stringify({status:proposal.status,provider:proposal.provider,changedFiles:proposal.changes.map(c=>c.path),sourceUnchanged:unchanged,cost:proposal.usage?.cost,taskId:proposal.usage?.taskId,session},null,2));
 console.log('Budget after:',JSON.stringify(await budgetStatus()));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});

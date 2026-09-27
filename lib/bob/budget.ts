import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export const budgetTotal=40;
export const perCallLimit=()=>{const n=Number(process.env.BOB_MAX_COST||'0.5');if(!Number.isFinite(n)||n<=0||n>1)throw new Error('BOB_MAX_COST must be between 0 and 1 Bobcoin.');return n;};
interface Entry {id:string;reserved:number;cost:number|null;status:'running'|'completed'|'failed';at:string;taskId?:string;}
interface Ledger {entries:Entry[];}
const directory=()=>process.env.DOCTOR_BUDGET_DIR||path.join(process.cwd(),'.doctor');
async function readLedger():Promise<Ledger>{try{const data=JSON.parse(await fs.readFile(path.join(directory(),'bob-usage.json'),'utf8'));if(!Array.isArray(data.entries)||data.entries.some((e:Entry)=>!Number.isFinite(e.reserved)||e.reserved<0||(e.cost!==null&&(!Number.isFinite(e.cost)||e.cost<0))))throw new Error('Invalid Bob budget ledger.');return data;}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return {entries:[]};throw e;}}
const used=(ledger:Ledger)=>ledger.entries.reduce((sum,e)=>sum+(e.cost??e.reserved),0);
async function writeLedger(ledger:Ledger){const temp=path.join(directory(),`usage-${randomUUID()}.tmp`);await fs.writeFile(temp,JSON.stringify(ledger,null,2),{mode:0o600});await fs.rename(temp,path.join(directory(),'bob-usage.json'));}
export async function budgetStatus(){const ledger=await readLedger();const accounted=used(ledger);return {total:budgetTotal,accounted:Number(accounted.toFixed(4)),remaining:Number(Math.max(0,budgetTotal-accounted).toFixed(4)),perCall:perCallLimit(),calls:ledger.entries.length,unconfirmed:ledger.entries.filter(e=>e.cost===null).length};}
export async function withBudget<T extends {cost:number|null;taskId?:string}>(fn:()=>Promise<T>):Promise<T>{
 await fs.mkdir(directory(),{recursive:true});const lockPath=path.join(directory(),'bob-request.lock');let lock;try{lock=await fs.open(lockPath,'wx',0o600);}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')throw new Error('Another Bob request is active, or a previous request was interrupted. Check .doctor/bob-request.lock before retrying.');throw e;}
 try{const ledger=await readLedger();const cap=perCallLimit();if(used(ledger)+cap>budgetTotal)throw new Error('The 40 Bobcoin app budget cannot cover another request. No request was sent.');const entry:Entry={id:randomUUID(),reserved:cap,cost:null,status:'running',at:new Date().toISOString()};ledger.entries.push(entry);await writeLedger(ledger);
 try{const result=await fn();entry.status='completed';entry.cost=result.cost;entry.taskId=result.taskId;await writeLedger(ledger);return result;}catch(e){entry.status='failed';await writeLedger(ledger);throw e;}
 }finally{await lock.close();await fs.unlink(lockPath);}
}

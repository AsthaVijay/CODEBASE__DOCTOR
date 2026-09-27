import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import type {Repository} from './types';
import {scanRepository} from './scanner';
export const dataRoot=path.join(process.cwd(),'.doctor');
export function sessionPath(session:string){if(!/^[a-f0-9-]{36}$/.test(session))throw new Error('Invalid session');return path.join(dataRoot,session);}
export const repoRoot=(session:string)=>path.join(sessionPath(session),'repository');
export async function save(session:string,repo:Repository){const dir=sessionPath(session);await fs.mkdir(dir,{recursive:true});const temp=path.join(dir,`state-${randomUUID()}.tmp`);await fs.writeFile(temp,JSON.stringify(repo,null,2));await fs.rename(temp,path.join(dir,'state.json'));}
export async function load(session:string):Promise<Repository>{try{return JSON.parse(await fs.readFile(path.join(sessionPath(session),'state.json'),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;return resetDemo(session);}}
export async function resetDemo(session:string){const root=repoRoot(session);await fs.rm(root,{recursive:true,force:true});await fs.mkdir(root,{recursive:true});await fs.cp(path.join(process.cwd(),'demo-repository'),root,{recursive:true});const repo:Repository={id:randomUUID(),kind:'demo',label:'E-commerce App',scan:await scanRepository(root,'E-commerce App'),proposals:[]};await save(session,repo);return repo;}
const globalLocks=globalThis as typeof globalThis & {doctorLocks?:Map<string,Promise<unknown>>};
export async function locked<T>(session:string,fn:()=>Promise<T>):Promise<T>{const locks=globalLocks.doctorLocks??=new Map();const previous=locks.get(session)||Promise.resolve();const next=previous.catch(()=>{}).then(fn);locks.set(session,next);try{return await next;}finally{if(locks.get(session)===next)locks.delete(session);}}

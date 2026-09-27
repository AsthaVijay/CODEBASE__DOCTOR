import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {load,save,resetDemo,locked,repoRoot,sessionPath} from '@/lib/store';
import {scanRepository} from '@/lib/scanner';
import {extractZip,zipDirectory} from '@/lib/archive';
import {adapterInfo,getBobAdapter} from '@/lib/bob';
import {propose,applyAndVerify} from '@/lib/treatment';
import type {Repository} from '@/lib/types';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function session(req:NextRequest){const id=req.cookies.get('doctor-session')?.value;return id&&/^[a-f0-9-]{36}$/.test(id)?id:randomUUID();}
function respond(data:unknown,id:string,status=200){const response=NextResponse.json(data,{status});response.cookies.set('doctor-session',id,{httpOnly:true,sameSite:'strict',path:'/',maxAge:604800,secure:false});response.headers.set('Cache-Control','no-store');return response;}
export async function GET(req:NextRequest){const id=session(req);try{return await locked(id,async()=>{const repository=await load(id);if(req.nextUrl.searchParams.get('download')==='true'){const bytes=await zipDirectory(repoRoot(id));return new NextResponse(new Uint8Array(bytes),{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="codebase-doctor-repository.zip"','Cache-Control':'no-store'}});}return respond({repository,adapter:await adapterInfo()},id);});}catch(error){return respond({error:(error as Error).message},id,400);}}
export async function POST(req:NextRequest){const id=session(req);const origin=req.headers.get('origin');if(origin&&new URL(origin).host!==req.headers.get('host'))return respond({error:'Cross-origin requests are not allowed.'},id,403);try{return await locked(id,async()=>{
 const contentType=req.headers.get('content-type')||'';let repository:Repository;
 if(contentType.includes('application/zip')){
 const reader=req.body?.getReader();if(!reader)throw new Error('No ZIP supplied.');const chunks:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>20*1024*1024){await reader.cancel();throw new Error('ZIP must be smaller than 20 MB.');}chunks.push(value);}
 const temp=path.join(sessionPath(id),`upload-${randomUUID()}`);await fs.mkdir(temp,{recursive:true});try{await extractZip(Buffer.concat(chunks),temp);const scan=await scanRepository(temp);const root=repoRoot(id);await fs.rm(root,{recursive:true,force:true});await fs.rename(temp,root);repository={id:randomUUID(),kind:'upload',label:scan.project,scan,proposals:[]};}catch(error){await fs.rm(temp,{recursive:true,force:true});throw error;}
 }else{const body=await req.json();repository=await load(id);if(body.action==='demo')repository=await resetDemo(id);else if(body.action==='rescan'){repository.scan=await scanRepository(repoRoot(id),repository.label);for(const p of repository.proposals)if(p.status==='proposed')p.status='rejected';}else if(body.action==='propose'){await propose(repoRoot(id),repository,body.issueId);}else if(body.action==='reject'){const p=repository.proposals.find(p=>p.id===body.proposalId);if(!p||p.status!=='proposed')throw new Error('Proposal is no longer pending.');p.status='rejected';}else if(body.action==='approve'){if(body.approved!==true)throw new Error('Explicit approval is required.');if(getBobAdapter().mode==='bob'&&repository.proposals.find(p=>p.id===body.proposalId)?.provider!=='bob')throw new Error('Bob-only mode cannot apply an old local proposal. Request a new fix with IBM Bob.');await applyAndVerify(repoRoot(id),repository,body.proposalId);}else if(body.action==='clearHistory'){repository.proposals=repository.proposals.filter(p=>p.status==='proposed');}else throw new Error('Unknown action.');}
 await save(id,repository);return respond({repository,adapter:await adapterInfo()},id);
 });}catch(error){return respond({error:(error as Error).message},id,400);}}

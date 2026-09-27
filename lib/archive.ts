import yauzl from 'yauzl';
import yazl from 'yazl';
import path from 'node:path';
import fs from 'node:fs/promises';
import {ignored, listFiles} from './scanner';
const MAX_BYTES=20*1024*1024;
export function safePath(name:string) { if(!name||name.includes('\\')||name.includes('\0')||path.posix.isAbsolute(name)||/^[A-Za-z]:/.test(name)||name.split('/').some(p=>p==='..'||p==='.'||p.length>200))throw new Error('ZIP contains an unsafe file path.'); return name; }
export async function extractZip(buffer:Buffer,root:string) {
 if(buffer.length>MAX_BYTES)throw new Error('ZIP must be smaller than 20 MB.');
 const entries: {name:string;data:Buffer}[]=[];
 await new Promise<void>((resolve,reject)=>{yauzl.fromBuffer(buffer,{lazyEntries:true,validateEntrySizes:true},(err,zip)=>{if(err||!zip)return reject(new Error('Invalid ZIP archive.'));let total=0,count=0,ended=false; const seen=new Set<string>(); const fail=(e:Error)=>{if(!ended){ended=true;zip.close();reject(e);}};zip.on('error',fail);zip.on('end',()=>{if(!ended){ended=true;resolve();}});zip.on('entry',(entry:yauzl.Entry)=>{try{count++;if(count>2500)throw new Error('ZIP has too many entries (maximum 2,500).');const name=safePath(entry.fileName);if(((entry.externalFileAttributes>>>16)&0xf000)===0xa000)throw new Error('ZIP symlinks are not supported.');if(entry.generalPurposeBitFlag&1)throw new Error('Encrypted ZIPs are not supported.');if(name.endsWith('/')||name.split('/').some(p=>ignored.has(p))){zip.readEntry();return;}if(seen.has(name.toLowerCase()))throw new Error('ZIP contains duplicate file paths.');seen.add(name.toLowerCase());total+=entry.uncompressedSize;if(total>MAX_BYTES||entry.uncompressedSize>1024*1024)throw new Error('Extracted ZIP exceeds limits: 20 MB total or 1 MB per file.');zip.openReadStream(entry,(error,stream)=>{if(error||!stream)return fail(new Error('Cannot read ZIP entry.'));const chunks:Buffer[]=[];let bytes=0;stream.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>entry.uncompressedSize||bytes>1024*1024){stream.destroy();fail(new Error('ZIP expansion limit exceeded.'));}else chunks.push(chunk);});stream.on('error',fail);stream.on('end',()=>{if(!ended){entries.push({name,data:Buffer.concat(chunks)});zip.readEntry();}});});}catch(e){fail(e as Error);}});zip.readEntry();});});
 if(entries.length===0)throw new Error('ZIP contains no project files.');if(entries.length>2000)throw new Error('Maximum 2,000 project files.');
 const first=entries[0].name.split('/')[0];const strip=entries.every(e=>e.name.startsWith(first+'/'));
 for(const entry of entries){const relative=strip?entry.name.slice(first.length+1):entry.name;const dest=path.join(root,safePath(relative));await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,entry.data);}
}
export async function zipDirectory(root:string):Promise<Buffer>{const zip=new yazl.ZipFile();for(const file of await listFiles(root))zip.addFile(path.join(root,file),file);return new Promise((resolve,reject)=>{const chunks:Buffer[]=[];zip.outputStream.on('data',(b:Buffer)=>chunks.push(b));zip.outputStream.on('error',reject);zip.outputStream.on('end',()=>resolve(Buffer.concat(chunks)));zip.end();});}

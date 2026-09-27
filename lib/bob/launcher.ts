import fs from 'node:fs/promises';

// An absolute npm launcher still resolves its shebang's `node` through PATH.
// Use the server's known runtime for Node launchers; preserve native executables.
export async function shellCommand(binary:string,args:string[],node=process.execPath){
  if(binary.includes('/')){
    let file;
    try{
      file=await fs.open(binary,'r');
      const buffer=Buffer.alloc(256);const {bytesRead}=await file.read(buffer,0,buffer.length,0);
      const first=buffer.subarray(0,bytesRead).toString('utf8').split('\n')[0];
      if(/^#!.*\bnode\s*$/.test(first))return {binary:node,args:[binary,...args]};
    }catch{/* Preserve normal spawn errors for missing or inaccessible binaries. */}
    finally{await file?.close();}
  }
  return {binary,args};
}

import fs from 'node:fs/promises';
import {pagesKey} from './pages-key';
export function parseKeyFile(text:string):string {
 const value=text.trim();let key:string|undefined;
 if(value.startsWith('{')){let data;try{data=JSON.parse(value);}catch{throw new Error('The Bob key file contains invalid JSON.');}key=data.BOB_API_KEY||data.apiKey||data.api_key||data.apikey||data.key;}
 else{const assignment=value.match(/^(?:export\s+)?(?:BOB_API_KEY|BOBSHELL_API_KEY)\s*=\s*(.+)$/m);key=assignment?assignment[1].trim().replace(/^(["'])(.*)\1$/,'$2'):value;}
 if(typeof key!=='string'||key.length<12||/\s/.test(key))throw new Error('The key file must contain a single API key, a BOB_API_KEY assignment, or a JSON API-key field.');return key;
}
export async function bobKey():Promise<string|undefined>{if(process.env.BOB_AUTH_MODE==='session')return undefined;const configured=process.env.BOB_API_KEY||process.env.BOBSHELL_API_KEY;if(configured)return configured;const filename=process.env.BOB_API_KEY_FILE;if(!filename)return undefined;const stat=await fs.stat(filename);const pages=filename.toLowerCase().endsWith('.pages');if(stat.size>(pages?1024*1024:16384))throw new Error('Bob key file is unexpectedly large. Supply the credential file only.');return pages?pagesKey(await fs.readFile(filename)):parseKeyFile(await fs.readFile(filename,'utf8'));}

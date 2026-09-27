import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {shellCommand} from '../lib/bob/launcher';

test('Bob npm launcher uses the app runtime instead of an unrelated PATH node',async()=>{
 const root=await fs.mkdtemp(path.join(tmpdir(),'doctor-launch-'));
 try{const binary=path.join(root,'bob');await fs.writeFile(binary,'#!/usr/bin/env node\nconsole.log("fixture")');assert.deepEqual(await shellCommand(binary,['--version'],'/known/node'),{binary:'/known/node',args:[binary,'--version']});}
 finally{await fs.rm(root,{recursive:true,force:true});}
});
test('native and PATH executables retain direct invocation',async()=>{
 assert.deepEqual(await shellCommand('bob',['--version']),{binary:'bob',args:['--version']});
 assert.deepEqual(await shellCommand('/usr/bin/true',[]),{binary:'/usr/bin/true',args:[]});
});

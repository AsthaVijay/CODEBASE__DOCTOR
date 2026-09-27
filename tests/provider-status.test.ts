import {test} from 'node:test';
import assert from 'node:assert/strict';
import {adapterInfo} from '../lib/bob';
import {getBobAdapter} from '../lib/bob';
import {errorMessage} from '../lib/bob/live';

test('default provider stays Bob-only even without credentials; no automatic fallback',()=>{
 const previous=process.env.BOB_PROVIDER;
 try{delete process.env.BOB_PROVIDER;assert.equal(getBobAdapter().mode,'bob');process.env.BOB_PROVIDER='bob';assert.equal(getBobAdapter().mode,'bob');}
 finally{if(previous===undefined)delete process.env.BOB_PROVIDER;else process.env.BOB_PROVIDER=previous;}
});

test('credit exhaustion gives actionable errors without returning raw service output',()=>{
 for(const response of ['insufficient_quota','Insufficient credits','Bobcoins exhausted','Payment required','quota exceeded',"Error: Budget Exceeded. Oh no! It looks like you've gone over your budget allowance of 40 Bobcoins."]){
  assert.match(errorMessage(response),/credits or account quota are exhausted/);
  assert.match(errorMessage(response),/No local fallback/);
 }
 assert.match(errorMessage('invalid or expired API key'),/invalid or expired/);
 assert.match(errorMessage('Unexpected error: attempt to write a readonly database'),/cannot write its local database/);
});

test('explicit demo mode does not incorrectly report a missing API key',async()=>{
 const previous=process.env.BOB_PROVIDER;
 try{process.env.BOB_PROVIDER='demo';const info=await adapterInfo();assert.equal(info.mode,'demo');assert.match(info.detail,/explicitly selected/);assert.doesNotMatch(info.detail,/not configured/);}
 finally{if(previous===undefined)delete process.env.BOB_PROVIDER;else process.env.BOB_PROVIDER=previous;}
});

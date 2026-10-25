// Synthetic, loopback-only API regression. Restores the original local notebook.
import assert from 'node:assert/strict';
import { notebookSchema } from '../lib/notebook.ts';
const origin='http://127.0.0.1:5173';
const signIn=await fetch(origin+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=signIn.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
const request=(options={})=>fetch(origin+'/api/notebook',{...options,headers:{Cookie:cookie,'x-fieldbook':'1','Content-Type':'application/json'}});
const initial=await (await request()).json();
let revision=initial.revision,changes=0,checks=0;
const check=(name,value)=>{assert.ok(value,name);console.log('PASS '+name);checks++;};
async function put(book){const r=await request({method:'PUT',body:JSON.stringify({book,revision})});if(r.ok){revision=(await r.clone().json()).revision;changes++;}return r;}
try{
  const legacy=structuredClone(initial.book);
  assert.ok(legacy.entries.length&&legacy.batches.length,'Local QA fixtures are required.');
  delete legacy.entries[0].status;delete legacy.entries[0].phase;delete legacy.batches[0].recipe;
  check('legacy notebook accepted by the live API',(await put(legacy)).ok);
  const migrated=(await (await request()).json()).book;
  check('legacy entry remains intact and unconfirmed',migrated.entries[0].status==='unconfirmed'&&migrated.entries[0].phase===null&&migrated.entries[0].note===legacy.entries[0].note);
  check('legacy batch gets blank unconfirmed recipe steps',migrated.batches[0].recipe.steps.length===7&&migrated.batches[0].recipe.steps.every(s=>!s.confirmed&&!s.instruction));
  const future=structuredClone(migrated);future.entries[0].status='completed';future.entries[0].at=new Date(Date.now()+86400000).toISOString();
  check('future completed record rejected by the server',(await put(future)).status===400);
  const invalid=structuredClone(migrated);invalid.batches[0].recipe.steps[0].confirmed=true;
  check('empty confirmed recipe rejected by the server',(await put(invalid)).status===400);
  const fixture=structuredClone(migrated);
  fixture.entries[0].status='planned';fixture.entries[0].at='2026-01-01T12:00:00Z';fixture.entries[0].phase='ferment';
  Object.assign(fixture.batches[0].recipe.steps[2],{instruction:'Synthetic QA interval',minutes:.1,quantity:'QA only',confirmed:true});
  check('explicit status phase and recipe save together',(await put(fixture)).ok);
  const roundTrip=(await (await request()).json()).book;
  check('past plan stays planned after a server reload',roundTrip.entries[0].status==='planned'&&roundTrip.entries[0].phase==='ferment');
  check('confirmed recipe and timer duration round trip',roundTrip.batches[0].recipe.steps[2].instruction==='Synthetic QA interval'&&roundTrip.batches[0].recipe.steps[2].minutes===.1&&roundTrip.batches[0].recipe.steps[2].confirmed);
}finally{
  if(changes){const r=await put(initial.book);assert.ok(r.ok,'Restore original local notebook');const restored=(await (await request()).json()).book;assert.deepEqual(restored,notebookSchema.parse(initial.book));console.log('Restored and verified original local notebook.');}
}
console.log(`${checks} improvement API checks passed.`);

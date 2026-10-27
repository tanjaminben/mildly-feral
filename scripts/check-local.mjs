// Local API integration checks only. Never point this script at a hosted Site.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin='http://127.0.0.1:5173';
const results=[];
function check(label,value){assert.ok(value,label);results.push(label);console.log('PASS '+label);}
const signIn=await fetch(origin+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=signIn.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
const req=(path,options={})=>fetch(origin+path,{...options,headers:{Cookie:cookie,'x-fieldbook':'1',...options.headers}});
check('anonymous notebook access is rejected',(await fetch(origin+'/api/notebook')).status===401);
check('untrusted identity headers are stripped by local auth',(await fetch(origin+'/api/notebook',{headers:{'oai-authenticated-user-id':'another-user','oai-authenticated-user-email':'other@example.test'}})).status===401);
const initial=await (await req('/api/notebook')).json();
check('notebook loads with authenticated owner',initial.owner==='local_seedy'&&[1,2].includes(initial.book.schemaVersion));
check('photo journal survived server round trip',initial.book.entries.some(e=>e.title==='QA — first reading'&&e.photos.length===1&&e.at==='2026-10-05T17:15:00.000Z'));
const entry=initial.book.entries.find(e=>e.title==='QA — first reading');
check('68°F and 0.8 US gal stored as canonical Celsius/liters',entry.tempC===20&&Math.abs(entry.volumeL-3.0283294272)<1e-9);
const body=JSON.stringify({book:initial.book,revision:initial.revision});
check('missing mutation header is rejected',(await fetch(origin+'/api/notebook',{method:'PUT',headers:{Cookie:cookie,'Content-Type':'application/json'},body})).status===403);
check('cross-origin mutation is rejected',(await req('/api/notebook',{method:'PUT',headers:{Origin:'https://outside.example','Content-Type':'application/json'},body})).status===403);
check('stale revision cannot overwrite newer records',(await req('/api/notebook',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({book:initial.book,revision:initial.revision-1})})).status===409);
check('null input is rejected as a client error',(await req('/api/notebook',{method:'PUT',headers:{'Content-Type':'application/json'},body:'null'})).status===400);
const invalid=structuredClone(initial.book);invalid.batches[0].startedOn='2026-02-30';
check('impossible calendar dates are rejected',(await req('/api/notebook',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({book:invalid,revision:initial.revision})})).status===400);
const missing=structuredClone(initial.book);missing.entries[0].photos.push({id:crypto.randomUUID(),caption:'missing'});
check('missing photos cannot be linked to saved records',(await req('/api/notebook',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({book:missing,revision:initial.revision})})).status===400);
check('oversized notebook rejected',(await req('/api/notebook',{method:'PUT',headers:{'Content-Type':'application/json'},body:' '.repeat(750001)})).status===413);
check('unowned or missing photo not returned',(await req('/api/photos/'+crypto.randomUUID())).status===404);
check('invalid JPEG rejected',(await req('/api/photos',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:'not a jpeg'})).status===415);
check('unsupported upload media rejected',(await req('/api/photos',{method:'POST',headers:{'Content-Type':'image/png'},body:'not a png'})).status===415);
check('oversized photo rejected',(await req('/api/photos',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:new Uint8Array(1048577)})).status===413);
const referenced=entry.photos[0].id;
check('saved photo cannot be deleted behind the journal',(await req('/api/photos/'+referenced,{method:'DELETE'})).status===409);
const bytes=await fs.readFile('../qa/phone-note-390.jpg');
const created=[];
try{
 const quota=await(await req('/api/photos')).json();
 for(let i=quota.count;i<60;i++){const r=await req('/api/photos',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:bytes});assert.equal(r.status,201);created.push((await r.json()).id);}
 check('60-photo cap is enforced',(await req('/api/photos',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:bytes})).status===413);
 const fresh=await(await req('/api/photos')).json();check('unused-upload recovery discovers test objects',created.every(id=>fresh.unused.includes(id)));
}finally{for(const id of created)assert.equal((await req('/api/photos/'+id,{method:'DELETE'})).status,200);}
const final=await(await req('/api/notebook')).json();
check('validation and quota tests preserve the notebook',JSON.stringify(final.book)===JSON.stringify(initial.book));
check('quota test objects cleaned while journal photo remains',final.quota.count===initial.quota.count);
await fs.writeFile('../qa/api-results.json',JSON.stringify({checkedAt:new Date().toISOString(),origin,checks:results},null,2));

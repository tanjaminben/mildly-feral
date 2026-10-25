// Hydrometer regressions. Optional API checks are fixed to loopback and restore fixtures.
import assert from 'node:assert/strict';
import { estimateAbv, hydrometerSchema, batchSchema, notebookSchema, entrySchema, recoverGravityDraft } from '../lib/notebook.ts';
import { journalGravityOptions, manualGravity, selectJournalGravity, gravitySourceStatus, remapHydrometerSources } from '../lib/gravity.ts';

let checks=0;
const check=(name,run)=>{run();checks++;console.log('PASS '+name);};
const close=(actual,expected)=>assert.ok(actual!==null&&Math.abs(actual-expected)<1e-10);
check('1.050 OG and 1.010 FG estimate 5.25 percent ABV',()=>close(estimateAbv(1.05,1.01),5.25));
check('1.050 OG and 1.012 FG retain precision before display rounding',()=>close(estimateAbv(1.05,1.012),4.9875));
check('equal OG and FG produce a valid zero rather than a missing result',()=>assert.equal(estimateAbv(1.05,1.05),0));
check('a dry final gravity below water remains valid',()=>close(estimateAbv(1.06,.995),8.53125));
check('missing OG or FG never produces a fabricated alcohol estimate',()=>{for(const pair of [[null,null],[1.05,null],[null,1.012]])assert.equal(estimateAbv(...pair),null);});
check('reversed readings do not produce negative ABV',()=>{assert.equal(estimateAbv(1.01,1.05),null);assert.equal(hydrometerSchema.safeParse({og:1.01,fg:1.05}).success,false);});
check('nonfinite or out-of-range SG is rejected',()=>{for(const pair of [[NaN,1.01],[Infinity,1.01],[1.05,-Infinity],[.999,1],[1.251,1.01],[1.05,.979],[1.05,1.251]]){assert.equal(estimateAbv(...pair),null);assert.equal(hydrometerSchema.safeParse({og:pair[0],fg:pair[1]}).success,false);}});
check('OG alone and a deliberate clearing of values are saveable',()=>{assert.equal(hydrometerSchema.safeParse({og:1.05,fg:null}).success,true);assert.equal(hydrometerSchema.safeParse({og:null,fg:null}).success,true);});

const fixture={id:crypto.randomUUID(),name:'Synthetic ABV regression',recipeId:'kit',startedOn:'2026-10-01',stage:'prepare',checks:{},packetNotes:'Preserve notes',yeastConfirmed:false,createdAt:'2026-10-01T12:00:00.000Z'};
check('legacy batches receive blank measured gravities',()=>assert.deepEqual(batchSchema.parse(fixture).hydrometer,{og:null,fg:null}));
check('recipe targets never fill measured OG or FG',()=>{const batch=batchSchema.parse(fixture);batch.recipe.expectedOG=1.05;batch.recipe.expectedFG=1.01;assert.deepEqual(batchSchema.parse(batch).hydrometer,{og:null,fg:null});});
check('JSON backup round trip retains measured OG and FG',()=>{const book=notebookSchema.parse({schemaVersion:1,batches:[{...fixture,hydrometer:{og:1.05,fg:1.012}}],entries:[]});assert.deepEqual(notebookSchema.parse(JSON.parse(JSON.stringify(book))),book);});

const now=+new Date('2026-10-11T20:00:00.000Z');
const sample=entrySchema.parse({id:crypto.randomUUID(),batchId:fixture.id,type:'reading',at:'2026-10-02T12:00:00.000Z',timezone:'UTC',title:'Measured OG',note:'Corrected hydrometer sample',tempC:20,tempKind:'beer',gravity:1.05,volumeL:null,photos:[],bottling:null,status:'completed',phase:'chill'});
const finalSample={...sample,id:crypto.randomUUID(),at:'2026-10-10T12:00:00.000Z',gravity:1.012,title:'Measured FG',phase:'ferment'};
const originalDraft={og:'',fg:''};
const linkedDraft=selectJournalGravity(selectJournalGravity(originalDraft,'og',sample,fixture.id,now),'fg',finalSample,fixture.id,now);
const linked=hydrometerSchema.parse({...linkedDraft,og:Number(linkedDraft.og),fg:Number(linkedDraft.fg)});
check('explicit journal selection retains measurement date and phase without mutating its inputs',()=>{assert.deepEqual(originalDraft,{og:'',fg:''});assert.deepEqual(linked.ogSource,{entryId:sample.id,measuredAt:sample.at,phase:'chill'});assert.equal(linked.fg,1.012);});
check('journal selections exclude planned, future, deleted, other-batch, missing, and invalid SG samples',()=>{
  const excluded=[{...sample,status:'planned'},{...sample,status:'unconfirmed'},{...sample,at:'2026-10-12T00:00:00.000Z'},{...sample,deletedAt:'2026-10-10T00:00:00.000Z'},{...sample,batchId:crypto.randomUUID()},{...sample,gravity:null},{...sample,gravity:.99},{...sample,gravity:NaN},{...sample,gravity:1.251}];
  assert.deepEqual(journalGravityOptions(excluded,fixture.id,'og',now),[]);
  for(const entry of excluded)assert.throws(()=>selectJournalGravity(originalDraft,'og',entry,fixture.id,now));
});
check('the FG picker accepts dry beer below water while the OG picker rejects it',()=>{const dry={...sample,gravity:.995};assert.equal(journalGravityOptions([dry],fixture.id,'fg',now).length,1);assert.equal(journalGravityOptions([dry],fixture.id,'og',now).length,0);});
check('journal values remain explicit choices rather than automatically populating the calculator',()=>{assert.deepEqual(originalDraft,{og:'',fg:''});assert.deepEqual(batchSchema.parse(fixture).hydrometer,{og:null,fg:null});assert.equal(journalGravityOptions([sample,finalSample],fixture.id,'fg',now)[0].id,finalSample.id);});
check('a manual edit clears only that field provenance even when the entered number is unchanged',()=>{const manual=manualGravity(linkedDraft,'og',linkedDraft.og);assert.equal(manual.ogSource,undefined);assert.deepEqual(manual.fgSource,linkedDraft.fgSource);assert.ok(linkedDraft.ogSource);});
check('an unchanged journal measurement reports its source as current',()=>assert.equal(gravitySourceStatus(linked.ogSource,linked.og,[sample],fixture.id,'og',now),'current'));
check('changed SG, sample date, phase, status, or future date is detected without silently changing the copy',()=>{
  for(const changed of [{...sample,gravity:1.06},{...sample,at:'2026-10-03T12:00:00.000Z'},{...sample,phase:'ferment'},{...sample,status:'planned'},{...sample,at:'2026-10-12T00:00:00.000Z'}])assert.equal(gravitySourceStatus(linked.ogSource,linked.og,[changed],fixture.id,'og',now),'changed');
  assert.equal(linked.og,1.05);
});
check('a journal title or note edit does not falsely mark unchanged measurement data as stale',()=>assert.equal(gravitySourceStatus(linked.ogSource,linked.og,[{...sample,title:'Renamed',note:'More detail'}],fixture.id,'og',now),'current'));
check('deleted or missing sources remain explicit unavailable snapshots',()=>{for(const entries of [[],[{...sample,deletedAt:'2026-10-10T00:00:00.000Z'}],[{...sample,batchId:crypto.randomUUID()}]])assert.equal(gravitySourceStatus(linked.ogSource,linked.og,entries,fixture.id,'og',now),'unavailable');assert.equal(linked.og,1.05);});
check('metadata without its copied gravity is rejected',()=>assert.equal(hydrometerSchema.safeParse({...linked,og:null}).success,false));
check('JSON round trip retains dated gravity provenance',()=>{const book=notebookSchema.parse({schemaVersion:1,batches:[{...fixture,hydrometer:linked}],entries:[sample,finalSample]});assert.deepEqual(notebookSchema.parse(JSON.parse(JSON.stringify(book))),book);});
check('import remaps journal source IDs to imported entries without changing source dates or values',()=>{
  const newBatch=crypto.randomUUID(),newOriginal=crypto.randomUUID(),newFinal=crypto.randomUUID(),ids=new Map([[sample.id,newOriginal],[finalSample.id,newFinal]]);
  const imported=remapHydrometerSources(linked,ids);
  assert.equal(imported.ogSource.entryId,newOriginal);assert.equal(imported.fgSource.entryId,newFinal);assert.equal(imported.ogSource.measuredAt,sample.at);assert.equal(imported.og,1.05);assert.equal(linked.ogSource.entryId,sample.id);
  assert.equal(gravitySourceStatus(imported.ogSource,imported.og,[{...sample,id:newOriginal,batchId:newBatch}],newBatch,'og',now),'current');
});
check('import preserves legacy no-source shapes and missing-source warnings',()=>{assert.deepEqual(remapHydrometerSources({og:null,fg:null},new Map()),{og:null,fg:null});const missing=remapHydrometerSources(linked,new Map());assert.equal(gravitySourceStatus(missing.ogSource,missing.og,[],fixture.id,'og',now),'unavailable');});
check('draft recovery keeps values and the valid source when the other provenance is corrupt',()=>{const recovered=recoverGravityDraft({...linkedDraft,ogSource:{entryId:'broken',measuredAt:'bad-date',phase:'unknown'}});assert.equal(recovered.og,linkedDraft.og);assert.equal(recovered.fg,linkedDraft.fg);assert.equal(recovered.ogSource,undefined);assert.deepEqual(recovered.fgSource,linkedDraft.fgSource);});
check('draft recovery rejects unusable drafts and drops metadata on blank or invalid values',()=>{for(const invalid of [null,[],{},'text',{og:1.05,fg:''},{og:'1'.repeat(51),fg:''}])assert.equal(recoverGravityDraft(invalid),null);for(const og of ['', 'bad', 'Infinity', '.99']){const recovered=recoverGravityDraft({...linkedDraft,og});assert.equal(recovered.og,og);assert.equal(recovered.ogSource,undefined);}});
check('draft recovery retains legacy strings, partial typing, and well-formed dated sources',()=>{assert.deepEqual(recoverGravityDraft({og:'1.',fg:''}),{og:'1.',fg:''});assert.deepEqual(recoverGravityDraft(linkedDraft),linkedDraft);});

if(process.argv.includes('--api')){
  const origin='http://127.0.0.1:5173';
  const signIn=await fetch(origin+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
  const cookie=signIn.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie,'Local preview sign-in');
  const request=(options={})=>fetch(origin+'/api/notebook',{...options,headers:{Cookie:cookie,'x-fieldbook':'1','Content-Type':'application/json'}});
  const initial=await(await request()).json();let revision=initial.revision,changed=false;
  assert.ok(initial.book.batches.length<40,'Leave room for the temporary regression batch');
  const put=async book=>{const r=await request({method:'PUT',body:JSON.stringify({book,revision})});if(r.ok){revision=(await r.clone().json()).revision;changed=true;}return r;};
  const read=async()=>{const data=await(await request()).json();return data.book;};
  const has=(book)=>book.batches.find(b=>b.id===fixture.id);
  try{
    const candidate=structuredClone(initial.book);candidate.batches.push(fixture);
    let response=await put(candidate);
    check('API accepts a legacy-shaped batch without a hydrometer field',()=>assert.equal(response.status,200));
    let saved=await read();
    check('API supplies blank measured readings for legacy data',()=>assert.deepEqual(has(saved).hydrometer,{og:null,fg:null}));
    has(saved).hydrometer={og:1.05,fg:null};response=await put(saved);assert.equal(response.status,200);
    saved=await read();
    check('API preserves an OG saved before fermentation',()=>assert.deepEqual(has(saved).hydrometer,{og:1.05,fg:null}));
    has(saved).hydrometer.fg=1.012;response=await put(saved);assert.equal(response.status,200);
    saved=await read();
    check('API round trip retains the completed OG/FG pair',()=>assert.deepEqual(has(saved).hydrometer,{og:1.05,fg:1.012}));
    const invalid=structuredClone(saved);has(invalid).hydrometer.fg=1.06;response=await put(invalid);
    check('server rejects FG higher than OG',()=>assert.equal(response.status,400));
    has(invalid).hydrometer={og:1.5,fg:1.01};response=await put(invalid);
    check('server rejects SG outside the supported beer range',()=>assert.equal(response.status,400));
    const unchanged=await read();
    check('invalid saves preserve the last valid pair',()=>assert.deepEqual(has(unchanged).hydrometer,{og:1.05,fg:1.012}));
    has(saved).hydrometer={og:null,fg:null};response=await put(saved);assert.equal(response.status,200);
    saved=await read();
    check('saved calculator readings can be cleared',()=>assert.deepEqual(has(saved).hydrometer,{og:null,fg:null}));
  }finally{
    if(changed){assert.equal((await put(initial.book)).status,200,'Restore original local notebook');assert.deepEqual(await read(),notebookSchema.parse(initial.book));console.log('Restored and verified original local notebook.');}
  }
}
console.log(`${checks} ABV checks passed.`);

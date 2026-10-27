import assert from 'node:assert/strict';
import {notebookSchema,emptyNotebook,batchSchema,entrySchema,kombuchaBatchSchema,kombuchaEntrySchema,houseKombuchaRecipe,referencedPhotoIds,flavorGroupSchema} from '../lib/notebook.ts';
import {backupCounts,importPreflight,mergeNotebook,backupSnapshot,isBackupCurrent} from '../lib/backup.ts';
import {kombuchaDay,kombuchaInstructions,kombuchaStarter} from '../lib/kombucha-guide.ts';
import {kombuchaBatchDraftSchema,kombuchaEntryDraftSchema,kombuchaGroupDraftSchema} from '../lib/kombucha-drafts.ts';

let passed=0;
const check=(name,run)=>{run();passed++;console.log('PASS '+name);};
const id=()=>crypto.randomUUID(),past=new Date(Date.now()-86400000).toISOString();
const ipa=batchSchema.parse({id:id(),name:'Synthetic IPA compatibility',recipeId:'kit',startedOn:'2026-10-01',stage:'ferment',checks:{'ferment-1':true},packetNotes:'Original packet notes',yeastConfirmed:false,createdAt:past,hydrometer:{og:1.05,fg:1.01}});
const beerEntry=entrySchema.parse({id:id(),batchId:ipa.id,type:'reading',at:past,timezone:'America/Los_Angeles',title:'Original IPA sample',note:'Keep this note',tempC:20,tempKind:'beer',gravity:1.01,volumeL:null,photos:[],bottling:null,status:'completed',phase:'ferment'});
ipa.hydrometer.fgSource={entryId:beerEntry.id,measuredAt:past,phase:'ferment'};
const group=flavorGroupSchema.parse({id:id(),name:'Synthetic ginger',ingredients:'Measured ginger and tea',bottles:2,volumeL:.5,bottledOn:'2026-10-01',chilledOn:'2026-10-03',notes:'Keep the flavor notes'});
const kombucha=kombuchaBatchSchema.parse({id:id(),name:'Synthetic house culture',startedOn:'2026-10-01',stage:'first-ferment',createdAt:past,checks:{'culture-0':true},notes:'Original equipment notes',starterNotes:'Starter amount recorded by brewer',recipe:houseKombuchaRecipe(),flavors:[group]});
const kEntry=kombuchaEntrySchema.parse({id:id(),batchId:kombucha.id,type:'reading',at:past,timezone:'America/Los_Angeles',title:'Synthetic pH',note:'House tasting note',tempC:24.4,tempKind:'tea',ph:3.1,volumeL:3,tartness:'Tart and dry',photos:[],status:'completed',phase:'first-ferment',flavorId:group.id});
const legacy={schemaVersion:1,batches:[ipa],entries:[beerEntry]};
const mixed=notebookSchema.parse({...legacy,kombuchaBatches:[kombucha],kombuchaEntries:[kEntry]});

check('legacy IPA notebook migrates without changing any normalized IPA record',()=>{const next=notebookSchema.parse(legacy);assert.equal(next.schemaVersion,2);assert.deepEqual(next.batches,legacy.batches);assert.deepEqual(next.entries,legacy.entries);assert.deepEqual(next.kombuchaBatches,[]);assert.deepEqual(next.kombuchaEntries,[]);});
check('mixed notebook round trip preserves recipes, starter notes, readings and flavor dates',()=>assert.deepEqual(notebookSchema.parse(JSON.parse(JSON.stringify(mixed))),mixed));
check('supplied water amounts stay intact and new batches have a sourced starter quantity',()=>{const r=houseKombuchaRecipe();assert.equal(r.hotWater,'4 cups filtered water');assert.equal(r.coldWater,'8 cups cold filtered water');assert.match(r.starter,/2 cups/);assert.match(r.source,/Cornell/);});
check('instructions use the edited batch recipe and temperature units',()=>{const r={...houseKombuchaRecipe(),hotWater:'6 cups filtered water',coldWater:'5 cups cold filtered water',tea:'4 tbsp black tea',sugar:'¾ cup sugar',starter:'SCOBY + 3 cups starter',steepMin:9,steepMax:9,minC:21,maxC:27,idealC:25,startPhMax:4.2,finishPhMin:2.7,finishPhMax:3.4,referenceDaysMin:12,referenceDaysMax:16};const guide=kombuchaInstructions(r,c=>`${c}°C`);assert.match(guide.tea.steps.join(' '),/6 cups of filtered water/);assert.match(guide.tea.steps.join(' '),/4 tbsp of black tea.*9 minutes/);assert.match(guide.tea.steps.join(' '),/¾ cup of sugar/);assert.match(guide.culture.steps.join(' '),/5 cups of cold filtered water/);assert.match(guide.culture.steps.join(' '),/21°C–27°C.*25°C/);assert.match(guide.culture.steps.join(' '),/SCOBY and 3 cups of starter/);assert.match(guide.culture.steps.join(' '),/4.2 or lower/);assert.match(guide['first-ferment'].steps.join(' '),/12–16 days/);assert.match(guide['first-ferment'].steps.join(' '),/2.7–3.4/);assert.equal(kombuchaStarter(r),r.starter);});
check('legacy house starter guidance fills the omission without mutating saved data',()=>{const r={...houseKombuchaRecipe(),starter:'SCOBY culture + starter liquid; record the amount actually used'};const before=JSON.stringify(r);assert.match(kombuchaStarter(r),/2 cups/);assert.equal(JSON.stringify(r),before);assert.equal(kombuchaStarter({...r,hotWater:'6 cups filtered water'}),r.starter);});
check('house fermentation preference does not replace the reference timeline',()=>{const r=houseKombuchaRecipe();assert.equal(r.referenceDaysMin,8);assert.equal(r.referenceDaysMax,10);assert.match(r.houseMethod,/few weeks/);});
check('pH 0 is a reading, while unknown pH remains null',()=>{assert.equal(kombuchaEntrySchema.parse({...kEntry,ph:0}).ph,0);assert.equal(kombuchaEntrySchema.parse({...kEntry,ph:null}).ph,null);});
check('out-of-range and nonfinite pH values are rejected',()=>{for(const ph of [-.1,14.1,NaN,Infinity])assert.equal(kombuchaEntrySchema.safeParse({...kEntry,ph}).success,false);});
check('future observations cannot be completed',()=>assert.equal(notebookSchema.safeParse({...mixed,kombuchaEntries:[{...kEntry,at:new Date(Date.now()+86400000).toISOString()}]}).success,false));
check('planned future records remain plans after JSON round trip',()=>{const b=notebookSchema.parse({...mixed,kombuchaEntries:[{...kEntry,status:'planned',at:new Date(Date.now()+86400000).toISOString()}]});assert.equal(notebookSchema.parse(JSON.parse(JSON.stringify(b))).kombuchaEntries[0].status,'planned');});
check('entry cannot point to an IPA batch as a Kombucha batch',()=>assert.equal(notebookSchema.safeParse({...mixed,kombuchaEntries:[{...kEntry,batchId:ipa.id}]}).success,false));
check('entry cannot borrow a flavor from another batch',()=>assert.equal(notebookSchema.safeParse({...mixed,kombuchaEntries:[{...kEntry,flavorId:id()}]}).success,false));
check('duplicate record IDs across brew types are rejected',()=>assert.equal(notebookSchema.safeParse({...mixed,kombuchaBatches:[{...kombucha,id:ipa.id}],kombuchaEntries:[]}).success,false));
check('refrigeration cannot precede bottling or exist without it',()=>{assert.equal(flavorGroupSchema.safeParse({...group,chilledOn:'2026-09-30'}).success,false);assert.equal(flavorGroupSchema.safeParse({...group,bottledOn:null}).success,false);});
check('reversed recipe ranges are rejected',()=>assert.equal(kombuchaBatchSchema.safeParse({...kombucha,recipe:{...kombucha.recipe,finishPhMin:5,finishPhMax:3}}).success,false));
check('combined record limits include both brew types and Trash',()=>{const b={...mixed,batches:Array.from({length:39},()=>({...ipa,id:id(),deletedAt:past})),kombuchaBatches:[kombucha,{...kombucha,id:id(),flavors:[]}],entries:[],kombuchaEntries:[]};assert.equal(notebookSchema.safeParse(b).success,false);assert.equal(importPreflight({...emptyNotebook(),batches:b.batches},{...emptyNotebook(),kombuchaBatches:b.kombuchaBatches},0).allowed,false);});
check('photo protection and backup counts cover both types and Trash',()=>{const shared=id(),other=id();const b={...mixed,entries:[{...beerEntry,photos:[{id:shared,caption:'IPA'}]}],kombuchaEntries:[{...kEntry,deletedAt:past,photos:[{id:shared,caption:'shared'},{id:other,caption:'Kombucha'}]}]};assert.deepEqual(referencedPhotoIds(b),[shared,other]);assert.deepEqual(backupCounts(b),{batches:2,entries:2,photos:2});});
check('mixed import remaps batch, entry, flavor, photo and gravity-source IDs',()=>{const photo=id(),newPhoto=id();const incoming={...mixed,kombuchaEntries:[{...kEntry,photos:[{id:photo,caption:'Keep caption'}]}]};const before=JSON.stringify(incoming);const merged=notebookSchema.parse(mergeNotebook(emptyNotebook(),incoming,new Map([[photo,newPhoto]])));assert.notEqual(merged.kombuchaBatches[0].id,kombucha.id);assert.equal(merged.kombuchaEntries[0].batchId,merged.kombuchaBatches[0].id);assert.equal(merged.kombuchaEntries[0].flavorId,merged.kombuchaBatches[0].flavors[0].id);assert.equal(merged.kombuchaEntries[0].photos[0].id,newPhoto);assert.equal(merged.batches[0].hydrometer.fgSource.entryId,merged.entries[0].id);assert.equal(merged.batches[0].hydrometer.fgSource.measuredAt,past);assert.equal(JSON.stringify(incoming),before);});
check('repeated import adds independent copies and preserves the existing notebook',()=>{const once=mergeNotebook(mixed,mixed,new Map());const twice=notebookSchema.parse(mergeNotebook(once,mixed,new Map()));assert.equal(twice.kombuchaBatches.length,3);assert.deepEqual(twice.batches[0],mixed.batches[0]);assert.deepEqual(twice.kombuchaBatches[0],mixed.kombuchaBatches[0]);});
check('Kombucha changes invalidate a prepared backup',()=>{const snapshot=backupSnapshot(mixed,4);assert.equal(isBackupCurrent(snapshot,{...mixed,kombuchaBatches:[{...kombucha,starterNotes:'Changed'}]},4),false);});
check('calendar brew days remain stable across DST and future plans',()=>{assert.equal(kombuchaDay({startedOn:'2026-10-31'},'2026-11-02'),3);assert.equal(kombuchaDay({startedOn:'2026-11-02'},'2026-11-01'),0);});
check('unfinished batch drafts recover without weakening saved recipe validation',()=>{const draft={...kombucha,name:'',startedOn:'',recipe:{...kombucha.recipe,minC:30,maxC:20,steepMin:0}};assert.equal(kombuchaBatchDraftSchema.safeParse(draft).success,true);assert.equal(kombuchaBatchSchema.safeParse(draft).success,false);});
check('invalid pH remains recoverable as a draft for correction',()=>{const {at,...entry}=kEntry;const draft={...entry,ph:15,atLocal:''};assert.equal(kombuchaEntryDraftSchema.safeParse(draft).success,true);assert.equal(kombuchaEntrySchema.safeParse({...entry,at,ph:15}).success,false);});
check('a partial flavor-date draft recovers before its bottling date is supplied',()=>{const draft={batchId:kombucha.id,value:{...group,name:'',bottledOn:null}};assert.equal(kombuchaGroupDraftSchema.safeParse(draft).success,true);assert.equal(flavorGroupSchema.safeParse(draft.value).success,false);});

if(process.argv.includes('--api')) {
  const origin=process.env.FIELDBOOK_TEST_ORIGIN||'http://127.0.0.1:8878';
  const url=new URL(origin);assert.ok(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname),'API tests are loopback-only');
  const signIn=await fetch(origin+'/signin-with-chatgpt?return_to=/',{redirect:'manual'}),cookie=signIn.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie,'Local development sign-in required');
  const req=(path,options={})=>fetch(origin+path,{...options,headers:{Cookie:cookie,'x-fieldbook':'1',...options.headers}});
  const initial=await(await req('/api/notebook')).json();const original=notebookSchema.parse(initial.book);let revision=initial.revision;const created=[];
  const put=book=>req('/api/notebook',{method:'PUT',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({book,revision})});
  const jpeg=Buffer.from('/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABgf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCogJoRv//Z','base64');
  try {
    check('anonymous API access remains rejected',()=>{});assert.equal((await fetch(origin+'/api/notebook')).status,401);
    const upload=await req('/api/photos',{method:'POST',headers:{'Content-Type':'image/jpeg'},body:jpeg});assert.equal(upload.status,201);const photoId=(await upload.json()).id;created.push(photoId);
    const fixture=structuredClone(mixed);fixture.kombuchaEntries[0].photos=[{id:photoId,caption:'Synthetic JPEG'}];
    let response=await put(fixture);assert.equal(response.status,200,await response.text());revision++;
    const loaded=await(await req('/api/notebook')).json();check('API persists both brew types and Kombucha photos',()=>assert.deepEqual(loaded.book,fixture));
    check('downloaded Kombucha photo bytes are exact',()=>{});assert.deepEqual(Buffer.from(await(await req('/api/photos/'+photoId)).arrayBuffer()),jpeg);
    check('saved Kombucha photo cannot be deleted',()=>{});assert.equal((await req('/api/photos/'+photoId,{method:'DELETE'})).status,409);
    check('photo cleanup excludes saved Kombucha references',()=>{});assert.equal((await(await req('/api/photos')).json()).unused.includes(photoId),false);
    const deleted={...fixture,kombuchaBatches:fixture.kombuchaBatches.map(b=>({...b,deletedAt:past}))};response=await put(deleted);assert.equal(response.status,200);revision++;
    check('Kombucha Trash still protects photo bytes',()=>{});assert.equal((await req('/api/photos/'+photoId,{method:'DELETE'})).status,409);
    check('invalid Kombucha pH is rejected by the API',()=>{});assert.equal((await put({...fixture,kombuchaEntries:[{...fixture.kombuchaEntries[0],ph:15}]})).status,400);
    check('missing Kombucha photos are rejected by the API',()=>{});assert.equal((await put({...fixture,kombuchaEntries:[{...fixture.kombuchaEntries[0],photos:[{id:id(),caption:'Missing'}]}]})).status,400);
    check('cross-origin mixed writes remain rejected',()=>{});assert.equal((await req('/api/notebook',{method:'PUT',headers:{Origin:'https://outside.example','Content-Type':'application/json'},body:JSON.stringify({book:fixture,revision})})).status,403);
    check('stale mixed writes cannot overwrite the notebook',()=>{});assert.equal((await req('/api/notebook',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({book:fixture,revision:revision-1})})).status,409);
    response=await put(fixture);assert.equal(response.status,200);revision++;
    check('restoring a Kombucha batch preserves its entries and photo',()=>{});assert.deepEqual((await(await req('/api/notebook')).json()).book,fixture);
  } finally {
    const latest=await(await req('/api/notebook')).json();revision=latest.revision;
    const restore=await put(original);assert.equal(restore.status,200,'Restore original local notebook');
    for(const photo of created)assert.equal((await req('/api/photos/'+photo,{method:'DELETE'})).status,200);
    const final=await(await req('/api/notebook')).json();check('API suite restores the original local notebook and photo quota',()=>{assert.deepEqual(final.book,original);assert.equal(final.quota.count,initial.quota.count);});
  }
}
console.log(`${passed} Kombucha compatibility checks passed.`);

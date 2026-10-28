import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {batchSchema,entrySchema,emptyNotebook,emptyRecipe,notebookSchema,notebookVersion} from '../lib/notebook.ts';
import {recipeStartingPoint,applyRecipePreset,changeRecipeMethod,repeatRecipe,recoverBatchDraft} from '../lib/beer-recipes.ts';
import {guideForMethod,recipeMethod} from '../lib/content.ts';
import {mergeNotebook} from '../lib/backup.ts';
import {readNotebook,writeNotebook,addPhoto,readPhoto} from '../lib/browser-storage.ts';
import {decodePhoto} from '../lib/photos.ts';

let passed=0;
async function check(name,run){await run();passed++;console.log('PASS '+name);}
const id=()=>crypto.randomUUID(),at='2026-10-01T12:00:00.000Z';
const legacy=batchSchema.parse({id:id(),name:'Original kit batch',recipeId:'kit',startedOn:'2026-10-01',stage:'ferment',
  checks:{'prepare-0':true},packetNotes:'Original ingredients and notes',yeastConfirmed:false,createdAt:at});
const custom=()=>batchSchema.parse({...legacy,id:id(),name:'Backyard IPA — café',recipeId:'custom',checks:{},
  recipe:{...emptyRecipe(),method:'all-grain',batchVolumeL:18.75,source:'My recipe, revision 2',
    steps:emptyRecipe().steps.map(s=>s.stage==='steep'?{...s,instruction:'Mash this grain bill.\nKeep my exact notes: <b>not markup</b>.',quantity:'4.7 kg malt; water per my recipe',tempC:66,minutes:60,confirmed:true}:s)}});

await check('a custom starting point has no borrowed method, volume, yeast or instructions',()=>{
  const recipe=recipeStartingPoint('custom');assert.equal(recipe.method,undefined);assert.equal(recipe.batchVolumeL,undefined);
  assert.equal(recipe.yeastName,'');assert.ok(recipe.steps.every(s=>s.instruction===''&&!s.confirmed));
});
await check('Hazy Session is an explicit one-gallon extract-with-grains preset',()=>{
  const recipe=recipeStartingPoint('kit');assert.equal(recipe.method,'extract-grains');assert.equal(recipe.batchVolumeL,3.785411784);
  assert.match(recipe.source,/hazy-session/);assert.ok(recipe.steps.every(s=>s.instruction===''&&!s.confirmed));
});
for(const version of [1,2])await check(`version ${version} migrates without rewriting any original batch field`,()=>{
  const migrated=notebookSchema.parse({schemaVersion:version,batches:[legacy],entries:[]});
  assert.equal(migrated.schemaVersion,3);assert.deepEqual(migrated.batches,[legacy]);assert.equal('method' in migrated.batches[0].recipe,false);
});
await check('legacy recipe IDs infer their old method without adding saved fields',()=>{
  assert.equal(recipeMethod(legacy.recipe,'kit'),'extract-grains');assert.equal(recipeMethod(legacy.recipe,'kama'),'extract');
  assert.equal(recipeMethod(legacy.recipe,'sumpin'),'all-grain');assert.equal(recipeMethod(emptyRecipe(),'custom'),undefined);
});
await check('custom recipes require a known brewing method',()=>{
  assert.equal(batchSchema.safeParse({...custom(),recipe:emptyRecipe()}).success,false);
  assert.equal(batchSchema.safeParse({...custom(),recipe:{...custom().recipe,method:'magic'}}).success,false);
});
await check('volume boundaries reject zero, negative and excessive values without inventing a volume',()=>{
  for(const value of [0,-1,1000.01])assert.equal(batchSchema.safeParse({...custom(),recipe:{...custom().recipe,batchVolumeL:value}}).success,false);
  for(const value of [.01,1000,null])assert.equal(batchSchema.safeParse({...custom(),recipe:{...custom().recipe,batchVolumeL:value}}).success,true);
});
for(const [method,label] of [['extract','Mix extract'],['extract-grains','Steep & mix'],['all-grain','Mash']])await check(`${method} selects the matching wort step and retains every stable stage ID`,()=>{
  const steps=guideForMethod(method);assert.equal(steps[1].short,label);
  assert.deepEqual(steps.map(s=>s.id),['prepare','steep','boil','chill','ferment','bottle','taste']);
  assert.ok(steps.every(s=>!JSON.stringify(s).includes('Hazy Session')));
});
await check('preset switching preserves written instructions and yeast, and clears confirmations',()=>{
  const original={...custom().recipe,yeastName:'My chosen yeast'};const copy=structuredClone(original);
  const next=applyRecipePreset(original,'kit');assert.equal(next.method,'extract-grains');assert.equal(next.yeastName,'My chosen yeast');
  assert.equal(next.steps[1].instruction,original.steps[1].instruction);assert.equal(next.steps[1].quantity,original.steps[1].quantity);
  assert.ok(next.steps.every(s=>!s.confirmed));assert.deepEqual(original,copy);
  assert.deepEqual(applyRecipePreset(next,'custom'),next);
});
await check('changing method retains recipe text and values while requiring another check',()=>{
  const recipe=custom().recipe;const changed=changeRecipeMethod(recipe,'extract');
  assert.equal(changed.steps[1].instruction,recipe.steps[1].instruction);assert.equal(changed.batchVolumeL,18.75);
  assert.equal(changed.steps[1].confirmed,false);assert.equal(recipe.steps[1].confirmed,true);
});
await check('repeating a recipe copies method, volume and instructions independently',()=>{
  const recipe=custom().recipe,next=repeatRecipe(recipe);assert.equal(next.method,'all-grain');assert.equal(next.batchVolumeL,18.75);
  assert.equal(next.steps[1].confirmed,false);next.steps[1].instruction='Edited copy';assert.notEqual(next.steps[1].instruction,recipe.steps[1].instruction);
});
await check('an unfinished numeric draft recovers for correction and malformed shapes do not render',()=>{
  const draft={recipeId:'custom',editingId:null,name:'Unsaved recipe',startedOn:'2026-10-01',packetNotes:'Keep this',yeastConfirmed:false,
    recipe:{...custom().recipe,minC:25,maxC:18,batchVolumeL:-1}};
  assert.deepEqual(recoverBatchDraft(draft),draft);
  assert.equal(recoverBatchDraft({...draft,recipe:{steps:null}}),null);
  assert.equal(recoverBatchDraft({...draft,recipe:{...draft.recipe,method:'unknown'}}),null);
});
await check('version 3 round trips all custom fields, Unicode and written markup as plain strings',()=>{
  const batch=custom(),book={...emptyNotebook(),batches:[batch]};
  const backup=JSON.parse(JSON.stringify({format:'small-batch-fieldbook',version:notebookVersion,book,photos:{}}));
  assert.equal(backup.version,3);assert.deepEqual(notebookSchema.parse(backup.book).batches,[batch]);
  assert.equal(notebookSchema.safeParse({...book,schemaVersion:4}).success,false);
});

globalThis.indexedDB=new IDBFactory();
const jpeg=new Blob([new Uint8Array([255,216,255,224,0,2,255,217])],{type:'image/jpeg'});
const photo=await addPhoto(jpeg),batch=custom();
const entry=entrySchema.parse({id:id(),batchId:batch.id,type:'note',at,timezone:'America/Los_Angeles',title:'Saved photo in Trash',note:'Keep this note',
  tempC:null,tempKind:'beer',gravity:null,volumeL:null,photos:[{id:photo.id,caption:'Recipe photo'}],bottling:null,status:'completed',phase:'steep',deletedAt:at});
const book=notebookSchema.parse({...emptyNotebook(),batches:[batch],entries:[entry]});
await check('browser persistence retains a custom recipe and its Trash photo exactly',async()=>{
  await writeNotebook(book,0);assert.deepEqual((await readNotebook()).book,book);
  assert.deepEqual(new Uint8Array(await (await readPhoto(photo.id)).arrayBuffer()),new Uint8Array(await jpeg.arrayBuffer()));
});
await check('additive import preserves custom fields, remaps IDs and restores embedded photo bytes',async()=>{
  const bytes="data:image/jpeg;base64,"+Buffer.from(await (await readPhoto(photo.id)).arrayBuffer()).toString("base64");const exported=JSON.parse(JSON.stringify({version:3,book,photos:{[photo.id]:bytes}}));
  globalThis.indexedDB=new IDBFactory();
  const restored=await addPhoto(decodePhoto(exported.photos[photo.id]));
  const merged=mergeNotebook({...emptyNotebook(),batches:[legacy]},notebookSchema.parse(exported.book),new Map([[photo.id,restored.id]]));
  await writeNotebook(merged,0);const saved=(await readNotebook()).book;
  assert.deepEqual(saved.batches[0],legacy);assert.deepEqual(saved.batches[1].recipe,batch.recipe);assert.notEqual(saved.batches[1].id,batch.id);
  assert.equal(saved.entries[0].batchId,saved.batches[1].id);assert.equal(saved.entries[0].deletedAt,at);
  assert.deepEqual(new Uint8Array(await (await readPhoto(restored.id)).arrayBuffer()),new Uint8Array(await jpeg.arrayBuffer()));
});
console.log(`${passed} own-recipe compatibility checks passed.`);

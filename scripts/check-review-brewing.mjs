import assert from 'node:assert/strict';
import { entrySchema } from '../lib/notebook.ts';
import { contextualEntryPhase, bottlingEvidence, missingPrimingInputs } from '../lib/brew-state.ts';

let count=0;
const check=(name,run)=>{run();count++;console.log('PASS '+name);};
const now=Date.parse('2026-10-11T12:00:00Z'),hour=3600000,batchId=crypto.randomUUID();
const entry=(overrides={})=>entrySchema.parse({id:crypto.randomUUID(),batchId,type:'reading',at:new Date(now-hour).toISOString(),timezone:'UTC',title:'Synthetic evidence test',note:'',tempC:null,tempKind:'beer',gravity:1.012,volumeL:null,photos:[],bottling:null,status:'completed',phase:'ferment',...overrides});
const ago=hours=>new Date(now-hours*hour).toISOString();

check('Bottling action logs a fermentation sample despite the current Bottle stage',()=>{
  const saved=entry({phase:contextualEntryPhase('bottle','fermentation-gravity')});
  assert.equal(saved.phase,'ferment');
  assert.deepEqual(bottlingEvidence([saved],now).readings.map(e=>e.id),[saved.id]);
});
check('general readings retain their phase while explicit actions choose theirs',()=>{
  assert.equal(contextualEntryPhase('steep'),'steep');
  assert.equal(contextualEntryPhase(null),null);
  assert.equal(contextualEntryPhase('taste','dry-hop'),'ferment');
  assert.equal(contextualEntryPhase('ferment','bottling'),'bottle');
});
check('excluded gravity records explain planned, unconfirmed and wrong-phase states',()=>{
  const planned=entry({status:'planned'}),unknown=entry({status:'unconfirmed',phase:null}),bottle=entry({phase:'bottle'});
  const result=bottlingEvidence([planned,unknown,bottle],now);
  assert.equal(result.readings.length,0);
  assert.equal(result.excludedReadings.length,3);
  assert.ok(result.excludedReadings.find(e=>e.entry.id===planned.id).reasons.some(r=>r.includes('Planned')));
  assert.equal(result.excludedReadings.find(e=>e.entry.id===unknown.id).reasons.length,2);
  assert.ok(result.excludedReadings.find(e=>e.entry.id===bottle.id).reasons.some(r=>r.includes('outside the Ferment')));
});
check('a future completed record is excluded even before save validation',()=>{
  const result=bottlingEvidence([entry({at:ago(-1)})],now);
  assert.equal(result.readings.length,0);
  assert.ok(result.excludedReadings[0].reasons.some(r=>r.includes('future')));
});
check('latest actual dry hop resets evidence and explains same-time or earlier samples',()=>{
  const earlyHop=entry({type:'dry-hop',gravity:null,at:ago(100)}),lastHop=entry({type:'dry-hop',gravity:null,at:ago(20)});
  const before=entry({at:ago(21)}),sameTime=entry({at:ago(20)}),after=entry({at:ago(1)});
  const plannedHop=entry({type:'dry-hop',gravity:null,status:'planned',at:ago(2)});
  const result=bottlingEvidence([earlyHop,lastHop,before,sameTime,after,plannedHop],now);
  assert.equal(result.lastHop.id,lastHop.id);
  assert.deepEqual(result.readings.map(e=>e.id),[after.id]);
  assert.equal(result.excludedReadings.length,2);
  assert.ok(result.excludedReadings.every(e=>e.reasons.some(r=>r.includes('At or before'))));
  assert.match(result.windowLabel,/after the latest completed dry-hop/);
});
check('deleted records and readings without gravity do not appear in exclusions',()=>{
  const result=bottlingEvidence([entry({deletedAt:ago(0),phase:'bottle'}),entry({gravity:null,status:'planned'})],now);
  assert.equal(result.readings.length,0);
  assert.equal(result.excludedReadings.length,0);
});
check('all-history statistics include every returned row, including a sixth older reading',()=>{
  const samples=[entry({at:ago(130),gravity:1.030}),...[97,73,49,25,1].map(h=>entry({at:ago(h)}))];
  const result=bottlingEvidence(samples,now);
  assert.equal(result.readings.length,6);
  assert.equal(result.spanHours,129);
  assert.ok(Math.abs(result.spread-.018)<1e-10);
  assert.equal(result.readings.at(-1).gravity,1.030);
  assert.equal(result.windowLabel,'All completed fermentation readings');
});
check('sugar-only priming record lists context that is still missing',()=>{
  assert.deepEqual(missingPrimingInputs({volume:'',sugarType:'',sugarGrams:'25',peakTemp:'',co2:''}),['actual packaged volume','sugar type','highest fermentation temperature','target carbonation']);
});
check('zero-valued measurements are supplied values, not missing inputs',()=>{
  assert.deepEqual(missingPrimingInputs({volume:2.5,sugarType:'Dextrose',sugarGrams:0,peakTemp:0,co2:2.2}),[]);
});
check('whitespace and null priming values remain incomplete',()=>{
  assert.equal(missingPrimingInputs({volume:null,sugarType:' ',sugarGrams:' ',peakTemp:null,co2:''}).length,5);
});
console.log(`${count} review brewing regressions passed.`);

import type { Entry, GravitySource, Hydrometer } from "./notebook";

export type GravityField = "og" | "fg";
export type GravityDraft = {og:string;fg:string;ogSource?:GravitySource;fgSource?:GravitySource};

export function journalGravityOptions(entries:Entry[],batchId:string,field:GravityField,now=Date.now()):Entry[] {
  return entries.filter(entry=>entry.batchId===batchId&&!entry.deletedAt&&entry.status==="completed"&&
    Number.isFinite(+new Date(entry.at))&&+new Date(entry.at)<=now&&entry.gravity!==null&&
    Number.isFinite(entry.gravity)&&entry.gravity>=(field==="og"?1:.98)&&entry.gravity<=1.25)
    .sort((a,b)=>+new Date(b.at)-+new Date(a.at));
}

export function manualGravity(draft:GravityDraft,field:GravityField,value:string):GravityDraft {
  const next={...draft,[field]:value};
  delete next[`${field}Source`];
  return next;
}

export function selectJournalGravity(draft:GravityDraft,field:GravityField,entry:Entry,batchId:string,now=Date.now()):GravityDraft {
  if(!journalGravityOptions([entry],batchId,field,now).length)throw new Error("Choose a completed, past journal reading in this batch within the calculator's SG range.");
  const text=String(entry.gravity),value=text.includes(".")?text.padEnd(text.indexOf(".")+4,"0"):`${text}.000`;
  return {...draft,[field]:value,[`${field}Source`]:{entryId:entry.id,measuredAt:entry.at,phase:entry.phase}};
}

export function gravitySourceStatus(source:GravitySource,value:number|null,entries:Entry[],batchId:string,field:GravityField,now=Date.now()):"current"|"changed"|"unavailable" {
  const entry=entries.find(item=>item.id===source.entryId&&item.batchId===batchId);
  if(!entry||entry.deletedAt)return "unavailable";
  if(!journalGravityOptions([entry],batchId,field,now).length||entry.gravity!==value||entry.at!==source.measuredAt||entry.phase!==source.phase)return "changed";
  return "current";
}

// Import creates fresh record IDs. Missing sources stay identifiable as unavailable,
// rather than being silently detached or linked to a different journal entry.
export function remapHydrometerSources(hydrometer:Hydrometer,entryIds:Map<string,string>):Hydrometer {
  const next={...hydrometer};
  for(const field of ["og","fg"] as const){
    const source=hydrometer[`${field}Source`];
    if(source)next[`${field}Source`]={...source,entryId:entryIds.get(source.entryId)||source.entryId};
  }
  return next;
}

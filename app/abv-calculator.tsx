"use client";

import { Calculator, ArrowUpRight } from "lucide-react";
import { hydrometerSchema, estimateAbv, type Hydrometer, type Entry } from "@/lib/notebook";
import { gravitySourceStatus, journalGravityOptions, manualGravity, selectJournalGravity, type GravityDraft, type GravityField } from "@/lib/gravity";

export type { GravityDraft } from "@/lib/gravity";
const displayGravity=(value:number|null|undefined)=>{if(value==null)return "";const text=value.toString();return text.includes(".")?text.padEnd(text.indexOf(".")+4,"0"):`${text}.000`;};
export const gravityDraft = (saved?:Hydrometer):GravityDraft => ({og:displayGravity(saved?.og),fg:displayGravity(saved?.fg),...(saved?.ogSource?{ogSource:saved.ogSource}:{}),...(saved?.fgSource?{fgSource:saved.fgSource}:{})});

type Props = {
  value:GravityDraft;
  batchName?:string;
  batchId?:string;
  entries?:Entry[];
  now:number;
  onViewEntry?:(entry:Entry)=>void;
  dirty:boolean;
  busy:boolean;
  ready:boolean;
  onChange:(value:GravityDraft)=>void;
  onReset:()=>void;
  onSave:(value:Hydrometer)=>Promise<void>;
};

export default function AbvCalculator({value,batchName,batchId,entries=[],now,onViewEntry,dirty,busy,ready,onChange,onReset,onSave}:Props) {
  const numeric=(v:string)=>v.trim()===""?null:Number(v);
  const parsed=hydrometerSchema.safeParse({...value,og:numeric(value.og),fg:numeric(value.fg)});
  const issue=(field:"og"|"fg")=>parsed.success?undefined:parsed.error.issues.find(i=>i.path[0]===field)?.message;
  const abv=parsed.success?estimateAbv(parsed.data.og,parsed.data.fg):null;
  const hasValues=!!(value.og||value.fg);
  const formatDate=(iso:string)=>new Date(iso).toLocaleString(undefined,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
  const sourceNote=(field:GravityField)=>{
    const source=value[`${field}Source`];
    if(!value[field])return null;
    if(!source)return <p className="small muted" key={field}><strong>{field.toUpperCase()}:</strong> Entered here; not copied from a journal entry.</p>;
    const status=batchId?gravitySourceStatus(source,numeric(value[field]),entries,batchId,field,now):"unavailable";
    const entry=entries.find(item=>item.id===source.entryId&&item.batchId===batchId&&!item.deletedAt);
    return <div key={field} className={status==="current"?"small muted":"inline-warning small"}>
      <p><strong>{field.toUpperCase()}:</strong> Copied from journal sample <time dateTime={source.measuredAt}>{formatDate(source.measuredAt)}</time>.{entry&&onViewEntry&&<> <button type="button" className="text-button" disabled={busy} onClick={()=>onViewEntry(entry)}>View source entry</button></>}</p>
      {status==="changed"&&<p>The source measurement changed. This calculator keeps the copied value. Choose the reading again below to update it.</p>}
      {status==="unavailable"&&<p>The source entry is no longer available. This calculator keeps its copied value and date.</p>}
    </div>;
  };

  return <section className="paper-panel abv-panel" id="abv-calculator" aria-labelledby="abv-heading">
    <header className="abv-heading"><Calculator size={25} aria-hidden="true"/><div><span className="eyebrow">HYDROMETER · SPECIFIC GRAVITY</span><h2 id="abv-heading">Alcohol calculator</h2></div></header>
    <p>Enter your measured original and final gravity to estimate alcohol by volume.</p>
    <form noValidate onSubmit={e=>{e.preventDefault();if(parsed.success&&batchName&&dirty&&!busy&&ready)void onSave(parsed.data);}}>
      <fieldset className="abv-fields" disabled={busy||!ready}>
        <div className="abv-readings">
          <div><label htmlFor="abv-og">Original gravity (OG)<span className="input-context">Before fermentation</span></label><input id="abv-og" inputMode="decimal" type="number" min="1" max="1.25" step="0.001" placeholder="1.050" value={value.og} onChange={e=>onChange(manualGravity(value,"og",e.target.value))} aria-describedby={issue("og")?"abv-og-error":"abv-method"} aria-invalid={!!issue("og")}/>{issue("og")&&<p className="field-error" id="abv-og-error">{issue("og")}</p>}</div>
          <div><label htmlFor="abv-fg">Final gravity (FG)<span className="input-context">After fermentation, before priming</span></label><input id="abv-fg" inputMode="decimal" type="number" min="0.98" max="1.25" step="0.001" placeholder="1.012" value={value.fg} onChange={e=>onChange(manualGravity(value,"fg",e.target.value))} aria-describedby={issue("fg")?"abv-fg-error":"abv-method"} aria-invalid={!!issue("fg")}/>{issue("fg")&&<p className="field-error" id="abv-fg-error">{issue("fg")}</p>}</div>
        </div>
        <div className="abv-result" aria-live="polite" aria-atomic="true"><span className="eyebrow">ESTIMATED ALCOHOL</span><output aria-label="Estimated alcohol by volume">{abv===null?"—":`${abv.toFixed(2)}%`}<small>ABV</small></output><p>{!parsed.success?"Check the readings to calculate.":abv===null?"Enter both readings for an estimate.":"Approximate alcohol before priming sugar."}</p></div>
      </fieldset>
      <div className="gravity-provenance" aria-live="polite">{sourceNote("og")}{sourceNote("fg")}</div>
      {batchId&&<details className="abv-details"><summary>Use a saved journal reading</summary><p className="small muted">Choose a completed sample from this batch. Values are copied with their date; later journal edits require you to choose the sample again. Only use temperature-corrected hydrometer SG, with OG taken before fermentation and FG before priming.</p><fieldset className="form-fields" disabled={busy||!ready}><div className="form-grid">{(["og","fg"] as const).map(field=>{
        const readings=journalGravityOptions(entries,batchId,field,now);
        return <label key={field}>Use journal reading as {field.toUpperCase()}<select value="" disabled={!readings.length} onChange={e=>{const entry=readings.find(item=>item.id===e.target.value);if(entry)onChange(selectJournalGravity(value,field,entry,batchId,now));}}><option value="">{readings.length?"Choose a measured sample":"No eligible saved readings"}</option>{readings.map(entry=><option key={entry.id} value={entry.id}>{entry.gravity?.toFixed(3)} SG · {formatDate(entry.at)}{entry.title?` · ${entry.title}`:""}</option>)}</select></label>;
      })}</div></fieldset><p className="small muted">Choose a completed, past reading in the accepted SG range. Recipe targets cannot be used as measurements.</p></details>}
      <p className="small muted" id="abv-method">Use the SG scale (1.xxx). Take samples at your hydrometer’s calibration temperature, or <a href="https://www.brewersfriend.com/hydrometer-temp/" target="_blank" rel="noreferrer">temperature-correct each reading <ArrowUpRight size={12}/></a> first.</p>
      <div className="abv-save"><div className="button-row"><button type="submit" className="button compact" disabled={!batchName||!dirty||!parsed.success||busy||!ready}>{busy?"Saving…":"Save readings"}</button>{dirty&&<button type="button" className="text-button" disabled={busy} onClick={onReset}>{batchName?"Reset to saved":"Clear values"}</button>}</div><p className="small muted">{!batchName?"Start a batch to save these readings. You can calculate without one.":dirty?`Unsaved readings for ${batchName}.` :hasValues?`Saved with ${batchName}.`:"You can save OG now and add FG after fermentation."}</p></div>
    </form>
    <details className="abv-details"><summary>How this estimate works</summary><p className="small">ABV ≈ (OG − FG) × 131.25. Use measured hydrometer SG, not recipe targets or uncorrected refractometer/Brix readings. A calculated alcohol level does not confirm that fermentation has finished.</p><a className="small" href="https://www.brewersfriend.com/abv-calculator/" target="_blank" rel="noreferrer">Formula reference · Brewer’s Friend <ArrowUpRight size={12}/></a></details>
  </section>;
}

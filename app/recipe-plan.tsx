"use client";
import type { Recipe, RecipeStep } from "@/lib/notebook";
import { cToF, fToC, emptyRecipe } from "@/lib/notebook";
import { guide, sources } from "@/lib/content";

type Props = { recipe:Recipe; onChange:(recipe:Recipe)=>void; unit:"F"|"C"; yeastConfirmed:boolean; onYeastConfirmed:(value:boolean)=>void; focusedStage?:RecipeStep["stage"] };
export function RecipeFields({recipe,onChange,unit,yeastConfirmed,onYeastConfirmed,focusedStage}:Props) {
  const displayTemp=(n:number|null)=>n===null?"":Number((unit==="F"?cToF(n):n).toFixed(2));
  const temperature=(v:string)=>v===""?null:unit==="F"?fToC(Number(v)):Number(v);
  const number=(v:string)=>v===""?null:Number(v);
  const patch=(values:Partial<Recipe>)=>onChange({...recipe,...values});
  const stepPatch=(stage:RecipeStep["stage"],values:Partial<RecipeStep>)=>{
    const steps=emptyRecipe().steps.map(s=>recipe.steps.find(x=>x.stage===s.stage)||s);
    patch({steps:steps.map(s=>s.stage===stage?{...s,confirmed:false,...values}:s)});
  };
  const yeastPatch=(values:Partial<Recipe>)=>{patch(values);onYeastConfirmed(false);};
  return <section className="recipe-setup">
    <h3>Your kit instructions</h3>
    <p className="small muted">Copy the delivered insert once. Confirm each step when it matches your packet; the guide will use these details. You can save an unfinished setup.</p>
    <label>Instruction source / packet version<input value={recipe.source} maxLength={500} onChange={e=>patch({source:e.target.value})} placeholder="e.g. the insert delivered with this kit"/></label>
    <details className="setup-section"><summary>Yeast and expected gravity</summary>
      <div className="form-grid">
        <label>Yeast on your packet<input value={recipe.yeastName} maxLength={100} onChange={e=>yeastPatch({yeastName:e.target.value})}/></label>
        <div className="source-help"><button type="button" className="text-button" onClick={()=>yeastPatch({yeastName:"Lallemand Verdant IPA",minC:18,maxC:25})}>Use published Verdant range</button><a href={sources.yeast} target="_blank" rel="noreferrer">Read yeast guidance ↗</a></div>
        <label>Fermentation minimum (°{unit})<input type="number" step="any" value={displayTemp(recipe.minC)} onChange={e=>yeastPatch({minC:temperature(e.target.value)})}/></label>
        <label>Fermentation maximum (°{unit})<input type="number" step="any" value={displayTemp(recipe.maxC)} onChange={e=>yeastPatch({maxC:temperature(e.target.value)})}/></label>
        <label>Expected original gravity<input type="number" min="1" max="1.25" step="0.001" value={recipe.expectedOG??""} onChange={e=>patch({expectedOG:number(e.target.value)})} placeholder="Leave blank if unknown"/></label>
        <label>Expected final gravity<input type="number" min="0.8" max="1.25" step="0.001" value={recipe.expectedFG??""} onChange={e=>patch({expectedFG:number(e.target.value)})} placeholder="Leave blank if unknown"/></label>
      </div>
      <label className="inline-check"><input type="checkbox" checked={yeastConfirmed} disabled={!recipe.yeastName.trim()||recipe.minC===null||recipe.maxC===null} onChange={e=>onYeastConfirmed(e.target.checked)}/>This yeast and temperature range match my delivered packet.</label>
    </details>
    {guide.map((g,i)=>{const step=recipe.steps.find(s=>s.stage===g.id)||emptyRecipe().steps[i];return <details key={g.id} className="setup-section" open={g.id===focusedStage||undefined}><summary><span>{i+1}. {g.short}</span><span className={step.confirmed?"setup-confirmed":"setup-pending"}>{step.confirmed?"Confirmed":"To confirm"}</span></summary>
      <label>What to do<textarea data-autofocus={g.id===focusedStage?true:undefined} rows={3} maxLength={1200} value={step.instruction} onChange={e=>stepPatch(g.id,{instruction:e.target.value})} placeholder="Copy the relevant packet instructions, including the order of additions."/></label>
      <label>Ingredients, water volume and amounts<input maxLength={300} value={step.quantity} onChange={e=>stepPatch(g.id,{quantity:e.target.value})} placeholder="Copy quantities with their units; leave blank if not applicable"/></label>
      <div className="form-grid">
        <label>Target temperature (°{unit}, optional)<input type="number" step="any" value={displayTemp(step.tempC)} onChange={e=>stepPatch(g.id,{tempC:temperature(e.target.value)})}/></label>
        <label>Timer duration (minutes, optional)<input type="number" min="0.1" max="180" step="any" value={step.minutes??""} onChange={e=>stepPatch(g.id,{minutes:number(e.target.value)})}/></label>
      </div>
      <p className="small muted">For several hop additions, write each amount and time in the instruction. This timer covers one interval; confirm which one before starting it.</p>
      <label className="inline-check"><input type="checkbox" checked={step.confirmed} disabled={!step.instruction.trim()} onChange={e=>stepPatch(g.id,{confirmed:e.target.checked})}/>I checked this step against the supplied instructions.</label>
    </details>;})}
  </section>;
}

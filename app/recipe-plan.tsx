"use client";
import type { Recipe, RecipeStep, Batch, BrewingMethod } from "@/lib/notebook";
import { cToF, fToC, galToL, lToGal, emptyRecipe } from "@/lib/notebook";
import { guideForMethod, recipeMethod, sources } from "@/lib/content";
import { changeRecipeMethod } from "@/lib/beer-recipes";

type Props = { editing:boolean; recipe:Recipe; recipeId:Batch["recipeId"]; onChange:(recipe:Recipe)=>void; unit:"F"|"C"; volumeUnit:"gal"|"L"; yeastConfirmed:boolean; onYeastConfirmed:(value:boolean)=>void; focusedStage?:RecipeStep["stage"] };
export function RecipeFields({editing,recipe,recipeId,onChange,unit,volumeUnit,yeastConfirmed,onYeastConfirmed,focusedStage}:Props) {
  const displayTemp=(n:number|null)=>n===null?"":Number((unit==="F"?cToF(n):n).toFixed(2));
  const temperature=(v:string)=>v===""?null:unit==="F"?fToC(Number(v)):Number(v);
  const number=(v:string)=>v===""?null:Number(v);
  const patch=(values:Partial<Recipe>)=>onChange({...recipe,...values});
  const method=recipeMethod(recipe,recipeId), guide=guideForMethod(method);
  const stepPatch=(stage:RecipeStep["stage"],values:Partial<RecipeStep>)=>{
    const steps=emptyRecipe().steps.map(s=>recipe.steps.find(x=>x.stage===s.stage)||s);
    patch({steps:steps.map(s=>s.stage===stage?{...s,confirmed:false,...values}:s)});
  };
  const yeastPatch=(values:Partial<Recipe>)=>{patch(values);onYeastConfirmed(false);};
  return <section className="recipe-setup">
    <h3>Your recipe</h3>
    <p className="small muted">Add the ingredients and instructions you will actually use. You can save an unfinished recipe and come back to it.</p>
    <div className="form-grid">
      <label>Brewing method<select required value={method||""} onChange={e=>onChange(changeRecipeMethod(recipe,e.target.value as BrewingMethod))}><option value="" disabled>Choose a method</option><option value="extract">Extract</option><option value="extract-grains">Extract with grains</option><option value="all-grain">All-grain</option></select></label>
      <label>Batch volume ({volumeUnit==="gal"?"US gal":"L"}, optional)<input type="number" min="0.01" step="any" value={recipe.batchVolumeL==null?"":Number((volumeUnit==="gal"?lToGal(recipe.batchVolumeL):recipe.batchVolumeL).toFixed(4))} onChange={e=>patch({batchVolumeL:e.target.value===""?null:volumeUnit==="gal"?galToL(Number(e.target.value)):Number(e.target.value)})}/></label>
    </div>
    {editing&&<p className="small muted">Changing the method clears this batch’s checkmarks and instruction confirmations. Notes and readings stay.</p>}
    <label>Recipe source (optional)<input value={recipe.source} maxLength={500} onChange={e=>patch({source:e.target.value})} placeholder="A recipe link, book, kit insert or your own notes"/></label>
    <details className="setup-section"><summary>Yeast and expected gravity</summary>
      <div className="form-grid">
        <label className="yeast-name">Yeast<input value={recipe.yeastName} maxLength={100} onChange={e=>yeastPatch({yeastName:e.target.value})}/></label>
        {(recipeId==="kit"||recipeId==="jabba")&&<div className="source-help"><button type="button" className="text-button" onClick={()=>yeastPatch({yeastName:"Lallemand Verdant IPA",minC:18,maxC:25})}>Use published Verdant range</button><a href={sources.yeast} target="_blank" rel="noreferrer">Verdant yeast reference ↗</a></div>}
        <label>Fermentation minimum (°{unit})<input type="number" step="any" value={displayTemp(recipe.minC)} onChange={e=>yeastPatch({minC:temperature(e.target.value)})}/></label>
        <label>Fermentation maximum (°{unit})<input type="number" step="any" value={displayTemp(recipe.maxC)} onChange={e=>yeastPatch({maxC:temperature(e.target.value)})}/></label>
        <label>Expected original gravity<input type="number" min="1" max="1.25" step="0.001" value={recipe.expectedOG??""} onChange={e=>patch({expectedOG:number(e.target.value)})} placeholder="Leave blank if unknown"/></label>
        <label>Expected final gravity<input type="number" min="0.8" max="1.25" step="0.001" value={recipe.expectedFG??""} onChange={e=>patch({expectedFG:number(e.target.value)})} placeholder="Leave blank if unknown"/></label>
      </div>
      <label className="inline-check"><input type="checkbox" checked={yeastConfirmed} disabled={!recipe.yeastName.trim()||recipe.minC===null||recipe.maxC===null} onChange={e=>onYeastConfirmed(e.target.checked)}/><span>I checked the yeast and temperature range for this recipe.</span></label>
    </details>
    {guide.map((g,i)=>{const step=recipe.steps.find(s=>s.stage===g.id)||emptyRecipe().steps[i];return <details key={g.id} className="setup-section" open={g.id===focusedStage||undefined}><summary><span>{i+1}. {g.short}</span><span className={step.confirmed?"setup-confirmed":"setup-pending"}>{step.confirmed?"Confirmed":"To confirm"}</span></summary>
      <label>What to do<textarea data-autofocus={g.id===focusedStage?true:undefined} rows={3} maxLength={1200} value={step.instruction} onChange={e=>stepPatch(g.id,{instruction:e.target.value})} placeholder="Your instructions for this step, including the order of additions"/></label>
      <label>Ingredients, water volume and amounts<input maxLength={300} value={step.quantity} onChange={e=>stepPatch(g.id,{quantity:e.target.value})} placeholder="Include units; leave blank if not applicable"/></label>
      <div className="form-grid">
        <label>Target temperature (°{unit}, optional)<input type="number" step="any" value={displayTemp(step.tempC)} onChange={e=>stepPatch(g.id,{tempC:temperature(e.target.value)})}/></label>
        <label>Timer duration (minutes, optional)<input type="number" min="0.1" max="180" step="any" value={step.minutes??""} onChange={e=>stepPatch(g.id,{minutes:number(e.target.value)})}/></label>
      </div>
      {g.id==="boil"&&<p className="small muted">For several additions, write each amount and time above. The timer covers one interval at a time.</p>}
      <label className="inline-check"><input type="checkbox" checked={step.confirmed} disabled={!step.instruction.trim()} onChange={e=>stepPatch(g.id,{confirmed:e.target.checked})}/><span>I checked this step against my recipe.</span></label>
    </details>;})}
  </section>;
}

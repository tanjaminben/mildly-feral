import { z } from "zod";
export const stages = ["prepare", "steep", "boil", "chill", "ferment", "bottle", "taste"] as const;
export const entryTypes = ["note", "reading", "dry-hop", "bottling", "tasting", "label"] as const;
const id = z.string().uuid();
const text = (length: number) => z.string().max(length);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(v + "T12:00:00Z"); return Number.isFinite(+d) && d.toISOString().slice(0,10) === v; }, "Choose a valid calendar date.");
const instant = z.string().datetime({ offset: true });
const erased = instant.nullable().optional();
export const recipeStepSchema = z.object({
  stage: z.enum(stages), instruction: text(1200), quantity: text(300),
  tempC: z.number().min(-10).max(110).nullable(), minutes: z.number().min(.1).max(180).nullable(), confirmed: z.boolean(),
}).refine(v => !v.confirmed || !!v.instruction.trim(), "Add the packet instruction before confirming this step.");
export const recipeSchema = z.object({
  source: text(500), yeastName: text(100), minC: z.number().min(-10).max(60).nullable(), maxC: z.number().min(-10).max(60).nullable(),
  expectedOG: z.number().min(1).max(1.25).nullable(), expectedFG: z.number().min(.8).max(1.25).nullable(),
  steps: z.array(recipeStepSchema).max(7),
}).refine(v => v.minC === null || v.maxC === null || v.minC < v.maxC, "The fermentation minimum must be below the maximum.")
  .refine(v => new Set(v.steps.map(s => s.stage)).size === v.steps.length, "Each recipe stage can appear only once.");
export const emptyRecipe = () => ({source:"",yeastName:"",minC:null,maxC:null,expectedOG:null,expectedFG:null,steps:stages.map(stage=>({stage,instruction:"",quantity:"",tempC:null,minutes:null,confirmed:false}))});
// A journal selection is a dated snapshot. Later journal edits never silently alter ABV.
export const gravitySourceSchema = z.object({
  entryId: id, measuredAt: instant, phase: z.enum(stages).nullable(),
});
export type GravitySource = z.infer<typeof gravitySourceSchema>;
const recoveredGravityDraftSchema = z.object({
  og: text(50), fg: text(50),
  ogSource: gravitySourceSchema.optional().catch(undefined),
  fgSource: gravitySourceSchema.optional().catch(undefined),
});
// Keep recoverable typed values if optional metadata was corrupted in session storage.
export function recoverGravityDraft(value:unknown):z.infer<typeof recoveredGravityDraftSchema>|null {
  const parsed=recoveredGravityDraftSchema.safeParse(value);
  if(!parsed.success)return null;
  const draft=parsed.data;
  for(const field of ["og","fg"] as const){
    const number=Number(draft[field]);
    if(!draft[`${field}Source`]||!draft[field].trim()||!Number.isFinite(number)||number<(field==="og"?1:.98)||number>1.25)delete draft[`${field}Source`];
  }
  return draft;
}
export const hydrometerSchema = z.object({
  og: z.number().min(1, "Enter OG from 1.000 to 1.250 SG.").max(1.25, "Enter OG from 1.000 to 1.250 SG.").nullable(),
  fg: z.number().min(.98, "Enter FG from 0.980 to 1.250 SG.").max(1.25, "Enter FG from 0.980 to 1.250 SG.").nullable(),
  ogSource: gravitySourceSchema.optional(), fgSource: gravitySourceSchema.optional(),
}).superRefine((v,ctx)=>{
  if(v.og!==null&&v.fg!==null&&v.fg>v.og)ctx.addIssue({code:"custom",message:"Final gravity must not exceed original gravity. Check the readings.",path:["fg"]});
  for(const field of ["og","fg"] as const)if(v[field]===null&&v[`${field}Source`])ctx.addIssue({code:"custom",message:"A journal source needs a gravity value.",path:[field]});
});
export const emptyHydrometer = () => ({og:null, fg:null});
export type Hydrometer = z.infer<typeof hydrometerSchema>;
// Standard beer estimate: https://www.brewersfriend.com/abv-calculator/
// Use measured, temperature-corrected hydrometer specific gravities.
export function estimateAbv(og:number|null,fg:number|null):number|null {
  const parsed=hydrometerSchema.safeParse({og,fg});
  if(!parsed.success||parsed.data.og===null||parsed.data.fg===null)return null;
  return (parsed.data.og-parsed.data.fg)*131.25;
}
export const batchSchema = z.object({
  id, name: z.string().trim().min(1).max(100), recipeId: z.enum(["kit", "kama", "sumpin", "jabba"]),
  startedOn: day, stage: z.enum(stages), checks: z.record(z.string().max(80), z.boolean()).refine(v => Object.keys(v).length <= 100),
  packetNotes: text(6000), yeastConfirmed: z.boolean(), createdAt: instant, deletedAt: erased,
  recipe: recipeSchema.default(emptyRecipe),
  hydrometer: hydrometerSchema.default(emptyHydrometer),
});
export const entrySchema = z.object({
  id, batchId: id, type: z.enum(entryTypes), at: instant, timezone: text(100), title: text(150), note: text(12000),
  tempC: z.number().min(-10).max(110).nullable(), tempKind: z.enum(["beer", "room"]),
  gravity: z.number().min(.8).max(1.25).nullable(), volumeL: z.number().min(.01).max(1000).nullable(),
  photos: z.array(z.object({id, caption: text(300)})).max(4),
  bottling: z.object({ sugarType: text(100), sugarGrams: z.number().min(0).max(3000).nullable(), peakTempC: z.number().min(-10).max(60).nullable(), co2: z.number().min(1).max(4).nullable(), bottles: z.number().int().min(0).max(10000).nullable(), source: text(500) }).nullable(),
  deletedAt: erased,
  status: z.enum(["planned","completed","unconfirmed"]).default("unconfirmed"),
  phase: z.enum(stages).nullable().default(null),
});
export const notebookSchema = z.object({schemaVersion:z.literal(1), batches:z.array(batchSchema).max(40), entries:z.array(entrySchema).max(500)}).superRefine((v,ctx) => {
  const batches = new Set(v.batches.map(b=>b.id));
  if(batches.size !== v.batches.length || new Set(v.entries.map(e=>e.id)).size !== v.entries.length) ctx.addIssue({code:"custom",message:"Duplicate record IDs."});
  if(v.entries.some(e=>!batches.has(e.batchId))) ctx.addIssue({code:"custom",message:"An entry refers to a missing batch."});
  if(v.entries.some(e=>e.status==="completed" && +new Date(e.at)>Date.now())) ctx.addIssue({code:"custom",message:"A future entry must stay planned. Set its actual date before marking it completed."});
});
export type Batch = z.infer<typeof batchSchema>;
export type Entry = z.infer<typeof entrySchema>;
export type Notebook = z.infer<typeof notebookSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
export type RecipeStep = z.infer<typeof recipeStepSchema>;
export const emptyNotebook = ():Notebook => ({schemaVersion:1,batches:[],entries:[]});
export const referencedPhotoIds = (book:Notebook) => [...new Set(book.entries.flatMap(e=>e.photos.map(p=>p.id)))];
export const cToF = (v:number) => v*9/5+32;
export const fToC = (v:number) => (v-32)*5/9;
export const galToL = (v:number) => v*3.785411784;
export const lToGal = (v:number) => v/3.785411784;
export function localDateTime(iso:string) { const d=new Date(iso); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16); }
export const localToday = () => localDateTime(new Date().toISOString()).slice(0,10);

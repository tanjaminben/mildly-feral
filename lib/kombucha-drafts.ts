import {z} from "zod";
import {kombuchaBatchSchema,kombuchaEntrySchema,kombuchaRecipeSchema,flavorGroupSchema} from "./notebook.ts";

// Draft recovery validates structure, not completion. Keep an unfinished or invalid
// value available for correction; the saved-record schemas still enforce all rules.
const numeric=z.number(),optionalNumber=numeric.nullable();
const recipeDraftSchema=z.object({...kombuchaRecipeSchema.shape,
  steepMin:numeric,steepMax:numeric,minC:numeric,maxC:numeric,idealC:numeric,
  startPhMax:numeric,finishPhMin:numeric,finishPhMax:numeric,referenceDaysMin:numeric,referenceDaysMax:numeric,
});
export const kombuchaBatchDraftSchema=z.object({...kombuchaBatchSchema.shape,name:z.string().max(100),startedOn:z.string().max(10),recipe:recipeDraftSchema});
export const kombuchaEntryDraftSchema=z.object({...kombuchaEntrySchema.omit({at:true}).shape,atLocal:z.string(),ph:optionalNumber,tempC:optionalNumber,volumeL:optionalNumber});
export const kombuchaGroupDraftSchema=z.object({batchId:z.string().uuid(),value:z.object({...flavorGroupSchema.shape,name:z.string().max(100),bottles:optionalNumber,volumeL:optionalNumber,bottledOn:z.string().max(10).nullable(),chilledOn:z.string().max(10).nullable()})});

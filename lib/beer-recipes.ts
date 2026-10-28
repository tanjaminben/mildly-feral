import { z } from 'zod';
import { emptyRecipe, galToL, stages, brewingMethods, type BrewingMethod, type Recipe, type Batch } from './notebook.ts';
import { recipeShelf } from './content.ts';

export function recipeStartingPoint(recipeId:Batch['recipeId']):Recipe {
  if (recipeId === 'custom') return emptyRecipe();
  const preset = recipeShelf.find(recipe => recipe.id === recipeId)!;
  const method:BrewingMethod = recipeId === 'kit' ? 'extract-grains' : recipeId === 'kama' ? 'extract' : 'all-grain';
  return {...emptyRecipe(), method, batchVolumeL:galToL(recipeId === 'kit' ? 1 : recipeId === 'sumpin' ? 5.5 : 5), source:preset.source};
}

export function changeRecipeMethod(recipe:Recipe, method:BrewingMethod):Recipe {
  return {...recipe, method, steps:recipe.steps.map(step=>({...step, confirmed:false}))};
}

// References seed metadata, never erase the brewer's written recipe.
export function applyRecipePreset(recipe:Recipe, recipeId:Batch['recipeId']):Recipe {
  if (recipeId === 'custom') return recipe;
  const preset = recipeStartingPoint(recipeId);
  return {...recipe, method:preset.method, batchVolumeL:preset.batchVolumeL, source:preset.source,
    steps:recipe.steps.map(step=>({...step, confirmed:false}))};
}

export function repeatRecipe(recipe:Recipe):Recipe {
  return {...structuredClone(recipe), steps:recipe.steps.map(step=>({...step, confirmed:false}))};
}

const draftRecipe = z.object({
  method:z.enum(brewingMethods).optional(), batchVolumeL:z.number().nullable().optional(),
  source:z.string().max(500), yeastName:z.string().max(100), minC:z.number().nullable(), maxC:z.number().nullable(),
  expectedOG:z.number().nullable(), expectedFG:z.number().nullable(),
  steps:z.array(z.object({stage:z.enum(stages),instruction:z.string().max(1200),quantity:z.string().max(300),
    tempC:z.number().nullable(),minutes:z.number().nullable(),confirmed:z.boolean()})).max(7),
});
const draftSchema = z.object({
  recipeId:z.enum(['custom','kit','kama','sumpin','jabba']).optional(),editingId:z.string().uuid().nullable(),
  name:z.string().max(100),startedOn:z.string().max(20),packetNotes:z.string().max(6000),yeastConfirmed:z.boolean(),
  recipe:draftRecipe.default(emptyRecipe),
});

// Keep correctable numeric drafts, while rejecting shapes that cannot render safely.
export function recoverBatchDraft(value:unknown) {
  const parsed=draftSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

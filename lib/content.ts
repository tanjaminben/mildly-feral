import type { Batch, BrewingMethod, Recipe } from "./notebook.ts";

export const sources = {
  tutorials:"https://www.homebrewersassociation.org/category/tutorials/",
  extract:"https://www.homebrewersassociation.org/wp-content/uploads/How-To-Extract.pdf",
  grains:"https://www.homebrewersassociation.org/wp-content/uploads/How-To-Specialty-Grains.pdf",
  allGrain:"https://www.homebrewersassociation.org/tutorials/all-grain-batch-sparge-homebrewing/all-grain-batch-sparge-homebrewing/",
  kit:"https://craftabrew.com/products/hazy-session-ipa-beer-making-kit",
  guide:"https://craftabrew.com/pages/how-to-make-beer",
  hazy:"https://craftabrew.com/pages/how-to-brew-hazy-ipa",
  yeast:"https://www.lallemandbrewing.com/en/united-states/products/lalbrew-verdant-ipa/",
  creep:"https://www.brewersassociation.org/educational-publications/hop-creep-technical-brief/",
  condition:"https://admin.lallemandbrewing.com/wp-content/uploads/2023/07/LAL-bestpractices-Bottle-conditioning-Digital.pdf",
  prime:"https://craftabrew.com/pages/priming-sugar-calculator",
  calculator:"https://www.brewersfriend.com/beer-priming-calculator/",
};
export const recipeShelf = [
  {id:"kit",name:"Hazy Session IPA",tag:"OPTIONAL PRESET",color:"ochre",style:"Extract + steeped grains",volume:"1 US gal · nominal",abv:"4.5–4.7% · published",desc:"Soft, hazy and fruit-forward. An optional one-gallon extract kit. Check the instructions and ingredients supplied with your kit.",hops:"El Dorado · Azacca · Cashmere",yeast:"Published yeast: Lallemand Verdant",source:sources.kit},
  {id:"kama",name:"Kama Citra",tag:"REFERENCE · CITRUS SESSION IPA",color:"sage",style:"Extract recipe",volume:"5 US gal · source recipe",abv:"OG 1.050 · published",desc:"A simpler citrus-forward reference from Northern Brewer. Use the published recipe as a starting point for your own batch.",hops:"Centennial · Cascade · Citra",yeast:"US-05 among published options",source:"https://www.northernbrewer.com/products/kama-citra-session-ipa-recipe-kit"},
  {id:"sumpin",name:"A Little Sumpin’ Sumpin’",tag:"REFERENCE · PUBLISHER’S CLONE",color:"rose",style:"Wheat IPA · all-grain",volume:"5.5 US gal · source recipe",abv:"7.5% · source target",desc:"A smooth, hoppy wheat-beer benchmark for your flavor notebook. AHA’s clone, with a more involved hop bill.",hops:"Eight hop varieties",yeast:"WLP007 · source recipe",source:"https://homebrewersassociation.org/homebrew-recipe/lagunitas-little-sumpin-sumpin-clone/"},
  {id:"jabba",name:"Jabba Juice",tag:"REFERENCE · TROPICAL HAZY IPA",color:"peach",style:"All-grain recipe",volume:"5 US gal · source recipe",abv:"6.6% · source target",desc:"A Lallemand/AHA hazy reference for when you’re ready to explore a larger recipe and a different grain process.",hops:"See the full published hop schedule",yeast:"Verdant IPA · source recipe",source:"https://homebrewersassociation.org/homebrew-recipe/jabba-juice-hazy-ipa/"},
] as const;
export type BrewGuideStep = {
  id: Batch["stage"]; short: string; title: string; eyebrow: string;
  description: string; tip: string; checks: readonly string[]; source: string;
};
export const methodLabels: Record<BrewingMethod,string> = {
  "extract":"Extract", "extract-grains":"Extract with grains", "all-grain":"All-grain",
};
export function recipeMethod(recipe:Recipe, recipeId:string):BrewingMethod|undefined {
  return recipe.method ?? (recipeId==="custom" ? undefined : recipeId==="kama" ? "extract" : recipeId==="sumpin"||recipeId==="jabba" ? "all-grain" : "extract-grains");
}
export const guide:BrewGuideStep[] = [
  {id:"prepare",short:"Prepare",title:"Prepare your equipment and ingredients",eyebrow:"01 / BEFORE THE HEAT",
    description:"Read your recipe from start to finish. Gather the ingredients, check the quantities and make a clean place to work.",
    tip:"Check that your pot has room for the planned boil and that your fermenter suits the batch volume. Use a thermometer that measures the liquid; an infrared thermometer reads the surface.",
    checks:["Check your recipe, ingredients and yeast.","Record ingredient amounts and the hop schedule in Batch details.","Check pot capacity, condition and boil headroom.","Clean equipment; mix sanitizer according to its label.","Choose a fermentation location and plan to measure beer temperature.","Have suitable bottles or packaging gear and gravity measurement ready."],source:sources.tutorials},
  {id:"steep",short:"Make wort",title:"Prepare the wort for your brewing method",eyebrow:"02 / YOUR BREWING METHOD",
    description:"Extract, steeped-grain and all-grain recipes prepare wort differently. Choose your method in Batch details to see the matching guide.",
    tip:"Record your own water volumes, ingredient amounts, temperatures and timing. A preset is a reference; it does not replace the recipe you are actually brewing.",
    checks:["Choose the brewing method for this batch.","Check the recipe's water and fermentable ingredients.","Record the preparation temperature and timing.","Prepare the recipe's wort volume for the boil."],source:sources.tutorials},
  {id:"boil",short:"Boil & hops",title:"Follow your boil and hop schedule",eyebrow:"03 / THE HOT SIDE",
    description:"Follow your recipe's boil length and additions. Watch the pot closely as the wort first boils.",
    tip:"Record each hop amount and addition time, including any hop stand or whirlpool. Check which interval you are timing before starting a timer.",
    checks:["Check the recipe's boil and hop schedule.","Control the heat to prevent a boil-over.","Add each ingredient at its specified amount and time.","Record the actual timing and any changes."],source:sources.tutorials},
  {id:"chill",short:"Chill & pitch",title:"Cool the wort and add yeast",eyebrow:"04 / THE COLD SIDE",
    description:"Sanitize everything that will touch cooled wort. Cool to the yeast's pitching range, transfer, measure and add the yeast.",
    tip:"Allow for fermenter headspace and a clear gas escape path. Avoid thermal shock with glass equipment. Do not return a gravity sample to the batch.",
    checks:["Sanitize cooled-wort contact surfaces and transfer equipment.","Measure wort temperature against the yeast's pitching guidance.","Transfer the planned volume with suitable headspace.","Record original gravity and any instrument correction.","Add the yeast and fit the fermenter's vented arrangement."],source:sources.tutorials},
  {id:"ferment",short:"Ferment",title:"Monitor fermentation",eyebrow:"05 / YEAST AT WORK",
    description:"Follow your yeast's temperature guidance. Log measured temperature, gravity and any dry-hop additions.",
    tip:"Yeast strains have different working ranges. Measure beer temperature or a calibrated proxy separately from room air; fermentation generates heat.",
    checks:["Check the actual yeast and its working temperature range.","Log beer temperature; label room readings separately.","Keep the gas escape path clear and minimize opening or splashing.","Follow the recipe's dry-hop plan, if used; record the last addition.","Take corrected gravity readings after any final dry hop.","Check that final gravity is stable, including after dry hopping."],source:sources.creep},
  {id:"bottle",short:"Bottle",title:"Check fermentation before bottling",eyebrow:"06 / PACKAGING DAY",
    description:"Use your measurements and recipe expectations to check fermentation before packaging. Airlock silence and a calendar date cannot confirm completion.",
    tip:"Dry-hop enzymes can release more fermentable sugars. After dry hopping, check stable final gravity for more than 48 hours with yeast active; longer may be needed. Chilling does not make unfinished beer safe to bottle. An expected final gravity is context, not proof of completion.",
    checks:["Review corrected gravity stability, including after any final dry hop.","Check attenuation against the recipe and yeast expectations.","Inspect pressure-rated beer bottles; reject chips or damage.","Sanitize bottles, transfer gear and compatible closures.","Measure the actual beer volume being packaged.","Calculate priming from volume, sugar type, temperature history and target carbonation; weigh the dose.","Fill gently, follow the bottle/headspace guidance and close securely."],source:sources.creep},
  {id:"taste",short:"Condition & taste",title:"Condition, chill and taste",eyebrow:"07 / THE FIRST POUR",
    description:"Condition primed bottles according to your recipe and yeast guidance. Protect them from heat and light, then chill a test bottle and taste.",
    tip:"Conditioning time varies. Record aroma, flavor, mouthfeel and what you would change in the next batch.",
    checks:["Record the packaging date, priming dose and bottle count.","Condition within the recipe and yeast guidance.","Chill a test bottle before evaluating carbonation.","Log aroma, flavor, mouthfeel and a photo of the pour.","Save one small improvement for the next batch."],source:sources.condition},
];
export function guideForMethod(method?:BrewingMethod):BrewGuideStep[] {
  if (!method) return guide;
  const stages:Record<BrewingMethod,Partial<BrewGuideStep>> = {
    extract:{short:"Mix extract",title:"Dissolve the malt extract",eyebrow:"02 / EXTRACT",description:"Measure your recipe's water and malt extract. Dissolve the extract in the order your recipe specifies.",tip:"Remove the pot from direct heat while stirring in extract to reduce scorching. Use your recipe's water volume and timing; there is no grain-steeping step in an all-extract recipe.",checks:["Measure the recipe's water volume.","Check the type and amount of malt extract.","Stir in extract according to the recipe without scorching it.","Check the volume before beginning the boil."],source:sources.extract},
    "extract-grains":{short:"Steep & mix",title:"Steep the grains and dissolve the extract",eyebrow:"02 / GRAINS & EXTRACT",description:"Steep your recipe's specialty grains, remove them as directed, then dissolve the malt extract.",tip:"Steeping specialty grains is different from mashing base malt. Use the temperature, time and water volume in your recipe; remove direct heat while stirring in extract.",checks:["Measure the recipe's steeping water.","Steep the grains at the recipe's temperature and duration.","Remove the grains as directed.","Stir in the specified malt extract without scorching it."],source:sources.grains},
    "all-grain":{short:"Mash",title:"Mash the grain and collect the wort",eyebrow:"02 / THE MASH",description:"Combine grain and water according to your recipe's mash plan. Hold the specified rests, then separate the wort from the grain.",tip:"Use the mash schedule and collection method for your recipe and equipment, including brew-in-a-bag or sparging where applicable. Record actual temperatures, timing and collected volume.",checks:["Check grain weights and the recipe's mash water volumes.","Follow and record the mash temperature and rest times.","Separate wort from grain; rinse or sparge only as your method requires.","Collect and measure the recipe's pre-boil wort volume."],source:sources.allGrain},
  };
  return guide.map(step=>step.id==="steep" ? {...step,...stages[method]} : step);
}

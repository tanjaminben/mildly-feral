import type { KombuchaBatch } from "./notebook";

// Checklist positions are saved with each batch. Keep their order and meaning stable.
export const kombuchaGuide = [
  {id:"tea",short:"Brew tea",title:"Steep the tea and dissolve the sugar",text:"Make the sweet tea, then remove the leaves before cooling it.",checks:["Measure the tea, hot water and sugar.","Steep the tea and dissolve the sugar.","Note any ingredient changes."]},
  {id:"culture",short:"Cool & culture",title:"Cool the tea, then add the culture",text:"Cool the tea, add the SCOBY and starter, and check the starting pH.",checks:["Measure the cooled tea temperature.","Add the culture and starter; note its source and amount.","Measure and save the starting pH.","Cover with cloth and save the fermentation start date."]},
  {id:"first-ferment",short:"First ferment",title:"Check pH and taste as it ferments",text:"Keep the jar covered with cloth. Start tasting after a week and follow how the flavor changes.",checks:["Check the cloth cover and fermentation conditions.","Log pH and temperature.","Taste the brew and choose when to check again.","Note when you finish the first fermentation."]},
  {id:"flavor",short:"Flavor & bottle",title:"Reserve starter, then flavor and bottle",text:"Save starter for the next batch before adding fruit or juice to this one.",checks:["Reserve starter for the next batch and note the amount.","Inspect and clean pressure-rated bottles.","Save ingredients, quantities and bottling dates for each flavor."]},
  {id:"second-ferment",short:"Second ferment",title:"Check the bottles during second fermentation",text:"Sealed bottles build carbonation quickly. Check them daily and refrigerate when you like the fizz.",checks:["Check each flavor against its recipe and bottle instructions.","Note your checks and when you decide to refrigerate.","Mark checks Completed after you do them."]},
  {id:"chill-taste",short:"Chill & taste",title:"Refrigerate and taste",text:"Chill the bottles fully before opening. Keep notes on flavor, tartness and fizz.",checks:["Save each flavor's refrigeration date.","Note flavor, tartness and carbonation.","Choose one change for the next batch."]},
] as const;

export const kombuchaSources = {
  shop:{label:"The Kombucha Shop · bottling and flavoring",url:"https://www.thekombuchashop.com/pages/brew-q-a"},
  cornell:{label:"Cornell Cooperative Extension · starter and brewing",url:"https://s3.amazonaws.com/assets.cce.cornell.edu/attachments/52316/Kombucha_tips__tricks___recipes_BrownatHK_2021.pdf?1627483925="},
  usu:{label:"Utah State Extension · pH and bottle checks",url:"https://extension.usu.edu/preserve-the-harvest/kombucha"},
  csu:{label:"Colorado State Extension · fermentation and storage",url:"https://extension.colostate.edu/resource/understanding-and-making-kombucha/"},
  bccdc:{label:"BC Centre for Disease Control · acidity and refrigeration",url:"https://www.bccdc.ca/resource-gallery/Documents/Educational%20Materials/EH/FPS/Food/Fermented/Fermented%20Foods%20Guideline%20-%203.11%20Kombucha%20and%20Jun.pdf"},
} as const;

type Stage = typeof kombuchaGuide[number]["id"];
type Instruction = {steps:string[];note?:string;sources:(keyof typeof kombuchaSources)[]};

export function kombuchaStarter(recipe:KombuchaBatch["recipe"]) {
  // Supply the missing house quantity without rewriting recipes saved by earlier versions.
  return recipe.starter==="SCOBY culture + starter liquid; record the amount actually used"&&recipe.hotWater==="4 cups filtered water"&&recipe.coldWater==="8 cups cold filtered water"
    ? "SCOBY culture + 2 cups mature, unflavored starter kombucha" : recipe.starter;
}

export function kombuchaInstructions(recipe:KombuchaBatch["recipe"],temperature:(c:number)=>string):Record<Stage,Instruction> {
  const r=recipe;
  const amount=(value:string)=>value.replace(/\b(cups?|tbsp|tsp)\s+(?!of\b)/g,"$1 of ");
  const steep=r.steepMin===r.steepMax?`${r.steepMin}`:`${r.steepMin}–${r.steepMax}`;
  return {
    tea:{steps:[
      "Wash your hands and clean the pot, spoon, strainer and brewing jar. Rinse off soap well.",
      `Bring ${amount(r.hotWater)} to a boil, then remove the pot from the heat.`,
      `Add ${amount(r.tea)} and steep for ${steep} minutes. Remove the tea bag or strain out the leaves.`,
      `Stir in ${amount(r.sugar)} until it dissolves.`,
    ],sources:["csu"]},
    culture:{steps:[
      `Add ${amount(r.coldWater)} to the sweet tea. Measure the temperature: wait until it is ${temperature(r.minC)}–${temperature(r.maxC)}, ideally ${temperature(r.idealC)}.`,
      `Pour the cooled tea into your clean brewing jar. With clean hands, add ${amount(kombuchaStarter(r)).replace(/^SCOBY/,"the SCOBY").replace(/\s*\+\s*/g," and ")}.`,
      `Stir gently and test a small sample with a calibrated pH meter or suitable pH strips. Starting pH should be ${r.startPhMax} or lower. If it is higher, add more mature starter, mix and test again before leaving it to ferment.`,
      "Secure a clean, tightly woven cloth or coffee filter over the jar with a rubber band. Leave room above the tea and keep the cover breathable; do not seal the jar.",
      "Save the start date and your pH and temperature readings. Discard the sample after measuring.",
    ],sources:["cornell","usu"]},
    "first-ferment":{steps:[
      `Keep the cloth-covered jar out of direct sunlight in a steady spot near ${temperature(r.idealC)}. Keep fruit flies out and air flowing through the cover.`,
      "Check for dry, fuzzy mold before sampling. If you see it, discard the liquid and culture without tasting. After about a week, take a small sample with a clean spoon or straw and test pH. Only taste samples between pH 2.5 and 4.2. Do not return samples to the jar.",
      `Taste every day or two. The recipe's first-fermentation reference is ${r.referenceDaysMin}–${r.referenceDaysMax} days. Follow the method below for this batch's timing.`,
      `When you like the tartness and pH is within the recipe's ${r.finishPhMin}–${r.finishPhMax} finish range, save the reading and move on to bottling. You can also refrigerate it plain and skip second fermentation.`,
    ],note:"A wet cream-colored layer and brown yeast strands are common. A sinking SCOBY can also be normal. If the brew falls below pH 2.5, stop fermenting and do not drink it.",sources:["csu","shop","bccdc"]},
    flavor:{steps:[
      "Before adding flavors, move the SCOBY and 2 cups of unflavored kombucha into a clean jar for the next house batch. Cover with cloth and keep at room temperature until you brew again.",
      "Wash fruit, herbs and ginger. Clean your funnel and bottles. Use intact bottles specifically rated for carbonated drinks; check the glass, caps and seals for damage.",
      "For a 16 fl oz (473 mL) bottle, start with 2 tablespoons of fruit or pasteurized juice. For ginger, try ¼–1 teaspoon grated. Measure what you add and keep each flavor's notes together.",
      "Test a sample of each flavor after mixing. Keep pH between 2.5 and 4.2; do not seal bottles for fermentation if the flavored mixture is outside that range.",
      "Pour in kombucha, leaving 1–2 inches below the cap, or the headspace specified by the bottle maker. Seal and label each bottle with its flavor and bottling date.",
      "Save each flavor in Bottles & flavors. For a still drink, refrigerate now; for bubbles, continue to second fermentation.",
    ],sources:["cornell","shop","usu","bccdc"]},
    "second-ferment":{steps:[
      "Keep the sealed bottles upright, away from sunlight and heat. Start checking after one day; room-temperature bottle fermentation often takes 1–3 days.",
      "Check every day. Over a sink, with a towel over the cap and the opening pointed away from your face, release the cap slowly to vent gas. Recap if you are continuing. Chilling first reduces foaming.",
      "Refrigerate a test bottle until fully cold before opening it to judge the fizz. When you like the carbonation, refrigerate the rest of that flavor group. Different flavors can finish at different times.",
      "If a bottle gushes or releases gas forcefully, refrigerate the rest of that group promptly. If you cannot check the bottles, refrigerate them instead of extending the warm fermentation.",
    ],note:"The few-week house method is for the cloth-covered first fermentation. Do not leave sealed bottles for weeks: sugar, heat and time can build enough pressure to break glass. Do not use pH or the number of days to judge bottle pressure.",sources:["usu","csu"]},
    "chill-taste":{steps:[
      `Refrigerate finished bottles at ${temperature(4)} or colder and keep them refrigerated. Cold slows fermentation; it does not remove all pressure.`,
      "Once fully cold, open slowly over a sink with a towel over the cap and the opening pointed away from you. Strain into a glass if you want to remove fruit or yeast sediment.",
      "Check final pH before tasting; serve only between pH 2.5 and 4.2. Save the refrigeration date and note the aroma, tartness, flavor and fizz. Choose one change for the next batch. Take a photo if the pour deserves one.",
    ],sources:["shop","bccdc"]},
  };
}

export function kombuchaDay(batch:Pick<KombuchaBatch,"startedOn">,today:string) {
  // Calendar days, independent of DST and the device's UTC offset.
  return Math.floor((Date.parse(today+"T12:00:00Z")-Date.parse(batch.startedOn+"T12:00:00Z"))/86400000)+1;
}

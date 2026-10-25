import type { Batch, Entry } from "./notebook";

// A measurement's purpose can differ from the batch's current workflow stage.
export function contextualEntryPhase(stage: Entry["phase"], context: "current" | "fermentation-gravity" | "dry-hop" | "bottling" = "current"): Entry["phase"] {
  if (context === "fermentation-gravity" || context === "dry-hop") return "ferment";
  if (context === "bottling") return "bottle";
  return stage;
}

type PrimingInputs = {
  volume: string | number | null;
  sugarType: string;
  sugarGrams: string | number | null;
  peakTemp: string | number | null;
  co2: string | number | null;
};

export function missingPrimingInputs(inputs: PrimingInputs): string[] {
  const missing = (value: string | number | null) => value === null || (typeof value === "string" && !value.trim());
  return [
    missing(inputs.volume) ? "actual packaged volume" : null,
    !inputs.sugarType.trim() ? "sugar type" : null,
    missing(inputs.sugarGrams) ? "weighed sugar" : null,
    missing(inputs.peakTemp) ? "highest fermentation temperature" : null,
    missing(inputs.co2) ? "target carbonation" : null,
  ].filter((label): label is string => label !== null);
}

export function completedObservations(entries: Entry[], now = Date.now()) {
  return entries.filter(e => !e.deletedAt && e.status === "completed" && +new Date(e.at) <= now)
    .sort((a,b) => +new Date(b.at) - +new Date(a.at));
}

export function fermentationReading(batch: Batch | undefined, entries: Entry[]) {
  if (!batch || batch.stage !== "ferment" || !batch.yeastConfirmed || !batch.recipe.yeastName.trim() || batch.recipe.minC === null || batch.recipe.maxC === null) return null;
  const reading = completedObservations(entries).find(e => e.phase === "ferment" && e.tempKind === "beer" && e.tempC !== null);
  if (!reading) return null;
  return { reading, outside: reading.tempC! < batch.recipe.minC || reading.tempC! > batch.recipe.maxC };
}

export function bottlingEvidence(entries: Entry[], now = Date.now()) {
  const observed = completedObservations(entries, now);
  const lastHop = observed.find(e => e.type === "dry-hop");
  const gravityEntries = entries.filter(e => !e.deletedAt && e.gravity !== null)
    .sort((a,b) => +new Date(b.at) - +new Date(a.at));
  const evaluated = gravityEntries.map(entry => {
    const reasons: string[] = [];
    if (entry.status === "planned") reasons.push("Planned, not a completed observation");
    if (entry.status === "unconfirmed") reasons.push("Completion has not been confirmed");
    if (+new Date(entry.at) > now) reasons.push("The recorded date is in the future");
    if (entry.phase !== "ferment") reasons.push(entry.phase ? "Recorded outside the Ferment phase" : "No measurement phase selected");
    if (lastHop && +new Date(entry.at) <= +new Date(lastHop.at)) reasons.push("At or before the latest completed dry-hop addition");
    return {entry, reasons};
  });
  const readings = evaluated.filter(item => item.reasons.length === 0).map(item => item.entry);
  const excludedReadings = evaluated.filter(item => item.reasons.length > 0);
  const spanHours = readings.length > 1 ? (+new Date(readings[0].at) - +new Date(readings[readings.length-1].at)) / 3600000 : 0;
  const spread = readings.length ? Math.max(...readings.map(e=>e.gravity!)) - Math.min(...readings.map(e=>e.gravity!)) : null;
  const windowLabel = lastHop ? "All completed fermentation readings after the latest completed dry-hop addition" : "All completed fermentation readings";
  return { lastHop, readings, spanHours, spread, windowLabel, excludedReadings, excluded: entries.filter(e=>!e.deletedAt && e.status!=="completed").length };
}

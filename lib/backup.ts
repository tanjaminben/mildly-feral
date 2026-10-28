import type { Notebook } from "./notebook.ts";
import { notebookVersion } from "./notebook.ts";
import { remapHydrometerSources } from "./gravity.ts";

export const importLimits = { batches: 40, entries: 500, photos: 60 } as const;
export type BackupCounts = Record<keyof typeof importLimits, number>;
export type ImportCount = {
  key: keyof typeof importLimits;
  label: string;
  current: number | null;
  incoming: number;
  total: number | null;
  limit: number;
  exceeded: boolean;
};

// Trash is part of the saved notebook and its backup, so it counts here too.
export function backupCounts(book: Notebook): BackupCounts {
  return {
    batches: book.batches.length + (book.kombuchaBatches?.length || 0),
    entries: book.entries.length + (book.kombuchaEntries?.length || 0),
    photos: new Set([...book.entries,...(book.kombuchaEntries||[])].flatMap(entry => entry.photos.map(photo => photo.id))).size,
  };
}

/** Photos are independent stored objects. A matching old ID is not proof of equal bytes. */
export function importPreflight(existing: Notebook, incoming: Notebook, storedPhotoCount: number | null) {
  const oldCounts = backupCounts(existing), newCounts = backupCounts(incoming);
  const verifiedPhotoCount = storedPhotoCount !== null && Number.isSafeInteger(storedPhotoCount) && storedPhotoCount >= 0
    ? storedPhotoCount : null;
  const labels = { batches: "Batches", entries: "Entries", photos: "Photos" } as const;
  const rows: ImportCount[] = (Object.keys(importLimits) as (keyof typeof importLimits)[]).map(key => {
    const current = key === "photos" ? verifiedPhotoCount : oldCounts[key];
    const total = current === null ? null : current + newCounts[key];
    return { key, label: labels[key], current, incoming: newCounts[key], total, limit: importLimits[key], exceeded: total !== null && total > importLimits[key] };
  });
  const errors = rows.filter(row => row.exceeded).map(row =>
    `${row.label}: ${row.current} existing + ${row.incoming} incoming = ${row.total}; the limit is ${row.limit}.`
  );
  if (verifiedPhotoCount === null) errors.push("Photo capacity could not be verified. Refresh the storage count before importing.");
  return { allowed: errors.length === 0, rows, errors };
}

// Keep this identity local to the prepared download. The serialized saved state also
// catches refreshes or in-memory changes that have not advanced the server revision.
export function backupIdentity(book: Notebook, revision: number): string {
  return JSON.stringify({ revision, schemaVersion: book.schemaVersion, book });
}

export function backupFilename(generatedAt: string | Date): string {
  const date = new Date(generatedAt);
  if (!Number.isFinite(date.getTime())) throw new Error("The backup date is invalid.");
  return `small-batch-${date.toISOString().replace(/[:.]/g, "-")}.json`;
}

export type BackupSnapshot = {
  identity: string;
  generatedAt: string;
  filename: string;
  counts: BackupCounts;
};

export function backupSnapshot(book: Notebook, revision: number, generatedAt: string | Date = new Date()): BackupSnapshot {
  const timestamp = new Date(generatedAt).toISOString();
  return { identity: backupIdentity(book, revision), generatedAt: timestamp, filename: backupFilename(timestamp), counts: backupCounts(book) };
}

export function isBackupCurrent(snapshot: Pick<BackupSnapshot, "identity"> | null, book: Notebook, revision: number): boolean {
  return snapshot !== null && snapshot.identity === backupIdentity(book, revision);
}

/** Add a backup as independent copies, including flavor-group and gravity provenance. */
export function mergeNotebook(existing:Notebook,incoming:Notebook,photoIds:Map<string,string>,makeId:()=>string=()=>crypto.randomUUID()):Notebook {
  const batchIds=new Map([...incoming.batches,...incoming.kombuchaBatches].map(b=>[b.id,makeId()]));
  const entryIds=new Map([...incoming.entries,...incoming.kombuchaEntries].map(e=>[e.id,makeId()]));
  const flavorIds=new Map(incoming.kombuchaBatches.flatMap(b=>b.flavors).map(f=>[f.id,makeId()]));
  const photos=(list:{id:string,caption:string}[])=>list.map(p=>{const id=photoIds.get(p.id);if(!id)throw new Error("An imported photo is missing.");return {...p,id};});
  return {schemaVersion:notebookVersion,
    batches:[...existing.batches,...incoming.batches.map(b=>({...b,id:batchIds.get(b.id)!,hydrometer:remapHydrometerSources(b.hydrometer,entryIds)}))],
    entries:[...existing.entries,...incoming.entries.map(e=>({...e,id:entryIds.get(e.id)!,batchId:batchIds.get(e.batchId)!,photos:photos(e.photos)}))],
    kombuchaBatches:[...existing.kombuchaBatches,...incoming.kombuchaBatches.map(b=>({...b,id:batchIds.get(b.id)!,flavors:b.flavors.map(f=>({...f,id:flavorIds.get(f.id)!}))}))],
    kombuchaEntries:[...existing.kombuchaEntries,...incoming.kombuchaEntries.map(e=>({...e,id:entryIds.get(e.id)!,batchId:batchIds.get(e.batchId)!,flavorId:e.flavorId?flavorIds.get(e.flavorId)!:null,photos:photos(e.photos)}))],
  };
}

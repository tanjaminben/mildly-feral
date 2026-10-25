import type { Notebook } from "./notebook.ts";

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
    batches: book.batches.length,
    entries: book.entries.length,
    photos: new Set(book.entries.flatMap(entry => entry.photos.map(photo => photo.id))).size,
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

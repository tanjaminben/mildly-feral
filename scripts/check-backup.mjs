import assert from 'node:assert/strict';
import { backupCounts, backupIdentity, backupFilename, backupSnapshot, importPreflight, isBackupCurrent } from '../lib/backup.ts';
import { emptyNotebook, batchSchema, entrySchema } from '../lib/notebook.ts';

let checks = 0;
const check = (name, run) => { run(); checks++; console.log('PASS ' + name); };
const at = '2026-10-01T12:00:00.000Z';
const batch = overrides => batchSchema.parse({ id: crypto.randomUUID(), name: 'Backup regression fixture', recipeId: 'kit', startedOn: '2026-10-01', stage: 'ferment', checks: {}, packetNotes: '', yeastConfirmed: false, createdAt: at, ...overrides });
const entry = (batchId, overrides) => entrySchema.parse({ id: crypto.randomUUID(), batchId, type: 'note', at, timezone: 'UTC', title: '', note: 'Saved note', tempC: null, tempKind: 'beer', gravity: null, volumeL: null, photos: [], bottling: null, status: 'completed', phase: 'ferment', ...overrides });
const book = (batchCount, entryCount, photoCount = 0) => {
  const batches = Array.from({ length: batchCount }, () => batch());
  const entries = Array.from({ length: entryCount }, () => entry(batches[0].id));
  for (let index = 0; index < photoCount; index++) entries[Math.floor(index / 4)].photos.push({ id: crypto.randomUUID(), caption: '' });
  return { schemaVersion: 1, batches, entries };
};

check('all exact import boundaries are allowed with explicit totals', () => {
  const result = importPreflight(book(39, 499), book(1, 1, 1), 59);
  assert.equal(result.allowed, true);
  assert.deepEqual(result.rows.map(({ current, incoming, total, limit }) => ({ current, incoming, total, limit })), [
    { current: 39, incoming: 1, total: 40, limit: 40 },
    { current: 499, incoming: 1, total: 500, limit: 500 },
    { current: 59, incoming: 1, total: 60, limit: 60 },
  ]);
});
check('every exceeded capacity is explained, including entries', () => {
  const result = importPreflight(book(40, 500), book(1, 1, 1), 60);
  assert.equal(result.allowed, false);
  assert.equal(result.errors.length, 3);
  assert.match(result.errors[1], /500 existing \+ 1 incoming = 501; the limit is 500/);
});
check('Trash records and their referenced photos count toward backup and import capacity', () => {
  const existing = book(40, 1, 1), incoming = book(1, 1);
  existing.batches[0].deletedAt = at;
  existing.entries[0].deletedAt = at;
  assert.deepEqual(backupCounts(existing), { batches: 40, entries: 1, photos: 1 });
  assert.equal(importPreflight(existing, incoming, 1).rows[0].total, 41);
  assert.equal(importPreflight(existing, incoming, 1).allowed, false);
});
check('orphan stored photos consume capacity even when no existing entry references them', () => {
  const result = importPreflight(emptyNotebook(), book(1, 1, 2), 59);
  assert.equal(result.allowed, false);
  assert.equal(result.rows[2].total, 61);
});
check('repeated references upload once within a backup', () => {
  const incoming = book(1, 2, 1);
  incoming.entries[1].photos.push({ ...incoming.entries[0].photos[0] });
  assert.equal(backupCounts(incoming).photos, 1);
  assert.equal(importPreflight(emptyNotebook(), incoming, 59).allowed, true);
});
check('incoming photo IDs that overlap existing IDs still require fresh object capacity', () => {
  const existing = book(1, 1, 1), incoming = structuredClone(existing);
  assert.equal(importPreflight(existing, incoming, 60).allowed, false);
  assert.equal(importPreflight(existing, incoming, 60).rows[2].incoming, 1);
});
check('unknown or invalid storage count blocks import instead of treating it as empty', () => {
  for (const count of [null, NaN, Infinity, -1, 1.5]) {
    const result = importPreflight(emptyNotebook(), book(1, 1), count);
    assert.equal(result.allowed, false);
    assert.equal(result.rows[2].current, null);
    assert.equal(result.rows[2].total, null);
    assert.match(result.errors.at(-1), /could not be verified/);
  }
});
check('prepared snapshot records the exact saved counts and UTC time', () => {
  const saved = book(2, 3, 2), result = backupSnapshot(saved, 8, at);
  assert.deepEqual(result.counts, { batches: 2, entries: 3, photos: 2 });
  assert.equal(result.generatedAt, at);
  assert.equal(isBackupCurrent(result, saved, 8), true);
  assert.equal(isBackupCurrent(result, structuredClone(saved), 8), true);
});
check('ninth saved entry makes an eight-entry snapshot stale', () => {
  const saved = book(4, 8), result = backupSnapshot(saved, 8, at);
  const changed = structuredClone(saved);
  changed.entries.push(entry(changed.batches[0].id));
  assert.equal(isBackupCurrent(result, changed, 9), false);
  assert.equal(result.counts.entries, 8);
});
check('stage edits, revision refreshes, and schema version changes invalidate the snapshot', () => {
  const saved = book(1, 1), result = backupSnapshot(saved, 4, at);
  const changed = structuredClone(saved);
  changed.batches[0].stage = 'bottle';
  assert.equal(isBackupCurrent(result, changed, 4), false);
  assert.equal(isBackupCurrent(result, saved, 5), false);
  assert.notEqual(backupIdentity(saved, 4), backupIdentity({ ...saved, schemaVersion: 2 }, 4));
  assert.equal(isBackupCurrent(null, saved, 4), false);
});
check('timestamped filenames are filesystem-safe and distinguish same-day snapshots', () => {
  assert.equal(backupFilename(at), 'small-batch-2026-10-01T12-00-00-000Z.json');
  assert.notEqual(backupFilename(at), backupFilename('2026-10-01T12:00:00.001Z'));
  assert.equal(backupFilename('2026-10-01T05:00:00-07:00'), backupFilename(at));
  assert.throws(() => backupFilename('invalid'), /backup date is invalid/);
});
console.log(`${checks} backup and import checks passed.`);

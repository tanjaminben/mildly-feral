import { emptyNotebook, notebookSchema, referencedPhotoIds, type Notebook } from './notebook.ts';

// This database belongs to this browser profile and origin. No network or identity provider.
export const notebookDatabase = 'mildly-feral-notebook';
type Saved = { book: Notebook; revision: number; updatedAt: string | null };
type Photo = { id: string; blob: Blob; bytes: number; createdAt: string };

function storageError(error: unknown): Error {
  if (error instanceof Error && error.name === 'QuotaExceededError') return new Error('This browser is out of storage. Export a backup, then remove unneeded records or photos. Your changes were not saved.');
  return error instanceof Error ? error : new Error('Browser storage is unavailable. Keep this page open and try again.');
}
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('This browser cannot save notebooks. Allow site storage or use another browser.')); return; }
    const request = indexedDB.open(notebookDatabase, 1);
    let blocked = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('state')) db.createObjectStore('state');
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
    };
    request.onblocked = () => { blocked = true; reject(new Error('Close other Mildly Feral tabs, then try opening your notebook again.')); };
    request.onerror = () => reject(storageError(request.error));
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) { db.close(); return; }
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}
const result = <T>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
async function transact<T>(mode: IDBTransactionMode, run: (tx: IDBTransaction) => Promise<T>): Promise<T> {
  const db = await openDatabase();
  try {
    const tx = db.transaction(['state', 'photos'], mode);
    const completed = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('Your changes were not saved. Keep the draft open and try again.'));
      tx.onerror = () => { /* onabort reports the final transaction failure. */ };
    });
    void completed.catch(() => {});
    try {
      const value = await run(tx);
      await completed;
      return value;
    } catch (error) {
      try { tx.abort(); } catch { /* The failed transaction may already be closed. */ }
      await completed.catch(() => {});
      throw storageError(error);
    }
  } finally { db.close(); }
}
async function saved(tx: IDBTransaction): Promise<Saved> {
  const value = await result(tx.objectStore('state').get('notebook')) as Saved | undefined;
  if (!value) return { book: emptyNotebook(), revision: 0, updatedAt: null };
  return { ...value, book: notebookSchema.parse(value.book) };
}
export async function readNotebook() {
  return transact('readonly', async tx => {
    const [record, photos] = await Promise.all([saved(tx), result(tx.objectStore('photos').getAll()) as Promise<Photo[]>]);
    return { ...record, owner: 'browser', quota: { count: photos.length, bytes: photos.reduce((n, p) => n + p.bytes, 0) } };
  });
}
export async function writeNotebook(book: Notebook, revision: number) {
  const parsed = notebookSchema.parse(book);
  if (!Number.isInteger(revision) || revision < 0) throw new Error('Reload saved records before trying to save again.');
  if (new TextEncoder().encode(JSON.stringify(parsed)).length > 750000) throw new Error('This notebook is too large. Export a backup, then remove old records.');
  return transact('readwrite', async tx => {
    const [current, keys] = await Promise.all([saved(tx), result(tx.objectStore('photos').getAllKeys())]);
    if (current.revision !== revision) throw new Error('Your notebook changed in another tab. Refresh saved records before saving. Your draft is still here.');
    const stored = new Set(keys);
    if (referencedPhotoIds(parsed).some(id => !stored.has(id))) throw new Error('A photo is missing from this browser. Keep the draft open and attach it again.');
    const updatedAt = new Date().toISOString();
    await result(tx.objectStore('state').put({ book: parsed, revision: revision + 1, updatedAt }, 'notebook'));
    return { revision: revision + 1, updatedAt };
  });
}
export async function listPhotos() {
  return transact('readonly', async tx => {
    const [record, photos] = await Promise.all([saved(tx), result(tx.objectStore('photos').getAll()) as Promise<Photo[]>]);
    const used = new Set(referencedPhotoIds(record.book));
    return { count: photos.length, bytes: photos.reduce((n, p) => n + p.bytes, 0), unused: photos.filter(p => !used.has(p.id)).map(p => p.id) };
  });
}
export async function addPhoto(blob: Blob) {
  if (blob.type !== 'image/jpeg' || blob.size > 1048576) throw new Error('Choose a compressed JPEG photo smaller than 1 MB.');
  const header = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  if (header.length < 4 || header[0] !== 255 || header[1] !== 216 || header[2] !== 255) throw new Error('This photo is not a readable JPEG.');
  return transact('readwrite', async tx => {
    const store = tx.objectStore('photos');
    if (await result(store.count()) >= 60) throw new Error('Your 60-photo library is full. Export a backup, then remove unneeded photos.');
    const id = crypto.randomUUID();
    await result(store.add({ id, blob, bytes: blob.size, createdAt: new Date().toISOString() } satisfies Photo));
    return { id, bytes: blob.size };
  });
}
export async function readPhoto(id: string): Promise<Blob> {
  return transact('readonly', async tx => {
    const photo = await result(tx.objectStore('photos').get(id)) as Photo | undefined;
    if (!photo || !(photo.blob instanceof Blob)) throw new Error('This photo is not available in this browser. Import the original backup to recover it.');
    return photo.blob;
  });
}
export async function removePhoto(id: string) {
  return transact('readwrite', async tx => {
    const record = await saved(tx);
    if (referencedPhotoIds(record.book).includes(id)) throw new Error('This photo is still used by a saved record or Trash.');
    await result(tx.objectStore('photos').delete(id));
    return { ok: true };
  });
}

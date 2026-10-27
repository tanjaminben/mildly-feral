"use client";

import { Download, Upload, ArrowUpRight } from "lucide-react";
import type { backupSnapshot } from "@/lib/backup";

type Snapshot = ReturnType<typeof backupSnapshot> & {url:string};
type Props = {snapshot:Snapshot|null; busy:boolean; exporting:boolean; loaded:boolean; hasDrafts:boolean; onExport:()=>void; onImport:()=>void};

export default function BackupPanel({snapshot,busy,exporting,loaded,hasDrafts,onExport,onImport}:Props){
 return <section className="paper-panel backup-panel" aria-labelledby="backup-heading">
  <div><Download className="card-icon" size={27} aria-hidden="true"/><h2 id="backup-heading">Backup & import</h2>
   <p>Download your saved batches, entries and photos, including Trash.</p>
   <div className="button-row backup-actions">
    {snapshot?<a className="button" href={snapshot.url} download={snapshot.filename}><Download size={17}/>Download JSON backup</a>:<button className="button" onClick={onExport} disabled={busy||!loaded}><Download size={17}/>{exporting?"Preparing backup…":"Prepare JSON backup"}</button>}
    <button className="button secondary" onClick={onImport} disabled={busy||!loaded}><Upload size={17}/>Import backup</button>
   </div>
   <div className="backup-snapshot" aria-live="polite">{snapshot&&<><p><strong>Prepared {new Date(snapshot.generatedAt).toLocaleString()}</strong><br/>{snapshot.counts.batches} batches · {snapshot.counts.entries} entries · {snapshot.counts.photos} photos</p><button className="text-button" onClick={onExport} disabled={busy}>Prepare a new backup</button></>}</div>
   {hasDrafts&&<p className="inline-warning small">You have unsaved drafts. Save them before preparing a backup to include those changes.</p>}
  </div>
  <div className="backup-help"><p className="small">Import adds separate copies alongside your records. Repeating an import creates duplicates; it does not sync or replace batches.</p>
   <details><summary>Keep a copy in Google Drive or Notion</summary><ol><li>Save your drafts, prepare a fresh backup, then download the JSON file.</li><li>Upload it to <a href="https://drive.google.com/" target="_blank" rel="noreferrer">Google Drive <ArrowUpRight size={12}/></a>, or attach the file to a Notion page. Large photo backups may exceed Notion’s attachment limit.</li><li>To restore, download the original JSON file and choose Import backup here.</li></ol><p className="small">Keep the original JSON file so you can import it here later. Exporting a Notion page will not create an app backup.</p></details>
   <p className="small muted">Drafts, unit preferences and timers stay on this device and are not included. Photos are the saved compressed copies; keep your originals separately.</p>
  </div>
 </section>;
}

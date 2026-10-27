"use client";

import { Download, Upload } from "lucide-react";
import type { backupSnapshot } from "@/lib/backup";

type Snapshot = ReturnType<typeof backupSnapshot> & {url:string};
type Props = {snapshot:Snapshot|null; busy:boolean; exporting:boolean; loaded:boolean; hasDrafts:boolean; onExport:()=>void; onImport:()=>void};

export default function BackupPanel({snapshot,busy,exporting,loaded,hasDrafts,onExport,onImport}:Props){
 return <section className="paper-panel backup-panel" aria-labelledby="backup-heading">
  <div><Download className="card-icon" size={27} aria-hidden="true"/><h2 id="backup-heading">Backup & import</h2>
   <p>Keep a file with your saved batches, entries and photos, including Trash.</p>
   <div className="button-row backup-actions">
    {snapshot?<a className="button" href={snapshot.url} download={snapshot.filename}><Download size={17}/>Download notebook file</a>:<button className="button" onClick={onExport} disabled={busy||!loaded}><Download size={17}/>{exporting?"Preparing file…":"Prepare export file"}</button>}
    <button className="button secondary" onClick={onImport} disabled={busy||!loaded}><Upload size={17}/>Import notebook file</button>
   </div>
   <div className="backup-snapshot" aria-live="polite">{snapshot&&<><p><strong>Prepared {new Date(snapshot.generatedAt).toLocaleString()}</strong><br/>{snapshot.counts.batches} batches · {snapshot.counts.entries} entries · {snapshot.counts.photos} photos</p><button className="text-button" onClick={onExport} disabled={busy}>Prepare a new backup</button></>}</div>
   {hasDrafts&&<p className="inline-warning small">You have unsaved drafts. Save them before preparing a backup to include those changes.</p>}
  </div>
  <div className="backup-help"><p className="small">Import adds separate copies alongside your records. Repeating an import creates duplicates; it does not sync or replace batches.</p>
   <p className="small">This notebook is saved only in this browser profile. Clearing site data or using a private window can remove it. Other people using this profile can open it.</p>
   <details><summary>Move your notebook to another device</summary><ol><li>Save your drafts, prepare an export, then download the JSON file.</li><li>Copy that file to your other device using storage you trust.</li><li>Open Mildly Feral there and choose Import notebook file.</li></ol><p className="small">Photos are embedded in the file, so you do not need a separate photo folder. The file is not encrypted; keep it somewhere private.</p></details>
   <p className="small muted">Drafts, unit preferences and timers stay on this device and are not included. Photos are the saved compressed copies; keep your originals separately.</p>
  </div>
 </section>;
}

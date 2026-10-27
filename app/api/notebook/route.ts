import { context, json, failed, boundedJson } from "@/lib/server";
import { emptyNotebook, notebookSchema, referencedPhotoIds } from "@/lib/notebook";
export const dynamic="force-dynamic";
export async function GET(request:Request) {try{
  const {owner,db}=await context(request);
  const row=await db.prepare("SELECT document, revision, updated_at FROM notebooks WHERE owner = ?").bind(owner).first<{document:string,revision:number,updated_at:string}>();
  const quota=await db.prepare("SELECT COUNT(*) AS count, COALESCE(SUM(bytes),0) AS bytes FROM photos WHERE owner = ?").bind(owner).first();
  return json({owner,book:row?JSON.parse(row.document):emptyNotebook(),revision:row?.revision??0,updatedAt:row?.updated_at??null,quota});
}catch(e){return failed(e);}}
export async function PUT(request:Request) {try{
  const {owner,db}=await context(request,true); const input=await boundedJson(request,750000);
  if(!input || typeof input!=="object")return json({error:"Invalid fieldbook data."},400);
  const parsed=notebookSchema.safeParse(input.book); if(!parsed.success || !Number.isInteger(input.revision) || input.revision<0) return json({error:parsed.success?"Invalid revision.":parsed.error.issues[0].message},400);
  const book=parsed.data; const ids=referencedPhotoIds(book);
  const owned=await db.prepare("SELECT id FROM photos WHERE owner = ?").bind(owner).all<{id:string}>();
  const ownedIds=new Set(owned.results.map(p=>p.id)); if(ids.some(id=>!ownedIds.has(id)))return json({error:"One or more photos are missing. Keep the draft open and attach them again."},400);
  const now=new Date().toISOString();
  await db.prepare("INSERT OR IGNORE INTO notebooks (owner,document,revision,updated_at) VALUES (?, ?, 0, ?)").bind(owner,JSON.stringify(emptyNotebook()),now).run();
  const result=await db.prepare("UPDATE notebooks SET document = ?, revision = revision + 1, updated_at = ? WHERE owner = ? AND revision = ? AND NOT EXISTS (SELECT 1 FROM json_each(?, '$.entries') e, json_each(e.value, '$.photos') p LEFT JOIN photos stored ON stored.id = json_extract(p.value, '$.id') AND stored.owner = ? WHERE stored.id IS NULL)").bind(JSON.stringify(book),now,owner,input.revision,JSON.stringify({entries:[...book.entries,...book.kombuchaEntries]}),owner).run();
  if(!result.meta.changes)return json({error:"Your fieldbook changed in another tab or device. Copy any draft text, then reload before saving."},409);
  return json({revision:input.revision+1,updatedAt:now});
}catch(e){return failed(e);}}

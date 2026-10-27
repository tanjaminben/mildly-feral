import { context,json,failed } from "@/lib/server";
import { referencedPhotoIds,Notebook } from "@/lib/notebook";
export const dynamic="force-dynamic";
type Params={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Params){try{
  const {owner,db,bucket}=await context(request);const {id}=await params;
  const row=await db.prepare("SELECT object_key FROM photos WHERE id = ? AND owner = ?").bind(id,owner).first<{object_key:string}>();
  if(!row)return json({error:"Photo not found."},404);const object=await bucket.get(row.object_key);if(!object)return json({error:"Photo not found."},404);
  return new Response(object.body,{headers:{"Content-Type":"image/jpeg","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
}catch(e){return failed(e);}}
export async function DELETE(request:Request,{params}:Params){try{
  const {owner,db,bucket}=await context(request,true);const {id}=await params;
  const doc=await db.prepare("SELECT document FROM notebooks WHERE owner = ?").bind(owner).first<{document:string}>();
  if(doc && referencedPhotoIds(JSON.parse(doc.document) as Notebook).includes(id))return json({error:"This photo is still attached to a saved entry, including Trash."},409);
  const row=await db.prepare("DELETE FROM photos WHERE id = ? AND owner = ? AND NOT EXISTS (SELECT 1 FROM notebooks n, json_each(n.document) collection, json_each(collection.value) e, json_each(e.value, '$.photos') p WHERE n.owner = ? AND collection.key IN ('entries', 'kombuchaEntries') AND json_extract(p.value, '$.id') = ?) RETURNING object_key").bind(id,owner,owner,id).first<{object_key:string}>();
  if(row)await bucket.delete(row.object_key);return json({ok:true});
}catch(e){return failed(e);}}

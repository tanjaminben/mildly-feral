import { context,json,failed } from "@/lib/server";
import { referencedPhotoIds } from "@/lib/notebook";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{
  const {owner,db}=await context(request);
  const rows=await db.prepare("SELECT id, bytes FROM photos WHERE owner = ?").bind(owner).all<{id:string,bytes:number}>();
  const doc=await db.prepare("SELECT document FROM notebooks WHERE owner = ?").bind(owner).first<{document:string}>();
  const used=new Set(doc?referencedPhotoIds(JSON.parse(doc.document)):[]);
  return json({count:rows.results.length,bytes:rows.results.reduce((sum,p)=>sum+p.bytes,0),unused:rows.results.filter(p=>!used.has(p.id)).map(p=>p.id)});
}catch(e){return failed(e);}}
export async function POST(request:Request){try{
  const {owner,db,bucket}=await context(request,true);
  if(request.headers.get("content-type")!=="image/jpeg")return json({error:"Upload a JPEG after image compression."},415);
  const reader=request.body?.getReader();if(!reader)return json({error:"No photo received."},400);
  const chunks:Uint8Array[]=[];let size=0;
  for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1048576){await reader.cancel();return json({error:"Photo is over the 1 MB compressed limit."},413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let n=0;for(const c of chunks){bytes.set(c,n);n+=c.length;}
  if(bytes.length<4 || bytes[0]!==255 || bytes[1]!==216 || bytes[2]!==255)return json({error:"The file is not a readable JPEG."},415);
  const id=crypto.randomUUID(), key=`photos/${owner}/${id}.jpg`, now=new Date().toISOString();
  const insert=await db.prepare("INSERT INTO photos (id,owner,object_key,mime,bytes,created_at) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM photos WHERE owner = ?) < 60").bind(id,owner,key,"image/jpeg",size,now,owner).run();
  if(!insert.meta.changes)return json({error:"Your 60-photo library is full. Export a backup, then permanently remove unneeded entries from Trash."},413);
  try{await bucket.put(key,bytes,{httpMetadata:{contentType:"image/jpeg"}});}catch(e){await db.prepare("DELETE FROM photos WHERE id = ? AND owner = ?").bind(id,owner).run();throw e;}
  return json({id,bytes:size},201);
}catch(e){return failed(e);}}

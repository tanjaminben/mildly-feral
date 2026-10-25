import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
export async function context(request: Request, mutation = false) {
  const user = await getChatGPTUser();
  if (!user) throw new Response(JSON.stringify({error:"Sign in again to open your private fieldbook."}), {status:401,headers:{"Content-Type":"application/json"}});
  if (mutation) {
    const origin=request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new Response("Cross-origin write rejected.",{status:403});
    if(request.headers.get("x-fieldbook") !== "1") throw new Response("Invalid request.",{status:403});
  }
  if(!env.DB || !env.BUCKET) throw new Error("Private storage is temporarily unavailable.");
  return {owner:user.userId, db:env.DB, bucket:env.BUCKET};
}
export function json(value:unknown,status=200) { return Response.json(value,{status,headers:{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}}); }
export function failed(e:unknown) { if(e instanceof Response) return e; console.error("Fieldbook request failed",e instanceof Error?e.message:"unknown"); return json({error:"The save could not finish. Keep this page open and try again."},503); }
export async function boundedJson(request:Request, limit:number) {
  const reader=request.body?.getReader(); if(!reader) throw new Response("Missing data",{status:400});
  let size=0; const chunks:Uint8Array[]=[];
  for(;;) { const {done,value}=await reader.read(); if(done)break; size+=value.length; if(size>limit) {await reader.cancel();throw json({error:"This fieldbook is too large. Export it, then remove old records."},413);} chunks.push(value); }
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw json({error:"Invalid JSON file."},400);}
}

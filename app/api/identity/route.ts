import { context,json,failed } from "@/lib/server";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{const {owner}=await context(request);return json({id:owner});}catch(e){return failed(e);}}

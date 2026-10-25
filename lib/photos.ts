export async function compressPhoto(file:File):Promise<Blob>{
 if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("Choose a JPEG, PNG or WebP photo. Convert HEIC photos to JPEG first.");
 if(file.size>15*1024*1024)throw new Error("Choose a photo smaller than 15 MB.");
 let bitmap:ImageBitmap;try{bitmap=await createImageBitmap(file);}catch{throw new Error("This photo could not be opened. Try a JPEG or PNG copy.");}
 const ratio=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
 const ctx=canvas.getContext("2d");if(!ctx){bitmap.close();throw new Error("Photo compression is unavailable in this browser.");}ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
 for(const quality of [.82,.68,.5,.35]){const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));if(blob && blob.size<=1048576)return blob;}
 throw new Error("This photo remains too large after compression. Try a smaller image.");
}
export const blobData=(blob:Blob)=>new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error("Could not read the photo."));r.readAsDataURL(blob);});
export function decodePhoto(value:unknown):Blob{if(typeof value!=="string" || value.length>1400000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(value))throw new Error("The backup has an invalid or oversized photo.");const raw=atob(value.split(",")[1]);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));if(bytes.length>1048576 || bytes[0]!==255 || bytes[1]!==216)throw new Error("The backup contains an invalid photo.");return new Blob([bytes],{type:"image/jpeg"});}

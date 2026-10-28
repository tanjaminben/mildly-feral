import assert from 'node:assert/strict';
import { serveMildlyFeral, isMildlyFeralPath } from '../worker/notebook-path.mjs';
const seen = [];
const assets = { async fetch(request) {
  const url = new URL(request.url); seen.push({path:url.pathname, method:request.method});
  const html = url.pathname === '/mildlyferal/';
  return new Response(request.method === 'HEAD' ? null : html ? '<h1>Notebook</h1>' : 'asset', {
    status: html || url.pathname.endsWith('.png') ? 200 : 404,
    headers:{'Content-Type':html?'text/html':'image/png'},
  });
} };
let count=0;
async function check(name, run){await run();count++;console.log('PASS '+name);}
await check('only the exact app path and its children match',()=>{
  assert.ok(isMildlyFeralPath('/mildlyferal'));assert.ok(isMildlyFeralPath('/mildlyferal/images/a.png'));
  for(const path of ['/','/privacy','/mildlyferalish','/tools/mildlyferal'])assert.equal(isMildlyFeralPath(path),false);
});
await check('canonical root serves the directory asset without a browser redirect',async()=>{
  const r=await serveMildlyFeral(new Request('https://ben-tan.com/mildlyferal?drink=kombucha'),assets);
  assert.equal(r.status,200);assert.equal(seen.at(-1).path,'/mildlyferal/');assert.equal(r.headers.get('location'),null);
  assert.match(r.headers.get('content-security-policy'),/connect-src 'none'/);assert.match(r.headers.get('cache-control'),/no-transform/);
});
await check('slash and index aliases retain the query at the canonical address',async()=>{
  for(const path of ['/mildlyferal/','/mildlyferal/index.html']){
    const r=await serveMildlyFeral(new Request('https://ben-tan.com'+path+'?drink=kombucha&kstep=tea'),assets);
    assert.equal(r.status,308);assert.equal(r.headers.get('location'),'https://ben-tan.com/mildlyferal?drink=kombucha&kstep=tea');
  }
});
await check('image requests keep the app prefix',async()=>{
  const r=await serveMildlyFeral(new Request('https://ben-tan.com/mildlyferal/images/brew.png'),assets);
  assert.equal(r.status,200);assert.equal(seen.at(-1).path,'/mildlyferal/images/brew.png');
});
await check('HEAD uses HEAD at the asset binding',async()=>{
  const r=await serveMildlyFeral(new Request('https://ben-tan.com/mildlyferal',{method:'HEAD'}),assets);
  assert.equal(r.status,200);assert.equal(await r.text(),'');assert.equal(seen.at(-1).method,'HEAD');
});
await check('writes and notebook APIs never reach the asset binding',async()=>{
  const n=seen.length;
  for(const method of ['POST','PUT','DELETE'])assert.equal((await serveMildlyFeral(new Request('https://ben-tan.com/mildlyferal',{method}),assets)).status,405);
  assert.equal((await serveMildlyFeral(new Request('https://ben-tan.com/mildlyferal/api/notebook'),assets)).status,404);
  assert.equal(seen.length,n);
});
await check('missing pages remain 404',async()=>assert.equal((await serveMildlyFeral(new Request('https://ben-tan.com/mildlyferal/missing'),assets)).status,404));
await check('other portfolio routes remain outside the notebook handler',async()=>assert.equal((await serveMildlyFeral(new Request('https://ben-tan.com/privacy'),assets)).status,404));
console.log(count+' path routing checks passed.');

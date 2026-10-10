import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';

export const dependency = createRequire(process.env.BLACKOUT_TOOLCHAIN ? resolve(process.env.BLACKOUT_TOOLCHAIN, 'package.json') : resolve('package.json'));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.json':'application/json'};
export async function startPreview() {
  const root=resolve('dist');
  const server=createServer(async(req,res)=>{
    try {
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(!pathname.startsWith('/preview/')){res.writeHead(404);res.end('Not found');return;}
      const path=resolve(root,pathname.slice('/preview/'.length)||'index.html');
      if(!path.startsWith(root+sep)){res.writeHead(403);res.end();return;}
      if(!(await stat(path)).isFile()){res.writeHead(404);res.end();return;}
      res.writeHead(200,{'Content-Type':types[extname(path)]??'application/octet-stream','Cache-Control':'no-store'});res.end(await readFile(path));
    } catch {res.writeHead(404);res.end('Not found');}
  });
  await new Promise(resolve=>server.listen(0,'0.0.0.0',resolve));
  return {url:`http://127.0.0.1:${server.address().port}/preview/`,close:()=>new Promise(resolve=>server.close(resolve))};
}
if(process.argv[1]?.endsWith('preview-server.mjs')) {
  const preview=await startPreview();console.log(preview.url);
  // Bounded inspection process; callers may terminate it as soon as review finishes.
  const timer=setTimeout(()=>void preview.close().then(()=>process.exit(0)),20*60_000);
  process.on('SIGTERM',()=>{clearTimeout(timer);void preview.close().then(()=>process.exit(0));});
}

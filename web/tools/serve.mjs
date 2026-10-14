import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { repo } from './deps.mjs';
export async function serve(port=0) {
 const root=resolve(repo,'dist');
 const server=createServer(async(req,res)=>{
  try {
   const url=new URL(req.url,'http://localhost');let path=decodeURIComponent(url.pathname);
   if(path.startsWith('/preview/'))path=path.slice('/preview'.length);
   const file=resolve(root,'.'+(path.endsWith('/')?path+'index.html':path));
   if(!file.startsWith(root+sep)||!(await stat(file)).isFile()){res.writeHead(404);res.end('Not found');return;}
   const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.webmanifest':'application/manifest+json'}[extname(file)]||'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Not found');}
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 return {server,url:`http://127.0.0.1:${server.address().port}/preview/`};
}
if(process.argv[1]?.endsWith('/serve.mjs')){const {server,url}=await serve(Number(process.argv[2]||4173));console.log(url);process.on('SIGINT',()=>server.close());process.on('SIGTERM',()=>server.close());}

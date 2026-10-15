// Install Lighthouse outside the repo; the app's locked dependencies stay intact.
import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {requireTool} from './deps.mjs';
import {serve} from './serve.mjs';
const {chromium}=requireTool('playwright');
const {server,url}=await serve();
const browser=await chromium.launch({headless:true,args:['--remote-debugging-port=9235']});
try{
 const {default:lighthouse}=await import(pathToFileURL(process.env.BLACKOUT_LIGHTHOUSE||'/tmp/blackout-lighthouse/node_modules/lighthouse/core/index.js'));
 const {lhr}=await lighthouse(url,{port:9235,onlyCategories:['performance'],output:'json',logLevel:'error'});
 if(process.argv.includes('--detail')){mkdirSync('test/scratch',{recursive:true});writeFileSync('test/scratch/performance-detail.json',JSON.stringify(lhr));}
 const keys=['first-contentful-paint','largest-contentful-paint','speed-index','total-blocking-time','cumulative-layout-shift'];
 const result={checkedAt:new Date().toISOString(),lighthouseVersion:lhr.lighthouseVersion,browserVersion:browser.version(),score:Math.round(lhr.categories.performance.score*100),metrics:Object.fromEntries(keys.map(k=>[k,{value:lhr.audits[k].numericValue,display:lhr.audits[k].displayValue,score:lhr.audits[k].score}])),settings:{formFactor:lhr.configSettings.formFactor,throttlingMethod:lhr.configSettings.throttlingMethod,throttling:lhr.configSettings.throttling,screenEmulation:lhr.configSettings.screenEmulation},runtimeError:lhr.runtimeError||null,runWarnings:lhr.runWarnings,server:'Local static export at /preview/, no compression, live RPCs; default mobile simulated throttling. Cold browser storage. No fixture data.'};
 mkdirSync('artifacts/v11',{recursive:true});writeFileSync('artifacts/v11/lighthouse-mobile.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 if(result.score<80||result.runtimeError)process.exitCode=1;
}finally{await browser.close();server.close();}

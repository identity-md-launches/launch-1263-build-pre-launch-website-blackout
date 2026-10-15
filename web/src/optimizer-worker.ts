import { optimizeFarm } from './optimizer';
self.onmessage=({data})=>{try{const plan=optimizeFarm(data.farm,data.rules,(visited,best)=>self.postMessage({visited,best}));self.postMessage({plan});}catch(error){self.postMessage({error:String(error)});}};

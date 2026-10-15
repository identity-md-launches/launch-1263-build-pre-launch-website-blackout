// Display snapshots only. Never used by simulate(), send(), or a transaction quote.
const prefix='blackout.public.v11.4663.';
export function cached<T>(key:string):T|null {
 try {
  const raw=localStorage.getItem(prefix+key);
  return raw?JSON.parse(raw,(_,v)=>v&&typeof v==='object'&&typeof v.$bigint==='string'?BigInt(v.$bigint):v) as T:null;
 }catch{return null;}
}
export function remember(key:string,value:unknown){
 try{localStorage.setItem(prefix+key,JSON.stringify(value,(_,v)=>typeof v==='bigint'?{$bigint:v.toString()}:v));}
 catch{/* Private browsing and a full cache must not interrupt the game. */}
}

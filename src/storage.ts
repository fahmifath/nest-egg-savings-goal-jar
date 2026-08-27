import{type Jar,normalizeJar}from"./domain";
const KEY="nest-egg-jars";
export type LoadResult={status:"ok";jars:Jar[]}|{status:"empty"}|{status:"partial";jars:Jar[];skipped:number}|{status:"error";message:string};
export function load():LoadResult{
  try{
    const raw=localStorage.getItem(KEY);if(raw===null)return{status:"empty"};
    const parsed=JSON.parse(raw) as unknown;
    if(!Array.isArray(parsed))return{status:"error",message:"Saved data is not a valid list."};
    if(parsed.length===0)return{status:"empty"};
    const jars:Jar[]=[],skipped={n:0};
    for(const item of parsed){const j=normalizeJar(item);if(j)jars.push(j);else skipped.n++;}
    if(jars.length===0)return{status:"error",message:"All saved jars were unreadable."};
    if(skipped.n>0)return{status:"partial",jars,skipped:skipped.n};
    return{status:"ok",jars};
  }catch(err){return{status:"error",message:err instanceof Error?err.message:"Unknown error"};}
}
export function save(jars:Jar[]):boolean{
  try{localStorage.setItem(KEY,JSON.stringify(jars));return true;}catch{return false;}
}

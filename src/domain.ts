export interface Deposit{id:string;amount:number;note:string;date:string;}
export interface Jar{id:string;name:string;emoji:string;targetAmount:number;savedAmount:number;deposits:Deposit[];createdAt:string;}
export const JAR_STATUSES=["not-started","in-progress","reached"] as const;
export type JarStatus=(typeof JAR_STATUSES)[number];
export const STATUS_LABELS:Record<JarStatus,string>={"not-started":"Not Started","in-progress":"In Progress","reached":"Reached 🎉"};
export interface ValidationResult{ok:boolean;errors:Record<string,string>;}
export function validateJarInput(input:{name:string;emoji:string;targetAmount:string}):ValidationResult{
  const errors:Record<string,string>={},name=input.name.trim(),tStr=input.targetAmount.trim(),t=parseFloat(tStr);
  if(!name)errors.name="Name is required.";else if(name.length>50)errors.name="Name must be 50 characters or fewer.";
  if(!tStr)errors.targetAmount="Target amount is required.";else if(!isFinite(t))errors.targetAmount="Target amount must be a valid number.";else if(t<=0)errors.targetAmount="Target amount must be greater than zero.";
  return{ok:!Object.keys(errors).length,errors};
}
export function validateDepositInput(input:{amount:string;note:string}):ValidationResult{
  const errors:Record<string,string>={},aStr=input.amount.trim(),a=parseFloat(aStr);
  if(!aStr)errors.amount="Amount is required.";else if(!isFinite(a))errors.amount="Amount must be a valid number.";else if(a<=0)errors.amount="Amount must be greater than zero.";
  if(input.note.trim().length>200)errors.note="Note must be 200 characters or fewer.";
  return{ok:!Object.keys(errors).length,errors};
}
export function createJar(input:{name:string;emoji:string;targetAmount:string},id:string,now:string):Jar{
  return{id,name:input.name.trim(),emoji:input.emoji.trim()||"🫙",targetAmount:parseFloat(input.targetAmount),savedAmount:0,deposits:[],createdAt:now};
}
export function createDeposit(input:{amount:string;note:string;date:string},id:string,now:string):Deposit{
  return{id,amount:parseFloat(input.amount),note:input.note.trim(),date:input.date.trim()||now};
}
export function normalizeDeposit(raw:unknown):Deposit|null{
  if(!raw||typeof raw!=="object")return null;
  const r=raw as Record<string,unknown>;
  if(typeof r.id!=="string"||typeof r.amount!=="number"||!isFinite(r.amount)||r.amount<=0||typeof r.note!=="string"||typeof r.date!=="string")return null;
  return{id:r.id,amount:r.amount,note:r.note,date:r.date};
}
export function normalizeJar(raw:unknown):Jar|null{
  if(!raw||typeof raw!=="object")return null;
  const r=raw as Record<string,unknown>;
  if(typeof r.id!=="string"||typeof r.name!=="string"||!r.name.trim()||typeof r.emoji!=="string"||typeof r.targetAmount!=="number"||!isFinite(r.targetAmount)||r.targetAmount<=0||typeof r.savedAmount!=="number"||!isFinite(r.savedAmount)||r.savedAmount<0||typeof r.createdAt!=="string"||!Array.isArray(r.deposits))return null;
  const deposits=(r.deposits as unknown[]).map(normalizeDeposit).filter((d):d is Deposit=>d!==null);
  return{id:r.id,name:r.name.trim(),emoji:r.emoji||"🫙",targetAmount:r.targetAmount,savedAmount:r.savedAmount,deposits,createdAt:r.createdAt};
}
export function getJarStatus(jar:Jar):JarStatus{
  return jar.savedAmount<=0?"not-started":jar.savedAmount>=jar.targetAmount?"reached":"in-progress";
}
export function getProgressPercent(jar:Jar):number{
  return jar.targetAmount<=0?0:Math.min(100,Math.max(0,(jar.savedAmount/jar.targetAmount)*100));
}
export function formatCurrency(amount:number):string{
  return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(amount);
}
export function formatDate(iso:string):string{
  if(!iso)return"—";
  const d=new Date(iso);return isNaN(d.getTime())?"—":new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(d);
}

import {type Jar,type JarStatus,STATUS_LABELS,validateJarInput,validateDepositInput,createJar,createDeposit,getJarStatus,getProgressPercent,formatCurrency,formatDate} from "./domain";
import {load,save} from "./storage";
let jars:Jar[]=[],deleteArmedId:string|null=null,deleteArmedTimer:ReturnType<typeof setTimeout>|null=null,depositTargetId:string|null=null;
let liveRegion:HTMLElement,storageBanner:HTMLElement,jarGrid:HTMLElement,emptyCollection:HTMLElement,addJarForm:HTMLFormElement,depositModal:HTMLElement,depositForm:HTMLFormElement,depositModalTitle:HTMLElement;
const byId=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
function announce(msg:string):void{liveRegion.textContent="";requestAnimationFrame(()=>{liveRegion.textContent=msg;});}
function reportFailure(msg:string):void{storageBanner.textContent=msg;storageBanner.classList.add("visible");announce(msg);}
function clearBanner():void{storageBanner.classList.remove("visible");storageBanner.textContent="";}
function el<K extends keyof HTMLElementTagNameMap>(tag:K,cls?:string,txt?:string,attrs?:Record<string,string>):HTMLElementTagNameMap[K]{
  const n=document.createElement(tag);if(cls)n.className=cls;if(txt)n.textContent=txt;
  if(attrs)for(const k in attrs)n.setAttribute(k,attrs[k]);
  return n;
}
function sEl(tag:string,attrs:Record<string,string>):SVGElement{
  const n=document.createElementNS("http://www.w3.org/2000/svg",tag);
  for(const k in attrs)n.setAttribute(k,attrs[k]);
  return n;
}
function clearFieldError(id:string):void{
  const e=byId(`${id}-error`),f=byId<HTMLInputElement>(id);
  if(e)e.textContent="";if(f)f.removeAttribute("aria-invalid");
}
function showFieldError(id:string,msg:string):void{
  const e=byId(`${id}-error`),f=byId<HTMLInputElement>(id);
  if(e)e.textContent=msg;if(f){f.setAttribute("aria-invalid","true");f.focus();}
}
function createJarSvg(percent:number,status:JarStatus):SVGElement{
  const svg=sEl("svg",{viewBox:"0 0 80 100","aria-hidden":"true",class:`jar-svg jar-svg--${status}`});
  const clipId=`c-${Math.random().toString(36).slice(2,8)}`;
  const defs=sEl("defs",{}),cp=sEl("clipPath",{id:clipId});
  cp.appendChild(sEl("rect",{x:"10",y:"31",width:"60",height:"61",rx:"2"}));defs.appendChild(cp);
  const fh=(61*percent)/100,fy=92-fh;
  svg.append(
    defs,
    sEl("rect",{class:"jar-liquid",x:"10",y:String(fy),width:"60",height:String(fh),"clip-path":`url(#${clipId})`}),
    sEl("rect",{class:"jar-shine",x:"16",y:"32",width:"8",height:"50",rx:"4","clip-path":`url(#${clipId})`}),
    sEl("path",{class:"jar-body",d:"M15 25 Q10 25 10 32 L10 85 Q10 92 20 92 L60 92 Q70 92 70 85 L70 32 Q70 25 65 25 Z"}),
    sEl("rect",{class:"jar-mouth",x:"18",y:"25",width:"44",height:"6"}),
    sEl("rect",{class:"jar-lid",x:"12",y:"18",width:"56",height:"10",rx:"4"})
  );
  return svg;
}
function createDepositHistoryEl(jar:Jar):HTMLElement{
  const sec=el("div","deposit-history"),last5=jar.deposits.slice(-5).reverse();
  if(!last5.length){sec.appendChild(el("p","deposit-history__empty","No deposits yet."));return sec;}
  const list=el("ul","deposit-history__list",undefined,{"aria-label":"Recent deposits"});
  for(const dep of last5){
    const item=el("li","deposit-history__item");
    const meta=el("span","deposit-history__meta",formatDate(dep.date)+(dep.note?` — ${dep.note}`:""));
    item.append(el("span","deposit-history__amount",formatCurrency(dep.amount)),meta);
    list.appendChild(item);
  }
  sec.appendChild(list);return sec;
}
function createJarCard(jar:Jar):HTMLElement{
  const status=getJarStatus(jar),percent=getProgressPercent(jar),isArmed=deleteArmedId===jar.id;
  const card=el("article",`jar-card jar-card--${status}${status==="reached"?" jar-card--celebrate":""}`,undefined,{role:"listitem","data-id":jar.id});
  const hdr=el("div","jar-card__header");
  hdr.append(
    el("span","jar-card__emoji",jar.emoji,{"aria-hidden":"true"}),
    el("h2","jar-card__name",jar.name),
    el("span",`jar-card__status jar-card__status--${status}`,STATUS_LABELS[status])
  );
  const vis=el("div","jar-card__visual",undefined,{"aria-hidden":"true"});
  vis.appendChild(createJarSvg(percent,status));
  const prog=el("div","jar-card__progress");
  const pBar=el("div","jar-card__bar",undefined,{role:"progressbar","aria-valuenow":String(Math.round(percent)),"aria-valuemin":"0","aria-valuemax":"100","aria-label":`${jar.name} savings progress`});
  const fill=el("div",`jar-card__bar-fill jar-card__bar-fill--${status}`);fill.style.width=`${percent}%`;pBar.appendChild(fill);
  prog.append(el("span","jar-card__saved",formatCurrency(jar.savedAmount)),el("span","jar-card__of"," of "),el("span","jar-card__target",formatCurrency(jar.targetAmount)),pBar,el("span","jar-card__pct",`${Math.round(percent)}%`));
  const acts=el("div","jar-card__actions");
  acts.append(
    el("button","btn btn--primary btn--sm","＋ Deposit",{"aria-label":`Add deposit to ${jar.name}`,"data-action":"deposit","data-id":jar.id}),
    el("button",`btn btn--danger btn--sm${isArmed?" btn--armed":""}`,isArmed?"Confirm Delete?":"Delete",{"aria-label":isArmed?`Confirm delete ${jar.name}`:`Delete ${jar.name}`,"data-action":"delete","data-id":jar.id})
  );
  card.append(hdr,vis,prog,createDepositHistoryEl(jar),acts);return card;
}
function render():void{
  jarGrid.innerHTML="";
  if(!jars.length){emptyCollection.classList.remove("hidden");jarGrid.classList.add("hidden");return;}
  emptyCollection.classList.add("hidden");jarGrid.classList.remove("hidden");
  for(const jar of jars)jarGrid.appendChild(createJarCard(jar));
}
function persistJars():void{if(!save(jars))reportFailure("Your changes could not be saved. Storage may be full or unavailable.");}
function openDepositModal(id:string):void{
  const jar=jars.find(j=>j.id===id);if(!jar)return;
  depositTargetId=id;depositModalTitle.textContent=`Add Deposit — ${jar.emoji} ${jar.name}`;
  depositForm.reset();clearFieldError("deposit-amount");clearFieldError("deposit-note");
  depositModal.classList.remove("hidden");depositModal.setAttribute("aria-hidden","false");
  const di=byId<HTMLInputElement>("deposit-date");if(di)di.value=new Date().toISOString().slice(0,10);
  byId<HTMLInputElement>("deposit-amount")?.focus();
}
function closeDepositModal():void{
  depositModal.classList.add("hidden");depositModal.setAttribute("aria-hidden","true");depositTargetId=null;
  jarGrid.querySelector<HTMLButtonElement>('[data-action="deposit"]')?.focus();
}
function handleAddJar(e:SubmitEvent):void{
  e.preventDefault();clearBanner();["add-name","add-target"].forEach(clearFieldError);
  const d=new FormData(e.target as HTMLFormElement);
  const input={name:(d.get("name") as string)??"",emoji:(d.get("emoji") as string)??"",targetAmount:(d.get("targetAmount") as string)??""};
  const res=validateJarInput(input);
  if(!res.ok){
    if(res.errors.name)showFieldError("add-name",res.errors.name);
    if(res.errors.targetAmount)showFieldError("add-target",res.errors.targetAmount);
    announce(`Form errors: ${Object.values(res.errors).join(". ")}`);
    byId(res.errors.name?"add-name":"add-target")?.focus();
    return;
  }
  const id=`jar-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const newJar=createJar(input,id,new Date().toISOString());
  jars=[...jars,newJar];persistJars();
  (e.target as HTMLFormElement).reset();render();
  jarGrid.querySelector<HTMLElement>(`[data-id="${id}"]`)?.classList.add("jar-card--new");
  announce(`${newJar.emoji} ${newJar.name} jar added. Target: ${formatCurrency(newJar.targetAmount)}.`);
}
function handleDeposit(e:SubmitEvent):void{
  e.preventDefault();if(!depositTargetId)return;
  clearFieldError("deposit-amount");clearFieldError("deposit-note");
  const d=new FormData(e.target as HTMLFormElement);
  const input={amount:(d.get("amount") as string)??"",note:(d.get("note") as string)??"",date:(d.get("date") as string)??""};
  const res=validateDepositInput(input);
  if(!res.ok){
    if(res.errors.amount)showFieldError("deposit-amount",res.errors.amount);
    if(res.errors.note)showFieldError("deposit-note",res.errors.note);
    announce(`Form errors: ${Object.values(res.errors).join(". ")}`);return;
  }
  const dep=createDeposit(input,`dep-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,new Date().toISOString().slice(0,10));
  jars=jars.map(j=>j.id===depositTargetId?{...j,savedAmount:j.savedAmount+dep.amount,deposits:[...j.deposits,dep]}:j);
  const jar=jars.find(j=>j.id===depositTargetId)!;
  const reached=jar.savedAmount>=jar.targetAmount;
  persistJars();closeDepositModal();render();
  announce(reached?`Goal reached! ${jar.emoji} ${jar.name} fully funded at ${formatCurrency(jar.savedAmount)}! 🎉`:`Added ${formatCurrency(dep.amount)} to ${jar.emoji} ${jar.name}. Total: ${formatCurrency(jar.savedAmount)}.`);
}
function armDelete(id:string):void{
  if(deleteArmedTimer!==null)clearTimeout(deleteArmedTimer);
  deleteArmedId=id;render();
  deleteArmedTimer=setTimeout(()=>{deleteArmedId=null;deleteArmedTimer=null;render();announce("Delete cancelled.");},3000);
}
function confirmDelete(id:string):void{
  if(deleteArmedTimer!==null){clearTimeout(deleteArmedTimer);deleteArmedTimer=null;}
  deleteArmedId=null;
  const jar=jars.find(j=>j.id===id);if(!jar)return;
  const name=`${jar.emoji} ${jar.name}`;
  jars=jars.filter(j=>j.id!==id);persistJars();render();announce(`${name} jar deleted.`);
}
function handleGridClick(e:MouseEvent):void{
  const btn=(e.target as HTMLElement).closest<HTMLButtonElement>("[data-action]");if(!btn)return;
  const{action,id}=btn.dataset;if(!id)return;
  if(action==="deposit")openDepositModal(id);
  else if(action==="delete"){if(deleteArmedId===id)confirmDelete(id);else armDelete(id);}
}
function handleModalKeydown(e:KeyboardEvent):void{
  if(e.key==="Escape"){closeDepositModal();return;}
  if(e.key==="Tab"){
    const fs=depositModal.querySelectorAll<HTMLElement>('button,input,textarea,select,[tabindex]:not([tabindex="-1"])');
    const first=fs[0],last=fs[fs.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
}
export function init():void{
  liveRegion=byId("live-region");storageBanner=byId("storage-banner");jarGrid=byId("jar-grid");
  emptyCollection=byId("empty-collection");addJarForm=byId<HTMLFormElement>("add-jar-form");
  depositModal=byId("deposit-modal");depositForm=byId<HTMLFormElement>("deposit-form");
  depositModalTitle=byId("deposit-modal-title");
  const result=load();
  switch(result.status){
    case "ok":jars=result.jars;break;
    case "empty":jars=[];break;
    case "partial":jars=result.jars;reportFailure(`${result.skipped} jar${result.skipped>1?"s":""} could not be loaded due to corrupt data and were skipped.`);break;
    case "error":jars=[];reportFailure(`Could not load your saved jars: ${result.message}`);break;
  }
  render();
  addJarForm.addEventListener("submit",handleAddJar);
  depositForm.addEventListener("submit",handleDeposit);
  jarGrid.addEventListener("click",handleGridClick);
  depositModal.addEventListener("click",e=>{if(e.target===depositModal)closeDepositModal();});
  depositModal.addEventListener("keydown",handleModalKeydown);
  byId("close-deposit-modal")?.addEventListener("click",closeDepositModal);
  byId("empty-cta-btn")?.addEventListener("click",()=>{
    const f=byId("add-name");f?.scrollIntoView({behavior:"smooth"});f?.focus();
  });
}

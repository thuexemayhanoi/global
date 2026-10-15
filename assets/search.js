// No server, AI API, third-party library or full article download.
// Fetches only metadata shards for the selected language when a user searches.
(() => {
 "use strict";
 const form=document.getElementById("premium-search-form");
 if(!form)return;
 const q=document.getElementById("premium-q"),select=document.getElementById("premium-locale");
 const status=document.getElementById("premium-search-status"),results=document.getElementById("premium-search-results"),pagination=document.getElementById("premium-search-pages");
 const LIMIT=12;let generation=0,matched=[],page=0,manifest=null;
 const norm=x=>String(x||"").normalize("NFKC").toLocaleLowerCase().trim();
 const reset=()=>{results.replaceChildren();pagination.replaceChildren();};
 function make(tag,klass,txt){const el=document.createElement(tag);if(klass)el.className=klass;if(txt!==undefined)el.textContent=txt;return el;}
 function render(){
  reset();
  const n=matched.length,first=page*LIMIT;
  if(!n){status.textContent="No matching published guides in this language.";return;}
  status.textContent=n+" matching published guide"+(n===1?"":"s")+".";
  for(const r of matched.slice(first,first+LIMIT)){
   const a=make("a","premium-search-result");a.href=r.u;
   a.append(make("strong","",r.t),make("span","",r.d),make("small","",r.u));results.append(a);
  }
  const pages=Math.ceil(n/LIMIT);if(pages<2)return;
  for(let i=0;i<pages&&i<60;i++){
   const b=make("button","",String(i+1));b.type="button";
   if(i===page)b.setAttribute("aria-current","page");
   b.addEventListener("click",()=>{page=i;render();status.scrollIntoView({block:"start",behavior:"auto"})});pagination.append(b);
  }
  if(pages>60){const p=make("p","", "Showing the first 60 result pages. Refine your search to narrow the results.");pagination.append(p);}
 }
 async function search(){
  const id=++generation,term=norm(q.value),lang=select.value;
  reset();
  if(term.length<2){status.textContent="Enter at least two characters to search.";return;}
  status.textContent="Searching published guide summaries…";
  const url=new URL(window.location.href);url.searchParams.set("q",q.value.trim());url.searchParams.set("lang",lang);
  history.replaceState(null,"",url.pathname+url.search);
  try{
   if(!manifest){const response=await fetch("/assets/search-index/manifest.json");if(!response.ok)throw Error("Search manifest unavailable");manifest=await response.json();}
   const shards=manifest.locales?.[lang]?.shards||[];
   const all=[];const BATCH=4;
   for(let i=0;i<shards.length;i+=BATCH){
    if(id!==generation)return;
    const pages=await Promise.all(shards.slice(i,i+BATCH).map(async file=>{
     const res=await fetch(file);if(!res.ok)throw Error("Search shard unavailable: "+file);
     return res.json();
    }));
    for(const entries of pages)all.push(...entries);
   }
   if(id!==generation)return;
   const words=term.split(/\s+/).filter(Boolean);
   matched=all.filter(x=>{const t=norm(x.t+" "+x.d);return words.every(w=>t.includes(w));});
   matched.sort((a,b)=>Number(norm(b.t).includes(term))-Number(norm(a.t).includes(term))||a.u.localeCompare(b.u));
   page=0;render();
  }catch(e){if(id!==generation)return;status.textContent="Search is temporarily unavailable. Browse the language guides or try again.";console.warn("Local search",e);}
 }
 form.addEventListener("submit",e=>{e.preventDefault();search()});
 const params=new URL(window.location.href).searchParams;
 if(params.has("lang")&&Array.from(select.options).some(o=>o.value===params.get("lang")))select.value=params.get("lang");
 if(params.has("q")){q.value=params.get("q").slice(0,120);search();}
})();

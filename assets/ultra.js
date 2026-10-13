// Tiny progressive enhancements: native buttons, accessible focus/copy/TOC, no external API.
(() => {
 "use strict";
 const els=Array.from(document.querySelectorAll("[data-ultra-copy], [data-ultra-focus]"));
 for(const el of els)el.hidden=false;
 const announce=(button,msg)=>{
  const feedback=button.closest(".ultra-reading-tools")?.querySelector(".ultra-copy-feedback");
  if(feedback){feedback.textContent=msg;feedback.dataset.state=msg?"active":"idle";}
 };
 document.querySelectorAll("[data-ultra-copy]").forEach(button=>button.addEventListener("click",async()=>{
  try{
   const url=window.location.origin+window.location.pathname;
   if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
   else {
    const input=document.createElement("textarea");input.value=url;input.setAttribute("readonly","");
    input.style.position="fixed";input.style.left="-9999px";document.body.append(input);input.select();
    const success=document.execCommand("copy");input.remove();if(!success)throw new Error("Clipboard unavailable");
   }
   announce(button,"✓ Link copied");
  }catch{announce(button,"Copy this page address from the browser bar.");}
 }));
 document.querySelectorAll("[data-ultra-focus]").forEach(button=>button.addEventListener("click",()=>{
  const on=document.body.classList.toggle("ultra-focus");
  button.setAttribute("aria-pressed",String(on));
 }));
 const toc=Array.from(document.querySelectorAll(".premium-toc a[href^='#']"));
 const sectionElements=toc.map(x=>document.getElementById(x.getAttribute("href").slice(1))).filter(Boolean);
 if("IntersectionObserver" in window&&sectionElements.length){
  const obs=new IntersectionObserver(entries=>{
   for(const entry of entries)if(entry.isIntersecting){
    toc.forEach(a=>a.removeAttribute("aria-current"));
    const a=toc.find(a=>a.getAttribute("href")==="#"+entry.target.id);
    if(a)a.setAttribute("aria-current","location");
   }
  },{rootMargin:"-110px 0px -68% 0px",threshold:0});
  sectionElements.forEach(el=>obs.observe(el));
 }
 const mobileToc=document.querySelector(".ultra-mobile-toc");
 mobileToc?.querySelectorAll("a[href^='#']").forEach(a=>a.addEventListener("click",()=>mobileToc.removeAttribute("open")));
 // One category dropdown at a time, while preserving native keyboard and non-JS use.
 document.querySelectorAll(".nav2-topic").forEach(topic=>topic.addEventListener("toggle",()=>{
  if(topic.open)document.querySelectorAll(".nav2-topic").forEach(other=>{if(other!==topic)other.removeAttribute("open")});
 }));
 document.addEventListener("keydown",event=>{
  if(event.key!=="Escape")return;
  document.querySelectorAll(".nav2-topic[open],.nav2-lang[open]").forEach(el=>el.removeAttribute("open"));
 });
})();

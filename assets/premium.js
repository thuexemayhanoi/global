// Progressive enhancement only: all content, navigation, TOCs and links work without JS.
(() => {
 "use strict";
 const back=document.querySelector(".premium-back-top");
 const progress=document.getElementById("premium-reading-progress");
 let scheduled=false;
 const update=()=>{
  scheduled=false;
  const y=window.scrollY||0;
  if(back)back.classList.toggle("is-visible",y>450);
  if(progress){
   const denom=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
   progress.style.width=Math.min(100,Math.max(0,y/denom*100)).toFixed(1)+"%";
  }
 };
 window.addEventListener("scroll",()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update)}},{passive:true});
 window.addEventListener("resize",()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update)}},{passive:true});
 update();
 const menu=document.querySelector(".nav2-drawer");
 if(menu){
  // Closed by default in HTML. Desktop nav is a separate semantic <nav>, no JS dependency.
  menu.removeAttribute("open");
  menu.querySelectorAll("a[href]").forEach(a=>a.addEventListener("click",()=>menu.removeAttribute("open")));
 }
})();

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
  // Native <details open> makes the desktop nav usable even without JavaScript.
  // On smartphones, turn it into an initially collapsed hamburger accordion.
  const narrow=window.matchMedia("(max-width:760px)");
  const sync=()=>{
   if(narrow.matches)menu.removeAttribute("open");
   else menu.setAttribute("open","");
  };
  sync();
  if(narrow.addEventListener)narrow.addEventListener("change",sync);
  else narrow.addListener(sync);
  menu.querySelectorAll("a[href]").forEach(a=>a.addEventListener("click",()=>{if(narrow.matches)menu.removeAttribute("open")}));
}
})();

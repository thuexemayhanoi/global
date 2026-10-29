// Cover images for Hub, Supporting and checklist pages (Matrix task IMG-*). Each cover is drawn from the page's own
// H1 and first section headings over the site's existing topic illustration of that Hub, so it is unique to its URL
// and states nothing the page does not; it is an illustrated cover, never presented as a photo of a real shop.
// Chromium (Playwright) renders the 1200×675 card; scripts/images/encode_webp.py writes the 1200 and 640 WebP files.
// Usage: node scripts/images/covers.mjs --task=IMG-01   (or --ids=EN-H01,EN-S07)
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
import {FAQ_HEADINGS} from "../articles.mjs";
import {NAV_LABELS} from "../navigation.mjs";
import {SCENE} from "./scenes.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),"utf8"));
const MANIFEST="data/seo/image-covers.json";
const CJK=new Set(["zh","ja","ko"]);
// Topic illustration per Hub cluster (the same files the site already serves) and its index in NAV_LABELS.
const TOPIC={"vehicle-choice":["/topic-choose-bike.webp",1,"choose"],"rental-costs":["/topic-prices-deposits.webp",2,"prices"],"documents-contracts":["/topic-documents.webp",3,"documents"],"safety-support":["/topic-safety.webp",4,"safety"]};
// Localized ASCII file names for the checklist covers (article covers reuse the URL slug).
const CHECKLIST_SLUG={vi:"checklist-thue-xe-may-ha-noi",en:"hanoi-motorbike-rental-checklist",de:"roller-miete-hanoi-checkliste",fr:"checklist-location-scooter-hanoi",es:"checklist-alquiler-moto-hanoi",nl:"checklist-scooterhuur-hanoi",zh:"hanoi-zuche-jiancha-qingdan",pt:"checklist-aluguer-mota-hanoi",ko:"hanoi-bike-rental-checklist",ja:"hanoi-rental-bike-checklist"};
// Latin letters come from Liberation Sans; CJK glyphs fall back to the installed WenQuanYi (zh, ko) or IPA (ja) fonts.
const FONT={zh:'"Liberation Sans","WenQuanYi Zen Hei",sans-serif',ko:'"Liberation Sans","WenQuanYi Zen Hei",sans-serif',ja:'"Liberation Sans","IPAGothic","IPAPGothic",sans-serif'};
const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const SKIP=/^(?:References|More in this topic)$/i;

export function altText(locale,h1,scene){
 const s=SCENE[locale];
 return CJK.has(locale)&&locale!=="ko"?h1+"——"+s.prefix+s[scene]:h1+" – "+s.prefix+" "+s[scene];
}

function points(headings,locale){
 const faq=new Set([FAQ_HEADINGS[locale],"Frequently asked question","A common question","Häufige Frage","Question fréquente","Pregunta frecuente","Veelgestelde vraag","Een veelgestelde vraag","Pergunta frequente","Uma pergunta frequente"]);
 const max=CJK.has(locale)?30:72;
 return headings.filter(h=>!faq.has(h)&&!SKIP.test(h)&&[...h].length<=max).slice(0,3);
}

export function coverPlan(ids){
 const matrix=read("data/seo/master-matrix.json"),locales=read("content/locales.json");
 const byId=new Map(matrix.rows.map(r=>[r.id,r]));
 return ids.map(id=>{
  const row=byId.get(id);
  if(!row||row.status!=="PUBLISHED")throw Error("Not a published Matrix row: "+id);
  const [topicImage,labelIdx,scene]=TOPIC[row.cluster]||[];
  if(!topicImage)throw Error("No topic illustration for cluster "+row.cluster+" ("+id+")");
  let h1,heads,label,file;
  if(id.endsWith("-CHECKLIST")){
   const l=locales.find(x=>x.code===row.locale);
   h1=l.guideTitle;heads=l.guideSections.map(s=>s[0]);label=NAV_LABELS[row.locale][5];
   file="/img/"+row.locale+"/checklist/"+CHECKLIST_SLUG[row.locale]+".webp";
   return {id,locale:row.locale,url:row.url,h1,points:points(heads,row.locale),label,topicImage,alt:altText(row.locale,h1,"choose"),file,source_image:"/topic-choose-bike.webp",scene:"choose"};
  }
  const p=read("content/articles/"+id+".json");
  h1=p.h1;heads=p.body_markdown.split("\n").filter(l=>/^## /.test(l)).map(l=>l.slice(3).trim());label=NAV_LABELS[row.locale][labelIdx];
  const m=row.url.match(/^\/([a-z]{2})\/(topics|guides)\/([a-z0-9-]+)\/$/);
  if(!m)throw Error("Unexpected URL "+row.url);
  file="/img/"+m[1]+"/"+m[2]+"/"+m[3]+".webp";
  return {id,locale:row.locale,url:row.url,h1,points:points(heads,row.locale),label,topicImage,alt:altText(row.locale,h1,scene),file,source_image:topicImage,scene};
 });
}

function cardHtml(c,photo){
 const font=FONT[c.locale]||'"Liberation Sans","DejaVu Sans",sans-serif';
 return '<!doctype html><html lang="'+esc(c.locale)+'"><head><meta charset="utf-8"><style>'+
 '*{box-sizing:border-box}html,body{margin:0;width:1200px;height:675px;overflow:hidden;background:#081e2d}'+
 '.c{position:relative;width:1200px;height:675px;font-family:'+font+'}'+
 '.ph{position:absolute;right:0;top:0;width:560px;height:675px;background:url('+photo+') center/cover no-repeat}'+
 '.ph:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,#081e2d 0%,rgba(8,30,45,.78) 18%,rgba(8,30,45,.12) 52%,rgba(8,30,45,0) 70%)}'+
 '.tx{position:absolute;left:60px;top:50px;bottom:46px;width:660px;display:flex;flex-direction:column}'+
 '.brand{color:#fff;font-weight:800;font-size:19px;letter-spacing:.14em}.brand b{color:#21d7cf;font-weight:800}'+
 '.pill{align-self:flex-start;margin-top:30px;background:#ebc888;color:#081e2d;font-weight:800;font-size:19px;padding:7px 16px;border-radius:999px}'+
 'h1{color:#fff;font-size:54px;line-height:1.13;margin:20px 0 0;font-weight:800;letter-spacing:-.01em;overflow-wrap:anywhere;text-wrap:balance}'+(c.locale==="ko"?'h1,li{word-break:keep-all}':'')+
 'ul{list-style:none;margin:26px 0 0;padding:0;color:#d6ebf3;font-size:23px;line-height:1.3}'+
 'li{position:relative;padding-left:34px;margin:0 0 11px}li:before{content:"";position:absolute;left:2px;top:.42em;width:14px;height:8px;border-left:4px solid #21d7cf;border-bottom:4px solid #21d7cf;transform:rotate(-45deg)}'+
 '.url{margin-top:auto;padding-top:14px;color:#8fb3c4;font-size:18px;letter-spacing:.03em}'+
 '</style></head><body><div class="c"><div class="ph"></div><div class="tx" id="tx"><div class="brand">VIETNAM <b>/</b> WHEELS</div><div class="pill">'+esc(c.label)+'</div><h1 id="h">'+esc(c.h1)+'</h1><ul id="u">'+c.points.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul><div class="url">global.rentbikehanoi.com</div></div></div></body></html>';
}

async function main(){
 const arg=k=>process.argv.find(a=>a.startsWith("--"+k+"="))?.split("=")[1];
 let ids=arg("ids")?.split(",");
 const task=arg("task");
 if(task)ids=read("docs/seo-matrix/TASKS.json").tasks.find(t=>t.id===task).scope;
 if(!ids?.length)throw Error("Pass --task=IMG-xx or --ids=...");
 const plan=coverPlan(ids);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"covers-"));
 const photos={};
 for(const c of plan)photos[c.topicImage]??="data:image/webp;base64,"+fs.readFileSync(path.join(root,c.topicImage.slice(1))).toString("base64");
 // Playwright is a global install in this environment (loaded only when rendering, so the plan helpers import without it).
 const {chromium}=createRequire(import.meta.url)("playwright");
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:1200,height:675},deviceScaleFactor:1});
 const jobs=[];
 for(const c of plan){
  await page.setContent(cardHtml(c,photos[c.topicImage]),{waitUntil:"load"});
  await page.evaluate(()=>document.fonts.ready);
  // Shrink the title, then drop trailing points, until the text column fits; never cut a word or add an ellipsis.
  c.shown_points=await page.evaluate(()=>{
   const tx=document.getElementById("tx"),h=document.getElementById("h"),u=document.getElementById("u");
   const fits=()=>tx.scrollHeight<=tx.clientHeight+1;
   let size=54;
   while(!fits()&&size>34){size-=2;h.style.fontSize=size+"px";}
   while(!fits()&&u.children.length>1)u.lastElementChild.remove();
   while(!fits()&&size>28){size-=2;h.style.fontSize=size+"px";}
   if(!fits())throw Error("Cover text does not fit: "+h.textContent);
   return [...u.children].map(li=>li.textContent);
  });
  const png=path.join(tmp,c.id+".png");
  await page.screenshot({path:png,type:"png"});
  jobs.push({id:c.id,png,out:path.join(root,c.file.slice(1)),out640:path.join(root,c.file.slice(1).replace(/\.webp$/,"-640.webp"))});
 }
 await browser.close();
 fs.writeFileSync(path.join(tmp,"jobs.json"),JSON.stringify(jobs));
 const sizes=JSON.parse(execFileSync("python3",["-I",path.join(root,"scripts/images/encode_webp.py"),path.join(tmp,"jobs.json")]).toString());
 const manifest=fs.existsSync(path.join(root,MANIFEST))?read(MANIFEST):{version:1,note:"",covers:{}};
 manifest.note="Reviewed cover images (Matrix tasks IMG-*): one 1200×675 WebP per Hub/Supporting/checklist URL plus a 640 px variant, drawn by scripts/images/covers.mjs from the page's own H1 and first section headings over the site's existing topic illustration. Alt text names the page and describes the illustration in the page language. Standard: 100–300 KB per main image; smaller accepted when sharp.";
 for(const c of plan){
  const s=sizes[c.id];
  manifest.covers[c.id]={url:c.url,locale:c.locale,src:c.file,src640:c.file.replace(/\.webp$/,"-640.webp"),width:1200,height:675,bytes:s.bytes,bytes640:s.bytes640,quality:s.quality,
   alt:c.alt,h1:c.h1,points:c.shown_points,label:c.label,source_image:c.source_image,task:task||null};
 }
 manifest.covers=Object.fromEntries(Object.entries(manifest.covers).sort(([a],[b])=>a.localeCompare(b)));
 fs.writeFileSync(path.join(root,MANIFEST),JSON.stringify(manifest,null,1)+"\n");
 fs.rmSync(tmp,{recursive:true,force:true});
 const kb=plan.map(c=>sizes[c.id].bytes/1024);
 console.log("COVERS_WRITTEN",JSON.stringify({count:plan.length,task,min_kb:Math.round(Math.min(...kb)),max_kb:Math.round(Math.max(...kb)),over_300kb:kb.filter(x=>x>300).length}));
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e);process.exit(1);});

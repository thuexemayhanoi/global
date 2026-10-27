#!/usr/bin/env node
/**
 * Read-only multilingual language audit of the generated site (the tree GitHub Pages serves).
 * For every HTML page it compares the declared language signals with each other and with the
 * actual body text: <html lang>, the locale's htmlLang in content/locales.json, hreflang codes,
 * JSON-LD inLanguage, og:locale and the language of the visible body (deterministic script and
 * function-word counts, no model). Source lists are excluded from the body: they cite documents
 * by their original (often Vietnamese) titles on purpose.
 *   node scripts/seo/language-audit.mjs [--out reports/language-audit.json] [--fail]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ORIGIN="https://global.rentbikehanoi.com";
const SKIP=new Set([".git","node_modules","factory","docs","data","scripts","tests","approvals","content","config","schemas","examples","reports",".github"]);
const STOP={
 en:"the and of to in is for you with on that are it or be this your as at can from not if before when",
 de:"der die das und ist nicht mit ein eine für auf den dem zu es im sie du bei auch wenn oder sich wird nur dass",
 fr:"le la les et des est pour que une un du en dans pas vous sur au avec ce qui par plus être aux ou",
 es:"el la los las y de que en un una es para por con no se del al lo su más si como pero",
 nl:"de het een en van is dat op te in voor niet met je zijn aan er als ook bij of wordt dan maar",
 pt:"o a os as e de que em um uma é para com não do da no na por se mais ao dos das ou",
 vi:"và của là có không được cho với khi các những trong người một này để đi bạn thì xe nếu từ theo",
};
const STOPSETS=Object.fromEntries(Object.entries(STOP).map(([k,v])=>[k,new Set(v.split(" "))]));
// Letters that Vietnamese uses and the other Latin-script site languages do not (â ê ô ã õ are left out: French and Portuguese use them).
const VI_ONLY=/[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệịỉĩọỏốồổỗộớờởỡợụủũứừửữựỳỵỷỹ]/i;
const decode=s=>s.replace(/&nbsp;/g," ").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&amp;/g,"&");
const attr=(tag,name)=>{const m=tag.match(new RegExp("\\s"+name+"\\s*=\\s*\"([^\"]*)\"","i"));return m?decode(m[1]):null;};

export function bodyText(html){
 let m=html.match(/<main[\s\S]*?<\/main>/i)?.[0]||html;
 for(const re of [/<script[\s\S]*?<\/script>/gi,/<style[\s\S]*?<\/style>/gi,/<nav[\s\S]*?<\/nav>/gi,/<header[\s\S]*?<\/header>/gi,/<footer[\s\S]*?<\/footer>/gi,/<(code|pre)\b[\s\S]*?<\/\1>/gi,/<section class="article-references">[\s\S]*?<\/section>/gi])m=m.replace(re," ");
 return decode(m.replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim();
}
export function detectLanguage(text){
 const han=(text.match(/\p{Script=Han}/gu)||[]).length,kana=(text.match(/[\p{Script=Hiragana}\p{Script=Katakana}]/gu)||[]).length,hangul=(text.match(/\p{Script=Hangul}/gu)||[]).length;
 const words=text.toLowerCase().match(/\p{Script=Latin}+/gu)||[];
 if(han+kana+hangul>words.length*1.2)return hangul>(han+kana)*0.5?"ko":kana>han*0.08?"ja":"zh";
 const hits={};
 for(const w of words)for(const k in STOPSETS)if(STOPSETS[k].has(w))hits[k]=(hits[k]||0)+1;
 return Object.entries(hits).sort((a,b)=>b[1]-a[1])[0]?.[0]||"unknown";
}
export function longestVietnameseRun(text){
 let run=[],best=[];
 for(const w of text.split(/\s+/)){
  const lw=w.toLowerCase().replace(/[.,;:!?()"“”„«»'’]/g,"");
  if(lw&&(VI_ONLY.test(lw)||STOPSETS.vi.has(lw)))run.push(w);else{if(run.length>best.length)best=run;run=[];}
 }
 return run.length>best.length?run:best;
}
const walkLd=(node,fn)=>{if(Array.isArray(node))node.forEach(n=>walkLd(n,fn));else if(node&&typeof node==="object"){fn(node);Object.values(node).forEach(v=>walkLd(v,fn));}};

/** Audits one page. `localeLang` maps locale code -> htmlLang; `pageLocale` is the path locale or null for root pages. */
export function auditPage({url,html,pageLocale,localeLang}){
 const out=[],add=(severity,code,detail)=>out.push({severity,code,url,detail});
 const known=new Set(Object.values(localeLang)),lang=attr(html.match(/<html[^>]*>/i)?.[0]||"","lang");
 const expected=pageLocale?localeLang[pageLocale]:null;
 if(!lang)add("FAIL","HTML_LANG_MISSING","");
 else if(expected&&lang!==expected)add("FAIL","HTML_LANG_MISMATCH",`lang="${lang}", ${pageLocale} pages declare "${expected}"`);
 else if(!expected&&!known.has(lang))add("FAIL","HTML_LANG_UNKNOWN",lang);
 const text=bodyText(html);
 if(pageLocale&&text.length>=400){
  const found=detectLanguage(text);
  if(found!==pageLocale)add("FAIL","BODY_LANGUAGE_MISMATCH",`declared ${pageLocale}, body reads as ${found}`);
  if(pageLocale!=="vi"){const run=longestVietnameseRun(text);if(run.length>=12)add("WARN","VIETNAMESE_RUN_OUTSIDE_SOURCES",run.join(" ").slice(0,160));}
 }
 for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)){
  let data;try{data=JSON.parse(m[1]);}catch{add("FAIL","JSONLD_INVALID","");continue;}
  walkLd(data,n=>{
   if(n.inLanguage===undefined)return;
   if(Array.isArray(n.inLanguage)){if(url!=="/"||n.inLanguage.some(v=>!known.has(v)))add("FAIL","INLANGUAGE_LIST",`${n["@type"]}: ${n.inLanguage.join(",")}`);}
   else if(lang&&n.inLanguage!==lang)add("FAIL","INLANGUAGE_MISMATCH",`${n["@type"]} inLanguage=${n.inLanguage}, html lang=${lang}`);
  });
 }
 for(const t of html.match(/<meta\s[^>]*property="og:locale(?::alternate)?"[^>]*>/gi)||[]){
  const v=attr(t,"content")||"";
  if(/og:locale"/.test(t)&&lang&&v.slice(0,2).toLowerCase()!==lang.slice(0,2))add("FAIL","OG_LOCALE_MISMATCH",`${v} vs ${lang}`);
 }
 for(const t of html.match(/<link\s[^>]*hreflang="[^"]*"[^>]*>/gi)||[]){
  const code=attr(t,"hreflang"),href=attr(t,"href")||"",target=href.startsWith(ORIGIN)?href.slice(ORIGIN.length).split("/")[1]:null;
  if(code==="x-default")continue;
  if(!target||!localeLang[target])add("FAIL","HREFLANG_TARGET_LOCALE_UNKNOWN",`${code} ${href}`);
  else if(code!==localeLang[target])add("FAIL","HREFLANG_CODE_MISMATCH",`${code} -> ${href}, ${target} pages declare ${localeLang[target]}`);
 }
 for(const t of html.match(/<a\s[^>]*lang="[^"]*"[^>]*>/gi)||[]){
  const l=attr(t,"lang"),h=attr(t,"href")||"",target=(h.startsWith(ORIGIN)?h.slice(ORIGIN.length):h).split("/")[1];
  if(localeLang[target]&&l!==localeLang[target])add("FAIL","LANGUAGE_LINK_LANG_MISMATCH",`${h} lang="${l}"`);
 }
 return out;
}

export function auditSite(root){
 const locales=JSON.parse(fs.readFileSync(path.join(root,"content/locales.json"),"utf8"));
 const localeLang=Object.fromEntries(locales.map(l=>[l.code,l.htmlLang]));
 const files=[],walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(e.isDirectory()){if(!SKIP.has(e.name))walk(path.join(d,e.name));}else if(e.name.endsWith(".html"))files.push(path.join(d,e.name));}};
 walk(root);
 const issues=[],perLocale={};
 for(const f of files){
  const rel="/"+path.relative(root,f).split(path.sep).join("/"),url=rel.endsWith("/index.html")?rel.slice(0,-10):rel;
  const seg=url.split("/")[1],pageLocale=localeLang[seg]?seg:null;
  const p=perLocale[pageLocale||"root"]||={pages:0,fail:0};
  p.pages++;
  const found=auditPage({url,html:fs.readFileSync(f,"utf8"),pageLocale,localeLang});
  p.fail+=found.filter(i=>i.severity==="FAIL").length;
  issues.push(...found);
 }
 const counts={};for(const i of issues)counts[i.severity+" "+i.code]=(counts[i.severity+" "+i.code]||0)+1;
 return {mode:"LANGUAGE_AUDIT_READ_ONLY",pages:files.length,perLocale,fail:issues.filter(i=>i.severity==="FAIL").length,warn:issues.filter(i=>i.severity==="WARN").length,counts,issues};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
 const args=process.argv.slice(2),outAt=args.indexOf("--out");
 const report=auditSite(root);
 if(outAt>=0){fs.mkdirSync(path.dirname(path.resolve(root,args[outAt+1])),{recursive:true});fs.writeFileSync(path.resolve(root,args[outAt+1]),JSON.stringify(report,null,1));}
 for(const i of report.issues)console.log(i.severity,i.code,i.url,i.detail);
 const {issues,...summary}=report;
 console.log((report.fail?"LANGUAGE_AUDIT_FAIL ✗ ":"LANGUAGE_AUDIT_PASS ✓ ")+JSON.stringify(summary));
 if(args.includes("--fail")&&report.fail)process.exit(1);
}

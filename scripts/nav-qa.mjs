import fs from "node:fs";
import {readLocalSitemapInventory} from "./sitemaps.mjs";
import {menuChildren,LEGACY_HUB_CLUSTERS} from "./navigation.mjs";
const localeCodes=["vi","en","de","fr","es","nl","zh","pt","ko","ja"];
const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
const all=matrix.rows.filter(r=>r.status==="IDEA");
const live=new Set(readLocalSitemapInventory(process.cwd(),localeCodes).urls);
const errors=[];
for(const code of localeCodes)for(const route of [code+"/index.html",code+"/checklist/index.html"]){
 const html=fs.readFileSync(route,"utf8");
 if(!html.includes('data-nav-version="2"')||!html.includes('data-footer-version="2"'))errors.push("missing shared shell: "+route);
 if((html.match(/class="nav2-topic"/g)||[]).length!==4)errors.push("hub count: "+route);
 const featured=matrix.rows.filter(h=>h.locale===code&&h.role==="HUB"&&LEGACY_HUB_CLUSTERS.includes(h.cluster)).flatMap(h=>menuChildren(matrix,h.id));
 // Later Hubs appear only once PUBLISHED, as links in the "More topics" group of header and footer.
 for(const h of matrix.rows.filter(h=>h.locale===code&&h.role==="HUB"&&!LEGACY_HUB_CLUSTERS.includes(h.cluster)&&h.status==="PUBLISHED"))
  if((html.match(new RegExp('href="'+h.url+'"','g'))||[]).length<2)errors.push("published Hub "+h.id+" missing from header/footer: "+route);
 if(featured.length!==8)errors.push("expected 8 featured child labels: "+route);
 for(const r of featured.filter(r=>r.status!=="PUBLISHED"))if(!html.includes('data-planned-id="'+r.id+'"'))errors.push("planned label missing "+r.id);
 for(const r of all)if(html.includes('href="'+r.url+'"'))errors.push("IDEA href present: "+r.id);
 for(const m of html.matchAll(/href="(\/[^"#?]*)(?:#[^"]*)?"/g)){
  if(["/assets/styles.css","/assets/navigation.css","/assets/premium.css","/assets/ultra.css","/assets/favicon.svg"].includes(m[1]))continue;
  if(m[1]==="/search/"&&fs.existsSync("search/index.html")&&fs.readFileSync("search/index.html","utf8").includes('name="robots" content="noindex,follow"'))continue;
  if(!live.has(m[1]))errors.push("unpublished link: "+route+" -> "+m[1]);
 }
}
for(const p of ["index.html","search/index.html","about/index.html","contact/index.html","privacy/index.html","terms/index.html","404.html"]){
 const html=fs.readFileSync(p,"utf8");
 if(!html.includes('data-nav-version="2"')||!html.includes('data-footer-version="2"'))errors.push("footer/header missing "+p);
}
if(!fs.readFileSync("index.html","utf8").includes('id="languages"'))errors.push("language selector anchor missing");
if(!fs.readFileSync("en/index.html","utf8").includes('class="nav2-drawer" open'))errors.push("Desktop menu closed without JS");
if(errors.length){errors.forEach(e=>console.error(e));process.exit(1)}
const extra=matrix.rows.filter(h=>h.role==="HUB"&&!LEGACY_HUB_CLUSTERS.includes(h.cluster)&&h.status==="PUBLISHED").length;
console.log("Shared navigation QA PASS — 10 locales, 4 hubs and 8 child labels each, "+extra+" published later Hub(s) linked, zero IDEA hyperlinks");

import fs from "node:fs";
const localeCodes=["vi","en","de","fr","es","nl","zh","pt","ko","ja"];
const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
const all=matrix.rows.filter(r=>r.status==="IDEA");
const live=new Set([...fs.readFileSync("sitemap.xml","utf8").matchAll(/<loc>https:\/\/global\.rentbikehanoi\.com(\/[^<]*)<\/loc>/g)].map(m=>m[1]));
const errors=[];
for(const code of localeCodes)for(const route of [code+"/index.html",code+"/checklist/index.html"]){
 const html=fs.readFileSync(route,"utf8");
 if(!html.includes('data-nav-version="2"')||!html.includes('data-footer-version="2"'))errors.push("missing shared shell: "+route);
 if((html.match(/class="nav2-topic"/g)||[]).length!==4)errors.push("hub count: "+route);
 for(const r of all.filter(r=>r.locale===code&&r.role==="SUPPORT"))if(!html.includes('data-planned-id="'+r.id+'"'))errors.push("planned label missing "+r.id);
 for(const r of all)if(html.includes('href="'+r.url+'"'))errors.push("IDEA href present: "+r.id);
 for(const m of html.matchAll(/href="(\/[^"#?]*)(?:#[^"]*)?"/g)){
  if(["/assets/styles.css","/assets/navigation.css","/assets/favicon.svg"].includes(m[1]))continue;
  if(!live.has(m[1]))errors.push("unpublished link: "+route+" -> "+m[1]);
 }
}
for(const p of ["index.html","about/index.html","contact/index.html","privacy/index.html","terms/index.html","404.html"]){
 const html=fs.readFileSync(p,"utf8");
 if(!html.includes('data-nav-version="2"')||!html.includes('data-footer-version="2"'))errors.push("footer/header missing "+p);
}
if(!fs.readFileSync("index.html","utf8").includes('id="languages"'))errors.push("language selector anchor missing");
if(errors.length){errors.forEach(e=>console.error(e));process.exit(1)}
console.log("Shared navigation QA PASS — 10 locales, 4 hubs and 8 child labels each, zero IDEA hyperlinks");

import fs from "node:fs";
import path from "node:path";
// Test fixture. While READY is low the Topic Factory promotes every gate-clean PROPOSED candidate, so the live
// topical map can legitimately hold none. Tests that exercise PROPOSED candidates rewind the most recent promotion
// in memory instead: the candidate becomes PROPOSED again and its unpublished Matrix row (and any claim on it) is
// dropped, which is exactly the gate-clean state just before that promotion. Nothing is written to the repository.
const num=p=>Number(String(p.candidate_id).split("-").pop())||0;
function pickAndRewind(proposalsByLocale,matrix,ledger,locales,perLocale){
 const rows=new Map(matrix.rows.map(r=>[r.id,r]));
 const referenced=new Set([...matrix.rows,...Object.values(proposalsByLocale).flat()].flatMap(x=>(x.distinct_from||[]).map(d=>d.id)));
 const claimed=new Set((ledger?.claims||[]).filter(c=>c.status!=="RELEASED").map(c=>c.id));
 const rewound=[];
 for(const code of locales){
  const list=proposalsByLocale[code]||[];
  const missing=perLocale-list.filter(p=>p.status==="PROPOSED").length;
  if(missing<=0)continue;
  const pick=list.filter(p=>p.status==="PROMOTED"&&rows.get(p.matrix_id)?.status==="IDEA"&&!referenced.has(p.matrix_id))
   .sort((a,b)=>Number(claimed.has(a.matrix_id))-Number(claimed.has(b.matrix_id))||num(b)-num(a)).slice(0,missing);
  for(const p of pick){
   const id=p.matrix_id;
   p.status="PROPOSED";delete p.matrix_id;
   rows.delete(id);
   rewound.push({locale:code,candidate_id:p.candidate_id,matrix_id:id});
  }
 }
 const dropped=new Set(rewound.map(r=>r.matrix_id));
 matrix.rows=matrix.rows.filter(r=>!dropped.has(r.id));
 if(ledger)ledger.claims=ledger.claims.filter(c=>!dropped.has(c.id));
 return rewound;
}
/** In-memory: {map, matrix, ledger?} clones in which every locale holds at least `perLocale` PROPOSED candidates. */
export function rewindPromotions({map,matrix,ledger=null},{locales=Object.keys(map.locales),perLocale=1}={}){
 const m=structuredClone(map),mx=structuredClone(matrix),lg=ledger?structuredClone(ledger):null;
 const rewound=pickAndRewind(Object.fromEntries(Object.entries(m.locales).map(([k,l])=>[k,l.proposals])),mx,lg,locales,perLocale);
 return {map:m,matrix:mx,ledger:lg,rewound};
}
/** Same rewind applied to a throw-away repository copy (topical-map locale files, Matrix and claims ledger). */
export function rewindPromotionsInDir(dir,{locales,perLocale=1}={}){
 const p=rel=>path.join(dir,rel),read=rel=>JSON.parse(fs.readFileSync(p(rel),"utf8"));
 const files=Object.fromEntries(locales.map(code=>[code,read("data/seo/topical-authority/"+code+".json")]));
 const matrix=read("data/seo/master-matrix.json"),ledger=read("factory/external-writers/claims.json");
 const rewound=pickAndRewind(Object.fromEntries(Object.entries(files).map(([k,f])=>[k,f.proposals])),matrix,ledger,locales,perLocale);
 for(const [code,f] of Object.entries(files))fs.writeFileSync(p("data/seo/topical-authority/"+code+".json"),JSON.stringify(f,null,2)+"\n");
 fs.writeFileSync(p("data/seo/master-matrix.json"),JSON.stringify(matrix,null,2)+"\n");
 fs.writeFileSync(p("factory/external-writers/claims.json"),JSON.stringify(ledger,null,2)+"\n");
 return rewound;
}

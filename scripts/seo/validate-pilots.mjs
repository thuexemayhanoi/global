#!/usr/bin/env node
// Confirm content QA for both pilot drafts while explicitly blocking publication until human fact review.
import fs from "node:fs";
import path from "node:path";
import { checkArticle, renderArticle } from "../articles.mjs";
const root=process.cwd();
const matrix=JSON.parse(fs.readFileSync("data/seo/master-matrix.json","utf8"));
const locales=JSON.parse(fs.readFileSync("content/locales.json","utf8"));
const ids=["EN-H01","DE-H01"], result=[];
let failed=false;
fs.mkdirSync("reports/editorial-previews",{recursive:true});
for(const id of ids){
 const packet=JSON.parse(fs.readFileSync("editorial/review/"+id+".json","utf8"));
 const row=matrix.rows.find(x=>x.id===id),locale=locales.find(x=>x.code===packet.locale);
 if(!row||!locale||row.status!=="IDEA")throw Error("Pilot must still be IDEA: "+id);
 if(packet.facts_reviewed_by_human!==false)throw Error("Human-reviewed flag must stay false until actual review: "+id);
 if(packet.serp_intent_checked!==true)throw Error("SERP intent not reviewed: "+id);
 const check=checkArticle(packet,matrix,locales);
 const expected=["Human editorial fact review is required"];
 const other=check.errors.filter(x=>!expected.includes(x));
 if(other.length||check.errors.length!==1){failed=true;console.error(id+": "+JSON.stringify(check.errors));}
 if(!packet.body_markdown.includes("/"+packet.locale+"/checklist/")){failed=true;console.error("Missing checklist internal link "+id)}
 if(packet.sources.length<3){failed=true;console.error("Not enough official references "+id)}
 if(check.words<700){failed=true;console.error("Insufficient useful text "+id)}
 const md=fs.readFileSync("editorial/review/"+id+".md","utf8");
 if(!md.includes(packet.body_markdown)){failed=true;console.error("Preview markdown differs from source "+id)}
 const html=renderArticle(packet,locale,row,matrix);
 fs.writeFileSync(path.join("reports/editorial-previews",id+".html"),html);
 result.push({id,words:check.words,automated_nonhuman_checks:other.length===0?"PASS":"FAIL",human_fact_review:"PENDING",preview_file:"reports/editorial-previews/"+id+".html",target_url:row.url,source_urls:packet.sources.map(x=>x.url),original_review_path:"editorial/review/"+id+".md"});
}
fs.writeFileSync("reports/pilot-editorial-qa.json",JSON.stringify({status:failed?"FAIL":"NEEDS_HUMAN_REVIEW",site_unchanged:true,live_publication:false,articles:result},null,2)+"\n");
console.log(JSON.stringify(result,null,2));
if(failed)process.exit(1);

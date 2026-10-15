import test from "node:test";
import assert from "node:assert/strict";
import {renderArticle,topicLinks} from "../scripts/articles.mjs";
const topical={locales:{en:{existing:{"EN-S01":"vc-transmission","EN-S02":"vc-power"},cluster_labels:{"vc-transmission":"Manual, semi-automatic, automatic","vc-power":"Engine size and electric"}}}};
const row=(id,role,parent,status="PUBLISHED",priority=30)=>({id,locale:"en",role,parent_id:parent,status,priority,url:role==="HUB"?"/en/topics/"+id.toLowerCase()+"/":"/en/guides/"+id.toLowerCase()+"/",working_title:"Title "+id});
const matrix={rows:[row("EN-HOME","PILLAR",null),row("EN-H01","HUB","EN-HOME"),row("EN-S01","SUPPORT","EN-H01"),row("EN-S02","SUPPORT","EN-H01","PUBLISHED",31),row("EN-S03","SUPPORT","EN-H01","IDEA",32),
 ...Array.from({length:8},(_,i)=>row("EN-S1"+i,"SUPPORT","EN-H01","PUBLISHED",40+i)),row("EN-S90","SUPPORT","EN-H02")]};
matrix.rows.find(r=>r.id==="EN-S10").subcluster="vc-power";

test("a published Hub links every published child, grouped by silo, never IDEA rows",()=>{
 const html=topicLinks(matrix.rows[1],matrix,topical,"en");
 for(const id of ["EN-S01","EN-S02",...Array.from({length:8},(_,i)=>"EN-S1"+i)])assert.ok(html.includes('href="/en/guides/'+id.toLowerCase()+'/"'),id);
 assert.ok(!html.includes("en-s03"),"IDEA child is never linked");
 assert.ok(!html.includes("en-s90"),"other Hub's child is not listed");
 assert.match(html,/<h2>Guides in this topic<\/h2>/);
 assert.match(html,/<h3>Manual, semi-automatic, automatic<\/h3>/);
 assert.match(html,/<h3>Engine size and electric<\/h3>/);
});

test("a Supporting guide links up to six published siblings, same silo first",()=>{
 const html=topicLinks(matrix.rows.find(r=>r.id==="EN-S02"),matrix,topical,"en");
 const links=[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(links.length,6);
 assert.equal(links[0],"/en/guides/en-s10/","same-silo sibling first");
 assert.ok(!links.includes("/en/guides/en-s02/"),"never links to itself");
 assert.equal(topicLinks(row("EN-S77","SUPPORT","EN-H09"),matrix,topical,"en"),"","no siblings, no empty section");
});

test("article references heading is localized",()=>{
 const packet={title:"Titre de test pour la rubrique",meta_description:"d",h1:"h",body_markdown:"## A\n\ntext",sources:[{url:"https://a.example/x",title:"A"}]};
 const html=renderArticle(packet,{code:"fr",htmlLang:"fr",name:"Français"},{...row("FR-S01","SUPPORT","FR-H01"),locale:"fr",url:"/fr/guides/x/"},{rows:[]},null);
 assert.match(html,/<h2>Sources<\/h2>/);
 assert.doesNotMatch(html,/<h2>References<\/h2>/);
});

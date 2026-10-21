import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {renderArticle,generateApprovedArticles} from '../scripts/articles.mjs';

test('metadata-only revision preserves the published article lead and body',()=>{
 const matrix=JSON.parse(fs.readFileSync('data/seo/master-matrix.json','utf8'));
 const locales=JSON.parse(fs.readFileSync('content/locales.json','utf8'));
 const original=JSON.parse(fs.readFileSync('content/articles/EN-S11.json','utf8'));
 const row=matrix.rows.find(r=>r.id===original.matrix_id),locale=locales.find(l=>l.code==='en');
 const revised={...original,title:'Travel insurance for motorbike riding in Vietnam',meta_description:'Questions about motorcycle cover, policy exclusions and the documents to check with your insurer before riding in Vietnam.'};
 const before=renderArticle(original,locale,row,matrix);
 const after=renderArticle(revised,locale,row,matrix,null,undefined,original.meta_description);
 assert.equal(after.split('</head>')[1],before.split('</head>')[1]);
 assert.ok(after.includes('<title>'+revised.title+'</title>'));
 assert.ok(after.includes('content="'+revised.meta_description+'"'));
 assert.notEqual(renderArticle(revised,locale,row,matrix).split('</head>')[1],before.split('</head>')[1]);
});

test('generator uses persisted original lead, falls back for untouched articles and refuses corrupt lead',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'article-leads-'));
 try{
  const matrix=JSON.parse(fs.readFileSync('data/seo/master-matrix.json','utf8'));
  const locales=JSON.parse(fs.readFileSync('content/locales.json','utf8'));
  const packet=JSON.parse(fs.readFileSync('content/articles/EN-S11.json','utf8'));
  fs.mkdirSync(path.join(root,'content/articles'),{recursive:true});
  fs.mkdirSync(path.join(root,'approvals'),{recursive:true});
  fs.copyFileSync(packet.publication.policy,path.join(root,packet.publication.policy));
  const file=path.join(root,'content/articles/EN-S11.json');
  fs.writeFileSync(file,JSON.stringify(packet));
  const target=packet.proposed_url.slice(1)+'index.html';
  const before=generateApprovedArticles(root,matrix,locales)[target];
  const revised={...packet,meta_description:'Check your travel insurance wording for motorbike riding in Vietnam, including exclusions, documents, medical assistance and the questions to ask.'};
  fs.writeFileSync(file,JSON.stringify(revised));
  fs.writeFileSync(path.join(root,'content/article-leads.json'),JSON.stringify({version:1,leads:{[packet.matrix_id]:packet.meta_description}}));
  const after=generateApprovedArticles(root,matrix,locales)[target];
  assert.equal(after.split('</head>')[1],before.split('</head>')[1]);
  fs.writeFileSync(path.join(root,'content/article-leads.json'),JSON.stringify({version:1,leads:{[packet.matrix_id]:''}}));
  assert.throws(()=>generateApprovedArticles(root,matrix,locales),/Invalid published lead/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

#!/usr/bin/env node
/**
 * Markdown with JSON frontmatter to canonical article JSON packet; no YAML package/API.
 * Converts only private drafts; never edits published pages or production Matrix.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
export function parseMarkdownPacket(source){
 const text=String(source||"").replace(/^\uFEFF/,"").replace(/\r\n/g,"\n");
 const m=text.match(/^---\n([\s\S]*?)\n---\n([\s\S]+)$/);
 if(!m)throw Error("Markdown requires --- JSON frontmatter --- then substantive Markdown");
 let meta;
 try{meta=JSON.parse(m[1]);}catch(e){throw Error("Frontmatter must be strict JSON (no YAML aliases): "+e.message);}
 if(!meta||Array.isArray(meta)||typeof meta!=="object")throw Error("Frontmatter must be a JSON object");
 if("body_markdown" in meta)throw Error("body_markdown must come from the Markdown body, not frontmatter");
 const body=m[2].trim();
 if(!body||body.length<200)throw Error("Markdown body is too short");
 return {...meta,body_markdown:body};
}
function safePrivateFile(file,ext){
 if(!file||typeof file!=="string"||path.isAbsolute(file)||file.split(/[\\/]/).includes(".."))throw Error("Unsafe path");
 if(!file.startsWith("private-drafts/")||!file.endsWith(ext))throw Error("Only gitignored private-drafts/*"+ext+" allowed");
 const dest=path.resolve(ROOT,file);
 if(!dest.startsWith(path.join(ROOT,"private-drafts")+path.sep))throw Error("Path escapes private-drafts");
 return dest;
}
function run(){
 const args=process.argv.slice(2),at=k=>{const i=args.indexOf(k);return i<0?null:args[i+1]};
 const input=safePrivateFile(at("--file"),".md");
 const packet=parseMarkdownPacket(fs.readFileSync(input,"utf8"));
 const allowed=["matrix_id","locale","proposed_url","title","meta_description","h1","body_markdown","sources","serp_intent_checked","facts_reviewed_by_human","editorial_notes","cover_image","cover_alt","image_credit","writer_session"];
 const extraneous=Object.keys(packet).filter(k=>!allowed.includes(k));
 if(extraneous.length)throw Error("Unknown packet fields: "+extraneous.join(","));
 if(!packet.matrix_id||!packet.locale||!packet.proposed_url)throw Error("Missing Matrix ID, locale or proposed URL");
 const summary={mode:args.includes("--write")?"PRIVATE_CONVERSION_ONLY":"DRY_RUN",id:packet.matrix_id,locale:packet.locale,output_can_publish:false,body_characters:packet.body_markdown.length,review_flags:{facts_reviewed_by_human:packet.facts_reviewed_by_human,serp_intent_checked:packet.serp_intent_checked}};
 if(args.includes("--write")){
  const output=safePrivateFile(at("--out"),".json");
  if(fs.existsSync(output))throw Error("Refusing to overwrite existing JSON packet");
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(packet,null,2)+"\n",{flag:"wx"});
  summary.output=at("--out");
 }
 console.log(JSON.stringify(summary,null,2));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{run()}catch(e){console.error("MARKDOWN_IMPORT_REFUSED "+e.message);process.exitCode=1;}
}

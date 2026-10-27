/**
 * Auto Publisher — deterministic eligibility core (no I/O, no network, no AI).
 *
 * SUBMITTED draft (exact SHA-256 from the claims ledger)
 *  → G1 draft QA (strict fact guard, structure, links, sources)
 *  → G2 Matrix & parent (IDEA row, new URL, PUBLISHED parent, not protected)
 *  → G3 sensitivity & evidence (LEGAL/SAFETY/PRICE topics and money amounts
 *       must cite declared dated evidence and legal/safety claims must cite an official source. No Human Review gate.
 *  → G4 editorial heuristics (language, repetition, keyword stuffing, depth)
 *  → G5 duplicate content L6 drafts / L7 published (shingle similarity)
 *  → Automated QA only: no separate AI reviewer is needed for publication
 *  → G7 stage caps (PILOT 2 → RAMP 10 → CONTINUOUS per locale)
 * → APPROVED_BY_POLICY | BLOCKED | REJECTED (repair) | WAIT_PARENT.
 * Publication itself, build gates, deployment and live QA run in the CLI.
 */
import {checkArticle,validatePublicationRecord,STANDING_POLICY_PATH} from "./articles.mjs";
import {extractAmounts} from "./seo/fact-guard-core.mjs";
export {validatePublicationRecord,STANDING_POLICY_PATH};

const HEX64=/^[0-9a-f]{64}$/,HEX40=/^[0-9a-f]{40}$/,DATE=/^\d{4}-\d{2}-\d{2}$/;
// Official/primary publishers accepted as evidence for legal & safety statements.
const OFFICIAL=[/(^|\.)gov\.vn$/,/(^|\.)chinhphu\.vn$/,/(^|\.)mps\.gov\.vn$/,/(^|\.)gov\.uk$/,/(^|\.)gov$/,/(^|\.)gov\.au$/,/(^|\.)go\.jp$/,
 /(^|\.)go\.kr$/,/(^|\.)gouv\.fr$/,/(^|\.)diplomatie\.gouv\.fr$/,/(^|\.)gob\.es$/,/(^|\.)exteriores\.gob\.es$/,/(^|\.)dgt\.es$/,
 /(^|\.)nederlandwereldwijd\.nl$/,/(^|\.)rijksoverheid\.nl$/,/(^|\.)auswaertiges-amt\.de$/,/(^|\.)bund\.de$/,/(^|\.)service-bw\.de$/,
 /(^|\.)gov\.pt$/,/(^|\.)imt-ip\.pt$/,/(^|\.)gov\.br$/,/(^|\.)detran\.[a-z]{2}\.gov\.br$/,/(^|\.)treaties\.un\.org$/,/(^|\.)gov\.cn$/,
 /(^|\.)europa\.eu$/,/(^|\.)service-public\.(?:fr|gouv\.fr)$/,
 // Statute-text databases that reproduce the official Vietnamese legal texts verbatim.
 /(^|\.)luatvietnam\.vn$/,/(^|\.)thuvienphapluat\.vn$/];
export const isOfficial=url=>{try{const h=new URL(url).hostname.toLowerCase();return OFFICIAL.some(r=>r.test(h));}catch{return false;}};
// Hard legal claims only: a statute/article reference, a penalty, or a licence-class threshold.
// General advice ("check your licence category") is not a legal claim and is not flagged.
const LAW_REF=/(?:\b\d{1,3}\/\d{4}\/(?:QH\d+|NĐ-CP|ND-CP|TT-B[A-ZĐ]+)\b|\b(?:article|artikel|art\.|artículo|artigo|điều|khoản)\s*\d+|제\s*\d+\s*조|第\s*\d+\s*条)/iu;
const PENALTY={
 en:/\b(?:fine[sd]?|penalt\w*|prison|jail|imprison\w*|criminal|arrest\w*|illegal)\b/i,
 vi:/(?:phạt tiền|bị phạt|mức phạt|phạt tù|truy cứu|tước giấy phép|trái phép)/i,
 de:/(?:bußgeld|geldstrafe|haftstrafe|freiheitsstrafe|strafbar|illegal)/i,
 fr:/(?:amende|prison|pénal|illégal|emprisonnement)/i,
 es:/(?:multa|prisión|sanci[oó]n|ilegal|arresto|detención)/i,
 nl:/(?:boete|gevangenis|strafbaar|illegaal|celstraf)/i,
 pt:/(?:multa|prisão|ilegal|pena de|detenção)/i,
 zh:/(?:罚款|拘留|刑事|违法|判刑|监禁)/,
 ko:/(?:벌금|징역|처벌|불법|구속)/,
 ja:/(?:罰金|懲役|罰則|違法|逮捕|無免許運転)/
};
const LICENCE={
 en:/licen[cs]e|permit/i,vi:/bằng|giấy phép/i,de:/führerschein|fahrerlaubnis|klasse/i,fr:/permis/i,es:/permiso|carné/i,
 nl:/rijbewijs|categorie/i,pt:/carta|habilitação|categoria/i,zh:/驾照|驾驶证|执照/,ko:/면허/,ja:/免許/
};
const THRESHOLD=/\d+\s*(?:cm³|cm3|cc|kw)\b|\d+\s*(?:cm³|cc|kW)/i;
const isLegalClaim=(p,loc)=>LAW_REF.test(p)||(PENALTY[loc]||PENALTY.en).test(p)||((LICENCE[loc]||LICENCE.en).test(p)&&THRESHOLD.test(p));
const MONEY=/\d[\d.,\s]*(?:k\b|vnd\b|vnđ|đồng|\bđ\b|usd\b|us\$|\$|€|eur\b|円|元|원|ドン|동|£)/iu;
const STOP={
 en:["the","and","you","for","with","that","are","your"],de:["der","die","und","das","nicht","mit","sie","ist"],
 fr:["les","des","et","vous","une","pour","dans","est"],es:["los","las","que","para","una","con","del","por"],
 nl:["het","een","van","en","je","niet","met","voor"],pt:["os","as","que","para","uma","com","não","do"],
 vi:["và","của","có","không","là","cho","khi","bạn"]
};
const SCRIPT={zh:/[一-鿿]/g,ja:/[぀-ヿ一-鿿]/g,ko:/[가-힯]/g};
const LINK=/\[[^\]]*\]\(([^)\s]+)\)/g;
const ANCHOR=/\[([^\]]*)\]\([^)\s]+\)/g; // keep visible anchor text, drop the URL

export function paragraphs(md){
 const out=[];let buf=[];
 for(const raw of String(md).split("\n")){
  const l=raw.trim();
  if(!l||/^#{2,3}\s/.test(l)){if(buf.length)out.push(buf.join(" "));buf=[];continue;}
  if(/^[-*]\s+/.test(l)||/^\d+\.\s+/.test(l)){if(buf.length)out.push(buf.join(" "));buf=[];out.push(l);continue;}
  buf.push(l);
 }
 if(buf.length)out.push(buf.join(" "));
 return out;
}
/** Topic class from the cluster plus paragraph-level legal/safety/price detection and evidence. */
export function classify(packet,row,policy){
 const topicClass=policy?.sensitivity?.clusters?.[row?.cluster]||policy?.sensitivity?.default||"STANDARD";
 const unsupported=[],uncitedMoney=[];
 const declared=new Set((packet.sources||[]).filter(s=>/^https:\/\//.test(s.url||"")&&DATE.test(s.checked_on||"")).map(s=>s.url));
 let sensitive=0,money=0,officialCited=0,officialListed=0;
 for(const p of paragraphs(packet.body_markdown)){
  const links=[...p.matchAll(LINK)].map(m=>m[1]);
  const official=links.some(isOfficial);
  if(links.some(u=>isOfficial(u)&&declared.has(u)))officialListed++;
  if(extractAmounts(p,packet.locale).length){
   money++;
   if(!links.some(u=>declared.has(u)))uncitedMoney.push(p.replace(ANCHOR,"$1").slice(0,140));
  }
  if(isLegalClaim(p,packet.locale)){
   sensitive++;
   if(official)officialCited++;
   else unsupported.push(p.replace(ANCHOR,"$1").slice(0,140));
  }
 }
 return {topicClass,sensitive_paragraphs:sensitive,official_cited:officialCited,official_listed:officialListed,
  unsupported,money_paragraphs:money,uncited_money:uncitedMoney};
}
export function editorial(packet,row){
 const issues=[],warnings=[],body=String(packet.body_markdown||""),loc=packet.locale;
 const text=body.replace(ANCHOR,"$1").replace(/[#*>`_-]/g," ");
 if(SCRIPT[loc]){
  const letters=(text.match(/\p{L}/gu)||[]).length,native=(text.match(SCRIPT[loc])||[]).length;
  if(!letters||native/letters<0.6)issues.push("E1 language: body is not predominantly "+loc+" script");
 }else{
  const words=text.toLocaleLowerCase(loc).split(/[^\p{L}]+/u).filter(Boolean);
  const score=c=>words.filter(w=>STOP[c].includes(w)).length/Math.max(1,words.length);
  const own=score(loc),best=Object.keys(STOP).sort((a,b)=>score(b)-score(a))[0];
  if(own<0.03||best!==loc)issues.push("E1 language: function words suggest "+best+" rather than "+loc);
 }
 const paras=paragraphs(body).map(p=>p.toLocaleLowerCase(loc).replace(/\s+/g," ").trim()).filter(p=>p.length>60);
 if(new Set(paras).size!==paras.length)issues.push("E2 repetition: duplicated paragraph");
 const toks=(SCRIPT[loc]?[...text.replace(/\s+/g,"")]:text.toLocaleLowerCase(loc).split(/\s+/u)).filter(Boolean);
 const grams=[];for(let i=0;i+3<=toks.length;i++)grams.push(toks.slice(i,i+3).join(" "));
 const uniq=grams.length?new Set(grams).size/grams.length:1;
 if(uniq<(SCRIPT[loc]?0.35:0.6))issues.push("E3 repetition: low lexical variety "+uniq.toFixed(2));
 const q=String(row?.primary_query||"").toLocaleLowerCase(loc).trim();
 if(q.length>=8){
  const hits=body.toLocaleLowerCase(loc).split(q).length-1;
  if(hits>6)issues.push("E4 keyword stuffing: exact primary query repeated "+hits+" times");
 }
 if((body.match(/^##\s+\S/gm)||[]).length<4)issues.push("E5 depth: needs at least four H2 sections");
 if(!/\]\(\/[a-z]{2}\/(?:checklist\/)?\)/.test(body))issues.push("E6 internal links: link to the locale Pillar or checklist in context");
 if((body.match(/\]\(https:\/\//g)||[]).length<2)warnings.push("E7 few inline citations");
 return {passed:!issues.length,issues,warnings,lexical_variety:+uniq.toFixed(2)};
}
/** L6/L7 content similarity: word 5-gram (Latin) or char 8-gram (CJK) shingle Jaccard. */
export function shingles(text,locale){
 const clean=String(text).replace(ANCHOR,"$1").toLocaleLowerCase(locale);
 const out=new Set();
 if(SCRIPT[locale]){const c=[...clean.replace(/[\s\p{P}]+/gu,"")];for(let i=0;i+8<=c.length;i++)out.add(c.slice(i,i+8).join(""));}
 else{const w=clean.split(/[^\p{L}\p{N}]+/u).filter(Boolean);for(let i=0;i+5<=w.length;i++)out.add(w.slice(i,i+5).join(" "));}
 return out;
}
export function similarity(a,b){
 if(!a.size||!b.size)return 0;
 const [s,l]=a.size<b.size?[a,b]:[b,a];let i=0;for(const x of s)if(l.has(x))i++;
 return i/(a.size+b.size-i);
}
export function contentDuplicates(packet,corpus,{fail=0.45,warn=0.3}={}){
 const mine=shingles(packet.body_markdown,packet.locale),hits=[];
 for(const o of corpus){
  if(o.id===packet.matrix_id||o.locale!==packet.locale)continue;
  const s=similarity(mine,o.shingles||shingles(o.body_markdown,o.locale));
  if(s>=warn)hits.push({with:o.id,kind:o.kind,score:+s.toFixed(3),level:s>=fail?"FAIL":"WARN"});
 }
 return hits;
}
export const REVIEW_CHECKS=["native_fluency","search_intent","unique_value","factual_accuracy","structure","internal_links","no_duplication","no_fabricated_business_facts"];
/** Review files are per draft hash, so a REVISE on version 1 never blocks or approves version 2. */
export const reviewFile=(id,sha)=>"factory/editorial-reviews/"+id+"."+String(sha||"").slice(0,12)+".json";
export const REVIEW_FILE=/^([A-Z]{2}-[HS]\d{2,4})\.([0-9a-f]{12})\.json$/;
/** Independent AI editorial review record (PASS, REVISE or FAIL), bound to exact draft bytes. */
export function validateReview(review,{packet,claim,knownShas=null}){
 const e=[];
 if(review?.version!==1||review?.purpose!=="EDITORIAL_REVIEW")e.push("Review must be version 1, purpose EDITORIAL_REVIEW");
 if(review?.matrix_id!==packet.matrix_id)e.push("Review is for another article");
 const shas=knownShas||new Set([claim?.source_sha256]);
 if(!HEX64.test(review?.source_sha256||"")||!shas.has(review.source_sha256))e.push("Review hash does not match the immutable SUBMITTED draft");
 const r=review?.reviewer||{};
 if(typeof r.agent!=="string"||!r.agent.trim()||!/^[A-Za-z0-9_-]{3,80}$/.test(r.session||""))e.push("Reviewer agent and session required");
 if(r.session&&(r.session===packet.writer_session||r.session===claim?.session))e.push("Reviewer must be independent of the writing session");
 if(r.human===true)e.push("Automated reviews must not claim to be human");
 if(!DATE.test(review?.reviewed_on||""))e.push("reviewed_on must be YYYY-MM-DD");
 if(!["PASS","REVISE","FAIL"].includes(review?.verdict))e.push("Review verdict must be PASS, REVISE or FAIL");
 for(const k of REVIEW_CHECKS)if(!["PASS","FAIL"].includes(review?.checks?.[k]))e.push("Review check "+k+" must be PASS or FAIL");
 if(review?.verdict==="PASS"&&REVIEW_CHECKS.some(k=>review?.checks?.[k]!=="PASS"))e.push("A PASS verdict needs every check PASS");
 if(review?.issues!==undefined&&(!Array.isArray(review.issues)||review.issues.some(x=>typeof x!=="string")))e.push("issues must be a list of strings");
 if(review?.verdict!=="PASS"&&!(review?.issues||[]).length)e.push("REVISE/FAIL reviews must list the issues to fix");
 if(String(review?.notes||"").trim().length<80)e.push("Review notes need ≥80 chars of concrete findings");
 if(!Array.isArray(review?.sources_checked)||review.sources_checked.length<1)e.push("List the sources the reviewer actually checked");
 return e;
}
export const reviewApproves=r=>r?.verdict==="PASS"&&REVIEW_CHECKS.every(k=>r?.checks?.[k]==="PASS");
/**
 * Pure eligibility decision. `ctx`: {packet, claim, row, matrix, locales, policy, standing,
 * protectedIds:Set, corpus:[{id,locale,kind,body_markdown|shingles}], review, state}
 */
export function eligibility(ctx){
 const {packet,claim,row,matrix,locales,policy,standing,protectedIds=new Set(),corpus=[],review=null,state={}}=ctx;
 const gates=[],add=(gate,passed,detail="")=>gates.push({gate,passed,detail});
 // G1 draft QA in strict publisher mode; the two human flags are replaced by the policy record.
 const qa=checkArticle({...packet,serp_intent_checked:true,facts_reviewed_by_human:true},matrix,locales,{factMode:"strict",allowUnpublishedParentForDraft:true});
 add("G1_DRAFT_QA",qa.passed,qa.errors.join("; "));
 if(qa.words<900)add("G1_DEPTH",false,"Publication needs ≥900 words, has "+qa.words);
 // G2 Matrix, URL and parent
 const parent=matrix.rows.find(r=>r.id===row?.parent_id);
 add("G2_NEW_URL",row&&row.status!=="PUBLISHED"&&["HUB","SUPPORT"].includes(row.role),row?.status||"no row");
 add("G2_NOT_PROTECTED",!protectedIds.has(packet.matrix_id),"protected/held drafts follow their own editorial PR");
 add("G2_PARENT_PUBLISHED",parent?.status==="PUBLISHED",parent?parent.id+" is "+parent.status:"no parent");
 add("G2_IMMUTABLE_SOURCE",claim?.status==="SUBMITTED"&&HEX64.test(claim?.source_sha256||"")&&HEX40.test(claim?.source_commit||""),"ledger evidence");
 // G3 sensitivity and evidence
 const cls=classify(packet,row,policy);
 const sensitiveTopic=["LEGAL","SAFETY"].includes(cls.topicClass);
 add("G3_SENSITIVE_SOURCES",!sensitiveTopic||cls.official_listed>0,
  sensitiveTopic&&cls.official_listed===0?"LEGAL/SAFETY topic must cite at least one declared dated official source inline":"Declared official source paragraphs: "+cls.official_listed);
 add("G3_PRICE_EVIDENCE",cls.uncited_money.length===0,
  cls.uncited_money.length+" monetary paragraph(s) lack citations to dated declared HTTPS sources: "+cls.uncited_money.slice(0,2).join(" | "));
 add("G3_OFFICIAL_EVIDENCE",cls.unsupported.length===0,
  cls.unsupported.length?cls.unsupported.length+" hard legal statement(s) lack an inline official citation: "+cls.unsupported.slice(0,2).join(" | "):cls.official_cited+" official citations");
 // G4 editorial heuristics
 const ed=editorial(packet,row);
 add("G4_EDITORIAL",ed.passed,ed.issues.join("; "));
 // G5 content duplicates against other drafts (L6) and published articles (L7)
 const t=policy?.duplicates||{};
 const dups=contentDuplicates(packet,corpus,{fail:t.draft_shingle_fail??0.45,warn:t.draft_shingle_warn??0.3});
 add("G5_CONTENT_DUPLICATES",!dups.some(d=>d.level==="FAIL"),dups.map(d=>d.kind+":"+d.with+"="+d.score).join(", "));
 // Independent reviewer G6 retired by owner: G1-G5 + G7 and G3 source evidence gates remain mandatory.
 // G7 stage caps
 const stage=state.stage||"PILOT",caps=standing?.publication?.stages||{},cap=caps[stage]?.max_per_locale??2;
 const done=(state.published||[]).filter(p=>p.locale===packet.locale).length;
 add("G7_STAGE_CAP",done<cap,stage+" allows "+cap+" per locale, "+done+" used");
 const failed=gates.filter(g=>!g.passed).map(g=>g.gate);
 let decision="APPROVED_BY_POLICY";
 if(failed.some(g=>["G1_DRAFT_QA","G1_DEPTH","G4_EDITORIAL","G5_CONTENT_DUPLICATES"].includes(g)))decision="REJECTED";
 else if(failed.includes("G2_NEW_URL")||failed.includes("G2_IMMUTABLE_SOURCE")||failed.includes("G2_NOT_PROTECTED"))decision="BLOCKED";
 else if(failed.some(g=>g.startsWith("G3_")))decision="REJECTED"; // Source defects go to same-session Writer repair.
 else if(failed.includes("G2_PARENT_PUBLISHED"))decision="WAIT_PARENT";
 else if(failed.includes("G7_STAGE_CAP"))decision="WAIT_STAGE";
 return {id:packet.matrix_id,locale:packet.locale,role:row?.role,decision,failed,gates,classification:cls,editorial:ed,duplicates:dups,words:qa.words};
}
/**
 * No empty category goes live: a Hub with fewer than `min` PUBLISHED Supporting guides waits
 * (WAIT_PARENT, a hierarchy wait, not a text problem) until enough of its Supporting drafts are
 * ready, i.e. pass every gate except the parent. Runs after all drafts were evaluated so it can see
 * the children's decisions; the four original Hubs are long past the threshold.
 */
export function requireHubSupport(results,matrix,min=0){
 if(!(min>0))return results;
 const byId=new Map(matrix.rows.map(r=>[r.id,r])),published={},ready={};
 for(const r of matrix.rows)if(r.role==="SUPPORT"&&r.status==="PUBLISHED")published[r.parent_id]=(published[r.parent_id]||0)+1;
 for(const r of results){const p=byId.get(r.id)?.parent_id;if(r.decision==="WAIT_PARENT"&&byId.get(r.id)?.role==="SUPPORT")ready[p]=(ready[p]||0)+1;}
 for(const r of results){
  if(r.decision!=="APPROVED_BY_POLICY"||byId.get(r.id)?.role!=="HUB")continue;
  const have=(published[r.id]||0)+(ready[r.id]||0);
  if(have>=min)continue;
  r.decision="WAIT_PARENT";
  r.failed=[...(r.failed||[]),"G2_HUB_SUPPORT_READY"];
  r.gates=[...(r.gates||[]),{gate:"G2_HUB_SUPPORT_READY",passed:false,detail:(published[r.id]||0)+" published + "+(ready[r.id]||0)+" ready Supporting guide(s); a new Hub publishes with at least "+min}];
 }
 return results;
}
/** Publication record stored with the article JSON (honest: not human-reviewed). */
export function publicationRecord({claim,reviewSha,policyPath=STANDING_POLICY_PATH,now,stage}){
 return {mode:"STANDING_POLICY",policy:policyPath,stage,source_commit:claim.source_commit,source_sha256:claim.source_sha256,
  writer:claim.writer,writer_session:claim.session,qa_mode:reviewSha?"INDEPENDENT_REVIEW":"AUTOMATED_G1_G5_G7",review_sha256:reviewSha||null,approved_at:now,
  human_review:false,serp_validated:false};
}
/** Stage advancement after clean live QA runs; any failure pauses and resets the counter. */
export function nextStage(state,standing){
 const stages=standing?.publication?.stages||{};
 const s=state.stage||"PILOT",order=["PILOT","RAMP","CONTINUOUS"],need=stages[s]?.advance_after_clean_runs;
 if(state.paused||!need||(state.clean_runs||0)<need)return s;
 return order[Math.min(order.indexOf(s)+1,order.length-1)];
}

/**
 * Live QA states of a publication: PENDING (committed, not yet verified), PASS,
 * FAIL (production served something wrong) or INCONCLUSIVE (QA tool or network
 * could not decide; production untouched). PENDING and INCONCLUSIVE are unverified:
 * they block new staging and the queue drain until a re-check records a result.
 */
export const UNVERIFIED_LIVE=new Set(["PENDING","INCONCLUSIVE"]);
export const unverifiedLive=state=>(state?.published||[]).filter(p=>UNVERIFIED_LIVE.has(p.live_qa)).map(p=>p.id);

/**
 * Pure queue-drain decision. Every cycle publishes <=2 articles in a separate
 * GitHub Actions run, with deployment + live QA required before redispatch.
 * An empty/held/paused/unverified queue never generates a new run.
 */
export function drainDecision({state={},eligible=[]}={}){
 const outstanding=unverifiedLive(state);
 if(state.paused)return {continue:false,reason:"PAUSED",ready:eligible.length,next_ids:[]};
 if(outstanding.length)return {continue:false,reason:"LIVE_QA_PENDING",ready:eligible.length,next_ids:[],outstanding};
 const next_ids=eligible.map(x=>typeof x==="string"?x:x.id).filter(Boolean).slice(0,2);
 return {continue:next_ids.length>0,reason:next_ids.length?"NEXT_PAIR_READY":"QUEUE_DRAINED_OR_HELD",ready:eligible.length,next_ids};
}

/**
 * Whether a run may stage new articles: never while paused, and never while an
 * earlier publication is unverified (the run re-checks those instead).
 */
export function publishGate(state={}){
 const recover=unverifiedLive(state);
 if(recover.length)return {allowed:false,reason:"LIVE_QA_RECOVERY",recover};
 if(state.paused)return {allowed:false,reason:"PAUSED",recover:[]};
 return {allowed:true,reason:"OPEN",recover:[]};
}

/**
 * Pick ≤max APPROVED_BY_POLICY results: Hubs first, then Matrix priority, then ID,
 * within the stage's per-locale cap (published entries count toward the cap).
 * A failing article never blocks the others: only eligible results are considered.
 */
export function selectForPublication(results,{state={},standing,max=2,only=null}={}){
 const ok=results.filter(r=>r.decision==="APPROVED_BY_POLICY"&&(!only||only.includes(r.id)));
 ok.sort((a,b)=>(a.role==="HUB"?0:1)-(b.role==="HUB"?0:1)||(a.priority??99)-(b.priority??99)||a.id.localeCompare(b.id));
 const cap=standing?.publication?.stages?.[state.stage||"PILOT"]?.max_per_locale??2,used={},chosen=[];
 for(const p of state.published||[])used[p.locale]=(used[p.locale]||0)+1;
 for(const r of ok){
  if(chosen.length>=max)break;
  if((used[r.locale]||0)>=cap)continue;
  used[r.locale]=(used[r.locale]||0)+1;chosen.push(r);
 }
 return chosen;
}

/**
 * Operator controls (pure). Every action needs a reason; resume needs an explicit
 * confirmation. record-failure is used only after the publish commit was reverted.
 */
export function applyControl(state,cmd,{reason="",confirmed=false,ids=[],now}){
 if(!["pause","resume","record-failure"].includes(cmd))throw Error("Unknown publisher control "+cmd);
 if(String(reason||"").trim().length<12)throw Error(cmd+" needs a reason ≥12 chars");
 if(cmd==="resume"&&confirmed!=="true"&&confirmed!==true)throw Error("resume needs --confirmed true");
 const st=structuredClone(state||{});
 st.published=st.published||[];st.runs=st.runs||[];
 if(cmd==="record-failure"){
  st.paused=true;st.pause_reason="Reverted "+now+": "+reason;st.clean_runs=0;
  for(const p of st.published)if(ids.includes(p.id))p.live_qa="REVERTED";
  st.published=st.published.filter(p=>p.live_qa!=="REVERTED");
 }else if(cmd==="pause"){st.paused=true;st.pause_reason=reason;}
 else {st.paused=false;st.pause_reason=null;}
 st.runs.push({at:now,ids,result:cmd.toUpperCase()+": "+reason});
 return st;
}

/**
 * Record a live QA verdict for `ids` (pure). PASS on a fresh publication counts as a
 * clean run and may advance the stage; a recovery re-check (`recovery:true`) only
 * fixes the verification status. FAIL and INCONCLUSIVE pause publication; resuming
 * always needs a confirmed operator dispatch. A recovery re-check that confirms an
 * existing INCONCLUSIVE leaves the state untouched, so hourly re-checks add no churn.
 */
export function recordLiveQA(state,{ids,verdict,issues=[],commit=null,seconds=0,now,standing,recovery=false}){
 if(!["PASS","FAIL","INCONCLUSIVE"].includes(verdict))throw Error("Unknown live QA verdict "+verdict);
 const st=structuredClone(state||{});
 st.published=st.published||[];st.runs=st.runs||[];
 const touched=st.published.filter(p=>ids.includes(p.id)&&UNVERIFIED_LIVE.has(p.live_qa));
 if(recovery&&verdict==="INCONCLUSIVE"&&touched.length&&touched.every(p=>p.live_qa==="INCONCLUSIVE"))return state;
 for(const p of touched){p.live_qa=verdict;p.live_qa_at=now;}
 const summary=issues.slice(0,5).map(i=>(i.scope?i.scope+": ":"")+(i.detail??i)).join(" | ");
 if(verdict==="PASS"){
  if(recovery)st.runs.push({at:now,ids,result:"LIVE_QA_RECOVERED_PASS"});
  else{
   st.clean_runs=(st.clean_runs||0)+1;
   st.last_successful_deployment={at:now,ids,commit,live_seconds:seconds};
   st.runs.push({at:now,ids,result:"LIVE_QA_PASS"});
   const ns=nextStage(st,standing);
   if(ns!==st.stage){st.runs.push({at:now,ids:[],result:"STAGE_ADVANCED "+st.stage+"→"+ns});st.stage=ns;st.clean_runs=0;}
  }
 }else{
  st.paused=true;st.clean_runs=0;
  st.pause_reason=(verdict==="FAIL"?"Live QA failed ":"Live QA inconclusive (QA tool or network; production untouched, no rollback) ")+now+": "+summary;
  st.runs.push({at:now,ids,result:(recovery?"RECOVERY_":"")+"LIVE_QA_"+verdict});
 }
 st.runs=st.runs.slice(-200);
 return st;
}


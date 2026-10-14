/**
 * Fact guard — anti-fabrication QA for prices, NAP, hours and business schema.
 * Pure functions plus a lazy loader for data/business/reference.json.
 *
 * Rules
 *  BRAND  Any paragraph that names Nguyễn Tú (brand, aliases, phone or street)
 *         must use reference amounts, phone, address and hours exactly, never a
 *         foreign-currency conversion and never "no deposit / free delivery /
 *         24h" style claims. Always FAIL.
 *  ADDR   In a Nguyễn Tú context a house number on Nguyễn Văn Cừ must be 112. FAIL.
 *  SRC    Any other currency amount or Vietnamese phone needs an inline source
 *         (markdown link, URL or legal instrument number) in the same paragraph.
 *         FAIL in strict mode (publisher, site text), WARN in Writer QA.
 *  3RD    Sourced third-party rental prices → WARN for dated editorial review.
 *  SCHEMA LocalBusiness-type JSON-LD or NAP on pages needs the owner's
 *         publication flags and must match the reference.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
export const REFERENCE_PATH="data/business/reference.json";
export const LOCALIZED_PATH="data/business/reference.localized.json";
let cached;
export function loadReference(root=ROOT){
 if(root===ROOT&&cached!==undefined)return cached;
 const p=path.join(root,REFERENCE_PATH);
 const ref=fs.existsSync(p)?JSON.parse(fs.readFileSync(p,"utf8")):null;
 if(root===ROOT)cached=ref;
 return ref;
}

const fold=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").normalize("NFKC").toLowerCase();
const MULT_WORDS="(?:(?:nghìn|ngàn|triệu|tr|millionen|millions|million|millones|millón|miljoen|milhões|milhão|mio\\.?|k)(?![\\p{L}])|百万|万|만|千)";
const VND_UNIT="(?:vnd|vnđ|₫|đồng|đ(?![a-zà-ỹ])|dong(?![a-z])|ベトナムドン|ドン|越南盾|盾|동)";
const FOREIGN_UNIT="(?:usd|us\\$|\\$|eur(?:o|os)?(?![a-z])|€|円|yen|¥|人民币|元|rmb|원|krw|won(?![a-z]))";
const RANGE_SEP="\\s*(?:–|—|-|~|～|〜|to|đến|tới|bis|à|a|tot|até|至|에서)\\s*";
// Thousands separators must be consistent inside one number (backreference);
// a plain space only groups digits when a unit, multiplier or range follows.
const NUM=g=>"(?<"+g+">\\d{1,3}(?:(?<"+g+"s>[.,\\u00a0\\u202f])\\d{3})(?:\\k<"+g+"s>\\d{3})*|\\d{1,3}(?: \\d{3})+(?=\\s?(?:"+VND_UNIT+"|"+MULT_WORDS+"|"+RANGE_SEP+"\\d))|\\d+(?:[.,]\\d+)?)";
const MULT=g=>"(?<"+g+">"+MULT_WORDS+")?";
const AMOUNT=new RegExp("(?:(?<prefix>vnd|₫|us\\$|usd|\\$|€|eur)\\s?)?"+NUM("n1")+"\\s?"+MULT("m1")+"(?:"+RANGE_SEP+NUM("n2")+"\\s?"+MULT("m2")+")?(?:\\s(?:de|of|di)(?=\\s))?\\s?(?<suffix>"+VND_UNIT+"|"+FOREIGN_UNIT+")?","giu");
const PHONE=/(?<![\d.,/])(?:\+84|0)(?:[\s.-]?\d){8,10}(?![\d])/g;
const TIME_RANGE=/(?<!\d)(\d{1,2})(?:[:h.](\d{2}))?\s*(?:h|giờ|時|时|시)?\s*(?:–|—|-|~|～|〜|to|đến|bis|à|a|tot|até|至)\s*(\d{1,2})(?:[:h.](\d{2}))?(?!\d)/gu;
const CITATION=/\]\(https:\/\/[^)]+\)|https:\/\/\S+|(?:nghị định|luật|thông tư|decree|law|dekret|gesetz|décret|loi|decreto|ley|besluit|wet|decreto-lei|议定|法令|法律|시행령|법률|議定|法)\s*(?:số|no\.?|nr\.?|n°|第)?\s*\d+\s*\/\s*\d{4}/iu;
const HOUR_WORDS=["giờ hoạt động","giờ mở cửa","mở cửa","giờ làm việc","opening hours","open from","opens","öffnungszeiten","geöffnet","horaires","ouvert","horario","abierto","openingstijden","geopend","horário","aberto","营业时间","营业","영업시간","영업","営業時間","営業"];
const RENTAL_WORDS=["thuê","cọc","rent","rental","deposit","miete","mieten","kaution","location","louer","caution","alquiler","depósito","huur","borg","aluguel","aluguer","caução","租","押金","렌트","대여","보증금","レンタル","保証金"];
const CONTRADICTIONS=["không cần cọc","không cọc","miễn cọc","không đặt cọc","no deposit","without a deposit","deposit-free","zero deposit","ohne kaution","keine kaution","kautionsfrei","sans caution","pas de caution","sin depósito","sin fianza","zonder borg","geen borg","sem caução","sem depósito","免押金","无需押金","不用押金","보증금 없이","보증금 없음","무보증","保証金なし","保証金不要","デポジット不要",
 "miễn phí giao","giao xe miễn phí","free ship","free delivery","delivered free","kostenlose zustellung","gratis zustellung","kostenlose lieferung","livraison gratuite","entrega gratuita","entrega gratis","gratis bezorging","gratis bezorgd","entrega grátis","免费送车","免费配送","무료 배달","무료 배송","配達無料","無料配達","送料無料",
 "24/7","24 giờ","24h/24","around the clock","rund um die uhr","24 stunden","24 heures sur 24","24 horas","24 uur","24小时","全天候","24시간","24時間"];
// Folded once: folding (NFD + NFKC) per paragraph × keyword dominated scans at thousands of pages.
const HOUR_FOLDED=HOUR_WORDS.map(fold),RENTAL_FOLDED=RENTAL_WORDS.map(fold),CONTRADICTIONS_FOLDED=CONTRADICTIONS.map(c=>[c,fold(c)]);
const BUSINESS_TYPES=new Set(["LocalBusiness","AutoRental","AutomotiveBusiness","Store","MotorcycleDealer","MotorcycleRepair","AutoDealer","RentalCarReservation","Place"]);
const BUSINESS_KEYS=["telephone","address","priceRange","openingHours","openingHoursSpecification","geo","hasMap","makesOffer","offers"];

function toNumber(raw){
 const s=String(raw).replace(/[   ]/g," ");
 if(/^\d{1,3}(?:[., ]\d{3})+$/.test(s))return Number(s.replace(/[., ]/g,""));
 return Number(s.replace(",","."));
}
function multiplier(m){
 if(!m)return 1;
 const x=m.toLowerCase();
 if(x==="k"||x==="nghìn"||x==="ngàn"||x==="千")return 1e3;
 if(x==="万"||x==="만")return 1e4;
 return 1e6;
}
/** Extract currency amounts from plain text. Bare numbers without a currency are ignored. */
export function extractAmounts(text,locale="en"){
 const out=[];
 for(const m of String(text).matchAll(AMOUNT)){
  const raw=m[0],{prefix,n1,m1,n2,m2,suffix}=m.groups;
  const unit=(suffix||prefix||"").toLowerCase();
  // Vietnamese "150k", "2–5 triệu", "500 nghìn" imply VND without a unit.
  const vndK=!unit&&locale==="vi"&&/^(?:k|nghìn|ngàn|triệu|tr)$/i.test(m2||m1||"");
  if(!unit&&!vndK)continue;
  const foreign=unit&&new RegExp("^"+FOREIGN_UNIT+"$","iu").test(unit)&&!/^(?:vnd|₫)$/i.test(unit);
  const k2=multiplier(m2),k1=m1?multiplier(m1):(n2?k2:1);
  const values=[Math.round(toNumber(n1)*k1)];
  if(n2)values.push(Math.round(toNumber(n2)*k2));
  if(values.some(v=>!Number.isFinite(v)||v<=0))continue;
  out.push({raw:raw.trim(),values,currency:foreign?"FOREIGN":"VND"});
 }
 return out;
}
export const extractPhones=text=>[...String(text).matchAll(PHONE)].map(m=>({raw:m[0],digits:m[0].replace(/\D/g,"").replace(/^84/,"0")})).filter(p=>p.digits.length>=10&&p.digits.length<=11);

export function allowedAmounts(ref){
 const set=new Set();
 const add=v=>{if(Number.isFinite(v))set.add(v);};
 const range=r=>{if(r&&typeof r==="object"){add(r.min);add(r.max);}else add(r);};
 for(const [k,v] of Object.entries(ref.price_summary||{})){if(k==="late_return")add(v.per_hour);else range(v);}
 for(const m of ref.model_prices||[]){add(m.daily);add(m.weekly);range(m.monthly);range(m.deposit);}
 for(const o of ref.other_known_amounts||[])add(o.value);
 for(const v of Object.values(ref.owner_stated||{}))add(v);
 return set;
}
export function brandTerms(ref){
 // A bare street name ("Nguyễn Văn Cừ" as a busy road) is not a brand mention; the full address is.
 const n=ref.address.street_number;
 return [ref.brand.canonical,ref.brand.short,...ref.brand.aliases,n+" "+ref.address.street,n+" "+ref.address.street_ascii,"nguyen tu"].map(fold).filter(Boolean);
}
const strip=text=>String(text).replace(/\]\((?:https?:)?[^)]*\)/g,"]").replace(/https?:\/\/\S+/g," ");
export function paragraphs(text){return String(text).split(/\n\s*\n|\r?\n(?=#{1,6}\s|[-*]\s)/).map(s=>s.trim()).filter(Boolean);}
/** Heading-delimited sections; a section that names the brand lets reference amounts appear in its other paragraphs. */
export function sections(text){return String(text).split(/\r?\n(?=#{1,6}\s)/).map(s=>s.trim()).filter(Boolean);}

/**
 * Check one text blob. mode "strict" (publisher/site) or "warn" (Writer drafts).
 * Returns [{level,code,message,excerpt}].
 */
export function scanText(text,{locale="en",mode="strict",ref=loadReference(),where=""}={}){
 const findings=[];
 if(!ref)return findings;
 const push=(level,code,message,excerpt)=>findings.push({level,code,message,where,excerpt:String(excerpt).slice(0,160)});
 const allowed=allowedAmounts(ref),terms=brandTerms(ref),refPhone=ref.phone.digits;
 const mentions=(t,folded=fold(t))=>terms.some(x=>folded.includes(x))||extractPhones(strip(t)).some(p=>p.digits===refPhone);
 for(const section of sections(text)){
 const sectionBrand=mentions(section);
 for(const para of paragraphs(section)){
  const folded=fold(para);
  const cited=CITATION.test(para);
  const body=strip(para);
  const phones=extractPhones(body);
  const brand=mentions(para,folded);
  if(brand)for(const m of body.matchAll(/(\d+[a-z]?)\s*(?:,\s*)?(?:đường|phố|street|str\.?)?\s*(nguyễn văn cừ|nguyen van cu)/giu)){
   if(m[1]!==ref.address.street_number)push("FAIL","ADDRESS_MISMATCH","Nguyễn Tú address must read "+ref.address.lines,m[0]);
  }
  for(const p of phones){
   if(p.digits===refPhone)continue;
   if(brand)push("FAIL","PHONE_MISMATCH","Phone in a Nguyễn Tú context must be "+ref.phone.display,p.raw);
   else if(!cited)push(mode==="strict"?"FAIL":"WARN","UNSOURCED_PHONE","Phone number without an inline source",p.raw);
  }
  for(const a of extractAmounts(body,locale)){
   if(brand){
    if(a.currency==="FOREIGN")push("FAIL","BRAND_FOREIGN_CURRENCY","Nguyễn Tú prices are VND only; do not convert",a.raw);
    else for(const v of a.values)if(!allowed.has(v))push("FAIL","BRAND_PRICE_MISMATCH",v+" VND is not in the Nguyễn Tú reference ("+REFERENCE_PATH+")",a.raw);
   }else if(sectionBrand&&a.currency==="VND"&&a.values.every(v=>allowed.has(v)))continue;
   else if(!cited)push(mode==="strict"?"FAIL":"WARN","UNSOURCED_AMOUNT","Currency amount without an inline source in the same paragraph",a.raw);
   else if(RENTAL_FOLDED.some(w=>folded.includes(w)))push("WARN","THIRD_PARTY_PRICE_REVIEW","Sourced third-party rental price: re-check date and source before publication",a.raw);
  }
  if(brand)for(const [c,fc] of CONTRADICTIONS_FOLDED)if(folded.includes(fc))push("FAIL","BRAND_CONTRADICTION","'"+c+"' contradicts the reference (deposit, delivery fee or hours)",para);
  if(sectionBrand){
   if(HOUR_FOLDED.some(w=>folded.includes(w)))for(const t of body.matchAll(TIME_RANGE)){
    const open=String(t[1]).padStart(2,"0")+":"+(t[2]||"00"),close=String(t[3]).padStart(2,"0")+":"+(t[4]||"00");
    if(open!==ref.hours.opens||close!==ref.hours.closes)push("FAIL","HOURS_MISMATCH","Nguyễn Tú hours are "+ref.hours.opens+"–"+ref.hours.closes,t[0]);
   }
  }
 }
 }
 return findings;
}

/** Article packet fields → findings (used by scripts/articles.mjs checkArticle). */
export function scanPacket(packet,mode="warn",ref=loadReference()){
 const fields=["title","meta_description","h1","body_markdown"];
 return fields.flatMap(f=>scanText(String(packet?.[f]??""),{locale:packet?.locale,mode,ref,where:f}));
}

const htmlText=html=>String(html).replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," ")
 .replace(/<h[1-6]\b[^>]*>/gi,"\n## ")
 .replace(/<\/(?:p|li|h[1-6]|td|th|summary|details|div|section|article|header|footer|nav|dd|dt|figcaption|blockquote)>/gi,"\n\n").replace(/<br\s*\/?>/gi,"\n")
 .replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/[ \t]+/g," ");
export function scanHtml(html,{locale,ref=loadReference(),where=""}={}){
 const plain=htmlText(html),findings=scanText(plain,{locale,mode:"strict",ref,where});
 if(!ref)return findings;
 const text=fold(plain),digits=String(html).replace(/[\s.\-()]/g,"");
 const shows=digits.includes(ref.phone.digits)||digits.includes(ref.phone.e164)||text.includes(fold(ref.address.street_number+" "+ref.address.street));
 if(shows&&ref.publication?.site_display_approved!==true)findings.push({level:"FAIL",code:"NAP_DISPLAY_NOT_APPROVED",where,message:"Page shows Nguyễn Tú phone/address but publication.site_display_approved is false",excerpt:""});
 for(const m of String(html).matchAll(/<script\s+type="application\/ld\+json"\s*>([\s\S]*?)<\/script>/gi)){
  let data;try{data=JSON.parse(m[1]);}catch{continue;}
  const nodes=[];const walk=n=>{if(Array.isArray(n))n.forEach(walk);else if(n&&typeof n==="object"){nodes.push(n);Object.values(n).forEach(walk);}};walk(data);
  for(const n of nodes){
   const types=[].concat(n["@type"]||[]);
   const business=types.some(t=>BUSINESS_TYPES.has(t))||BUSINESS_KEYS.some(k=>k in n);
   if(!business)continue;
   if(ref.publication?.business_schema_approved!==true){findings.push({level:"FAIL",code:"BUSINESS_SCHEMA_NOT_APPROVED",where,message:"JSON-LD with business/NAP properties ("+(types.join(",")||"untyped")+") requires publication.business_schema_approved",excerpt:""});continue;}
   const tel=String(n.telephone||"").replace(/\D/g,"").replace(/^84/,"0");
   if(n.telephone&&tel!==ref.phone.digits)findings.push({level:"FAIL",code:"SCHEMA_PHONE_MISMATCH",where,message:"telephone must be "+ref.phone.e164,excerpt:n.telephone});
   const street=typeof n.address==="object"?n.address?.streetAddress:n.address;
   if(street&&!fold(street).includes(fold(ref.address.street_number+" "+ref.address.street)))findings.push({level:"FAIL",code:"SCHEMA_ADDRESS_MISMATCH",where,message:"address must be "+ref.address.lines,excerpt:street});
  }
 }
 return findings;
}

/** Internal consistency of the reference itself. */
export function validateReference(ref){
 const errors=[],warnings=[];
 const e=m=>errors.push(m);
 if(!ref||ref.version!==1)return {errors:["Reference missing or wrong version"],warnings};
 if(!ref.brand?.canonical||!ref.address?.lines||!ref.address?.street_number||!ref.phone?.digits)e("Brand, address and phone are required");
 if(!/^0\d{9,10}$/.test(ref.phone.digits)||ref.phone.e164!=="+84"+ref.phone.digits.slice(1)||ref.phone.display.replace(/\D/g,"")!==ref.phone.digits)e("Phone display/digits/e164 disagree");
 if(!/^\d{2}:\d{2}$/.test(ref.hours?.opens||"")||!/^\d{2}:\d{2}$/.test(ref.hours?.closes||"")||ref.hours.opens>=ref.hours.closes)e("Hours must be HH:MM with opens < closes");
 const s=ref.price_summary||{};
 for(const k of ["daily","weekly","monthly","deposit","delivery"]){
  const r=s[k];
  if(!r||!Number.isInteger(r.min)||!Number.isInteger(r.max)||r.min<=0||r.min>r.max)e("price_summary."+k+" must be positive integers with min ≤ max");
 }
 if(!Number.isInteger(s.late_return?.per_hour)||!Number.isInteger(s.late_return?.full_day_after_hours))e("late_return needs per_hour and full_day_after_hours");
 else if(s.late_return.per_hour*s.late_return.full_day_after_hours>s.daily.min)e("Late fee × hours exceeds the cheapest daily rate; the extra-day rule would be contradictory");
 if(s.weekly.min<s.daily.min||s.weekly.max>7*s.daily.max)e("Weekly range is inconsistent with daily range");
 if(s.monthly.min<s.weekly.min||s.monthly.max>30*s.daily.max)e("Monthly range is inconsistent with weekly/daily ranges");
 const within=(v,r)=>v===null||v===undefined||(typeof v==="object"?v.min>=r.min&&v.max<=r.max&&v.min<=v.max:v>=r.min&&v<=r.max);
 for(const m of ref.model_prices||[]){
  if(!within(m.daily,s.daily)||!within(m.weekly,s.weekly)||!within(m.monthly,s.monthly)||!within(m.deposit,s.deposit))e("Model "+m.model+" falls outside the summary ranges");
  const mo=m.monthly&&typeof m.monthly==="object"?m.monthly.max:m.monthly;
  if(m.weekly&&m.weekly/7>m.daily)e("Model "+m.model+": weekly average per day exceeds daily rate");
  if(m.weekly&&mo&&mo/30>m.weekly/7)e("Model "+m.model+": monthly average per day exceeds weekly average");
 }
 for(const [k,v] of Object.entries(ref.owner_stated||{})){
  const m=(ref.model_prices||[]).find(x=>k.startsWith(x.model));
  if(!m||m.daily!==v)e("Owner statement '"+k+"' disagrees with model_prices");
 }
 for(const field of ["address","phone","hours"])if(!(ref.evidence||[]).some(x=>x.confirms?.includes(field)&&/^\d{4}-\d{2}-\d{2}$/.test(x.checked_on||"")))e("No dated evidence confirms "+field);
 for(const c of ref.conflicts||[])warnings.push("Known conflict "+c.id+" ("+c.status+"): "+c.field+" canonical "+c.canonical+" vs observed "+c.observed+" at "+c.where);
 return {errors,warnings};
}

const NUM_LOCALE={vi:"vi-VN",en:"en-US",de:"de-DE",fr:"fr-FR",es:"es-ES",nl:"nl-NL",pt:"pt-PT",zh:"zh-CN",ko:"ko-KR",ja:"ja-JP"};
const UNIT={vi:" đ",en:" VND",de:" VND",fr:" VND",es:" VND",nl:" VND",pt:" VND",zh:"越南盾",ko:"동",ja:"ドン"};
/** Deterministic 10-language rendering of the reference (never typed by hand). */
export function localizeReference(ref,locales){
 const out={version:1,generated_from:REFERENCE_PATH,note:"Generated by node scripts/seo/fact-guard.mjs --write. Writers copy these lines verbatim; never retype or convert amounts.",publication:ref.publication,locales:{}};
 for(const code of locales){
  const L=ref.labels[code];
  if(!L)throw Error("Missing reference labels for "+code);
  const nf=new Intl.NumberFormat(NUM_LOCALE[code]);
  const money=v=>nf.format(v)+UNIT[code];
  const range=r=>r.min===r.max?money(r.min):nf.format(r.min)+"–"+nf.format(r.max)+UNIT[code];
  const s=ref.price_summary;
  const model=m=>({model:m.model,daily:money(m.daily),weekly:m.weekly?money(m.weekly):null,monthly:m.monthly?range(m.monthly):null,deposit:range(m.deposit)});
  out.locales[code]={
   title:L.title.replace("{brand}",ref.brand.canonical),disclaimer:L.disclaimer,
   address:L.address+": "+ref.address.lines,phone:L.phone+": "+ref.phone.display,
   hours:L.hours+": "+ref.hours.opens+"–"+ref.hours.closes+" ("+L.every_day+")",
   daily:L.daily+": "+range(s.daily),weekly:L.weekly+": "+range(s.weekly),monthly:L.monthly+": "+range(s.monthly),
   deposit:L.deposit+": "+range(s.deposit)+" ("+L.by_model+")",delivery:L.delivery+": "+range(s.delivery)+" ("+L.by_location+")",
   late_return:L.late_return.replace("{per_hour}",money(s.late_return.per_hour)).replace("{hours}",String(s.late_return.full_day_after_hours)),
   longer:L.longer,models:(ref.model_prices||[]).map(model)
  };
 }
 return out;
}

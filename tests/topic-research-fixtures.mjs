/**
 * Shared test fixtures for the crash-safe research tooling. NEVER research data: these topics exist
 * only inside unit tests and throw-away temp repositories, and are never written to the real repo.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {loadTopicalMap} from "../scripts/seo/topical-authority-core.mjs";

export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
export const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
export const policy=read("data/seo/topic-factory/policy.json");
export const standing=read(policy.standing_policy);
/**
 * The world the synthetic topics are judged against: the live Matrix and topical map minus everything that real
 * research sessions have ingested (data/seo/topic-factory/research-log.json). Real research can legitimately
 * cover the same ground as a fixture topic; the tooling under test must not depend on what has been researched.
 */
const LOG="data/seo/topic-factory/research-log.json";
export const INGESTED=new Set((fs.existsSync(path.join(root,LOG))?read(LOG).batches||[]:[]).flatMap(b=>b.added||[]));
export function withoutResearchIntake({matrix,map=null,ledger=null,files=null}){
 const dropped=new Set(matrix.rows.filter(r=>INGESTED.has(r.topical_candidate_id)).map(r=>r.id));
 const out={matrix:{...matrix,rows:matrix.rows.filter(r=>!dropped.has(r.id))}};
 if(map){out.map=structuredClone(map);for(const l of Object.values(out.map.locales))l.proposals=l.proposals.filter(p=>!INGESTED.has(p.candidate_id));}
 if(files){out.files={};for(const [k,f] of Object.entries(files))out.files[k]={...f,proposals:(f.proposals||[]).filter(p=>!INGESTED.has(p.candidate_id))};}
 if(ledger)out.ledger={...ledger,claims:ledger.claims.filter(c=>!dropped.has(c.id))};
 return out;
}
const world=withoutResearchIntake({matrix:read("data/seo/master-matrix.json"),map:loadTopicalMap(root)});
export const matrix=world.matrix;
export const map=world.map;
export const frozen=read("data/seo/url-freeze.json").urls.map(u=>u.url);
export const hub=(locale,cluster)=>matrix.rows.find(r=>r.locale===locale&&r.role==="HUB"&&r.cluster===cluster).id;

const R={
 fcdo:{url:"https://www.gov.uk/foreign-travel-advice/vietnam/safety-and-security",title:"FCDO Vietnam safety and security"},
 smart:{url:"https://www.smartraveller.gov.au/destinations/asia/vietnam",title:"Smartraveller Vietnam"},
 state:{url:"https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories/vietnam-travel-advisory.html",title:"US State Department Vietnam advisory"},
 who:{url:"https://www.who.int/news-room/fact-sheets/detail/road-traffic-injuries",title:"WHO road traffic injuries fact sheet"},
 vn:{url:"https://vietnam.travel/things-to-do",title:"Vietnam Tourism things to do"},
 un:{url:"https://unece.org/transport/road-traffic-safety",title:"UNECE road traffic safety"}
};
const refs=(a,b,on="2026-10-15")=>[a,b].map(k=>({...R[k],checked_on:on}));

/** [slug, primary query, working title, intent rationale, content angle, placement, source pair] — EN, all different intents. */
const EN=[
 ["scooter-luggage-capacity-hanoi","how much luggage fits on a rental scooter","How Much Luggage Fits on a Rental Scooter in Vietnam",
  "Travellers carrying a backpack between cities ask whether a scooter can safely carry it before choosing a bike type.",
  "Practical load, rack and strap guidance tied to bike families, not a rental pitch.",["EN-H01-vehicle","vc-trip-fit"],["fcdo","smart"]],
 ["can-110cc-climb-mountain-passes","can a 110cc scooter climb mountain passes in northern vietnam","Can a 110cc Scooter Handle Northern Vietnam Mountain Passes?",
  "Riders planning a loop want to know whether a small engine copes with long climbs and pillion weight before they pick a model.",
  "Engine-size expectations per gradient and load, with signs that a bike is under-powered for the route.",["EN-H01-vehicle","vc-power"],["fcdo","who"]],
 ["manual-clutch-first-ride","what does the clutch lever do on a manual motorbike","What Does the Clutch Lever Do on a Manual Motorbike?",
  "Licensed drivers who only know cars need the clutch-and-gear mechanics explained before they try a manual bike.",
  "Plain-language mechanics of clutch, gear pedal and friction point with beginner mistakes to avoid.",["EN-H01-vehicle","vc-transmission"],["who","un"]],
 ["yamaha-sirius-or-honda-future","yamaha sirius or honda future for beginners","Yamaha Sirius or Honda Future: Which Suits a Beginner?",
  "Beginners comparing two common underbones need a side-by-side of handling, seat height and spares support.",
  "Neutral model comparison on riding ergonomics and parts availability, without prices or booking prompts.",["EN-H01-vehicle","vc-models"],["vn","smart"]],
 ["bike-size-for-tall-riders","which scooter suits a tall rider in vietnam","Which Scooter Suits a Tall Rider in Vietnam?",
  "Tall visitors worry about cramped legs and the seat height of small local scooters before choosing a model.",
  "Seat height, leg room and handlebar reach by bike family with a posture checklist.",["EN-H01-vehicle","vc-models"],["who","fcdo"]],
 ["weekly-rental-planning-guide","how to plan a one week motorbike rental in vietnam","How to Plan a One-Week Motorbike Rental in Vietnam",
  "Visitors staying for about a week ask how a rental period fits a route, fuel stops and a handover day.",
  "A day-by-day planning frame for week-long hires that explains what changes with the rental period.",["EN-H02-costs","rc-period"],["smart","vn"]],
 ["helmet-included-in-daily-rate","is a helmet included in a scooter rental","Is a Helmet Included in a Scooter Rental in Hanoi?",
  "Renters ask which safety extras normally come with a hire and which are optional add-ons they must request.",
  "Explains standard inclusions and optional extras so travellers know what to ask at handover.",["EN-H02-costs","rc-extras"],["who","fcdo"]],
 ["cash-or-card-deposit-scooter","cash or card deposit for a scooter hire","Cash or Card Deposit for a Scooter Hire: What to Expect",
  "Travellers who refuse to leave a passport want to understand which deposit methods exist and their risks.",
  "Compares deposit forms by risk and refund process, including what a written receipt must show.",["EN-H02-costs","rc-deposit"],["smart","state"]],
 ["eu-licence-on-vietnam-scooter","does vietnam accept an eu driving licence on a scooter","Does Vietnam Accept an EU Driving Licence on a Scooter?",
  "European licence holders need to know whether their card alone covers a motorbike in Vietnam.",
  "Licence categories, the permit question and the practical police-check scenario for EU holders.",["EN-H03-documents","dc-licence"],["state","un"]],
 ["rental-contract-clauses-to-read","rental contract clauses to read before signing","Rental Contract Clauses to Read Before You Sign",
  "Renters rarely read agreements and need to know which clauses decide who pays after damage or theft.",
  "A clause-by-clause reading guide covering liability, fuel, late return and breakdown handling.",["EN-H03-documents","dc-contract"],["fcdo","who"]],
 ["compulsory-motorbike-insurance-cover","what does compulsory motorbike insurance cover in vietnam","What Does Compulsory Motorbike Insurance Cover in Vietnam?",
  "Riders hear that insurance is mandatory and want to know what the basic policy actually pays for.",
  "Explains the limits of third-party cover and where private travel insurance has to fill the gap.",["EN-H03-documents","dc-insurance"],["un","smart"]],
 ["passport-copy-or-original-rental","passport copy or original for a bike rental","Passport Copy or Original for a Bike Rental?",
  "Visitors are unsure which identity documents a shop may ask for and which they may refuse to hand over.",
  "Which documents are normal, which are a red flag and how to protect the original.",["EN-H03-documents","dc-papers"],["state","fcdo"]],
 ["riding-in-heavy-rain-hanoi","riding a scooter in hanoi during heavy rain","Wet-Road Scooter Riding in Hanoi: Grip, Visibility and Flooded Streets",
  "Monsoon-season visitors need to know how rain changes grip, visibility and flooded roads on two wheels.",
  "Rain-riding technique, flood-depth judgement and when to wait it out rather than keep riding.",["EN-H04-safety","ss-weather"],["who","smart"]],
 ["scooter-breakdown-on-the-road","what to do if a scooter breaks down on the road","What to Do If a Scooter Breaks Down on the Road",
  "Riders far from the city need a calm sequence of steps when the engine stops or a tyre fails.",
  "A roadside checklist from getting safe to calling the right contact and documenting the fault.",["EN-H04-safety","ss-incidents"],["fcdo","un"]],
 ["gloves-and-jacket-for-scooter-riding","gloves and jacket for scooter riding in hanoi","Gloves and Jacket for Scooter Riding in Hanoi",
  "Visitors wearing only a helmet ask what other protective gear is realistic in heat and humidity.",
  "Which protective layers are worth carrying in hot weather and how to choose breathable gear.",["EN-H04-safety","ss-gear"],["who","vn"]],
 ["parking-in-the-old-quarter","parking a scooter safely in the old quarter","Parking a Scooter Safely in Hanoi's Old Quarter",
  "City visitors ask where bikes may be left, how paid parking works and how to reduce the theft risk.",
  "Pavement rules, attendant parking etiquette and locking habits specific to the old quarter.",["EN-H04-safety","ss-city"],["smart","fcdo"]],
 ["mild-weather-months-in-hanoi","when is the weather mild in hanoi for visitors","When Is the Weather Mild in Hanoi for Visitors?",
  "Trip planners compare months to avoid the heat, humidity or winter chill before booking flights.",
  "Month-by-month climate comparison with what each season means for walking and riding.",["hanoi-vietnam-travel","travel-seasons"],["vn","state"]],
 ["day-trip-ba-vi-national-park","day trip from hanoi to ba vi national park","Day Trip From Hanoi to Ba Vi National Park",
  "Visitors with a spare day look for a short escape from the capital that does not need an overnight stay.",
  "Realistic timing, route and terrain notes for a one-day outing to the hills west of the city.",["road-trips-routes","rt-day-trips"],["vn","smart"]],
 ["hanoi-bus-with-a-travel-card","how to use the hanoi city bus as a visitor","How to Use the Hanoi City Bus as a Visitor",
  "Visitors who do not ride bikes want to understand routes, tickets and etiquette on the public bus network.",
  "Boarding, paying and route-reading basics with the common first-time mistakes.",["transportation-mobility","mob-urban-transit"],["un","vn"]],
 ["hanoi-coffee-street-visit","visiting hanoi train street coffee shops","Visiting Hanoi's Train Street Coffee Shops Respectfully",
  "Tourists drawn to the narrow railway cafes ask what is allowed, safe and respectful for residents.",
  "Local-etiquette and safety framing for visiting the cafes without disturbing neighbours.",["destinations-experiences","dest-local"],["fcdo","vn"]],
 ["daily-budget-for-a-week-in-hanoi","daily spending budget for a week in hanoi","Daily Spending Budget for a Week in Hanoi",
  "Travellers want a realistic everyday spending frame for food, transport and entry fees across a week.",
  "A category-by-category budgeting method that avoids quoting live prices as facts.",["travel-planning","plan-budget"],["state","vn"]],
 ["electric-scooter-range-in-hanoi","electric scooter range for city riding in hanoi","Electric Scooter Range for City Riding in Hanoi",
  "Visitors curious about electric bikes ask how far a charge goes in heat, traffic and with a passenger.",
  "Range factors, charging realities and how to plan a day around a battery.",["electric-mobility","electric-choice"],["un","who"]],
 ["temple-etiquette-for-tourists-hanoi","temple etiquette for tourists in hanoi","Temple Etiquette for Tourists in Hanoi",
  "First-time visitors worry about dress code, photography and behaviour inside pagodas and temples.",
  "Clothing, offerings, photography and quiet-behaviour rules explained with local context.",["hanoi-vietnam-travel","travel-etiquette"],["vn","smart"]],
 ["cao-bang-ban-gioc-by-motorbike","cao bang and ban gioc waterfall by motorbike","Cao Bang and Ban Gioc Waterfall by Motorbike",
  "Riders looking beyond the best-known northern loop ask about a longer route to the Chinese border waterfall.",
  "Route stages, road condition expectations and permit questions for the far-north trip.",["road-trips-routes","rt-northern-loops"],["fcdo","smart"]]
];
const place=(locale,[where,sub])=>{
 if(where==="EN-H01-vehicle")return {parent_id:hub(locale,"vehicle-choice"),subcluster:sub};
 if(where==="EN-H02-costs")return {parent_id:hub(locale,"rental-costs"),subcluster:sub};
 if(where==="EN-H03-documents")return {parent_id:hub(locale,"documents-contracts"),subcluster:sub};
 if(where==="EN-H04-safety")return {parent_id:hub(locale,"safety-support"),subcluster:sub};
 // Since the six-Hub activation (2026-10-27) every domain has a live-architecture Hub (XX-H05..H10).
 const HUB_OF={"hanoi-vietnam-travel":"travel-guides","road-trips-routes":"routes-trips","transportation-mobility":"transport-mobility",
  "destinations-experiences":"destinations-experiences","travel-planning":"travel-planning","electric-mobility":"electric-mobility"};
 return {parent_id:hub(locale,HUB_OF[where]),subcluster:sub};
};
/** The n-th English test topic (0-based, 0..23). */
export const enTopic=(n,over={})=>{
 const [slug,q,title,why,angle,where,[a,b]]=EN[n];
 return {locale:"en",...place("en",where),slug,primary_query:q,secondary_queries:[q+" tips",q+" guide"],search_intent:"informational",
  word_target:1400,working_title:title,intent_rationale:why,content_angle:angle,references:refs(a,b),...over};
};
export const EN_COUNT=EN.length;
export const enTopics=(from,count,over={})=>Array.from({length:count},(_,i)=>enTopic(from+i,over));

export const batchOf=(ids,candidates,researchedOn="2026-10-15")=>({version:1,repo:"thuexemayhanoi/global",purpose:"TOPIC_RESEARCH_BATCH",
 agent:{name:ids.agent,session:ids.batchSession},researched_on:researchedOn,candidates});

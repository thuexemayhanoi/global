/**
 * PR6 pilot manuscripts were stored with legacy human_review=true metadata,
 * while the original editorial PR explicitly said factual review was pending.
 * Preserve the original byte SHA evidence but NEVER claim human/SEO validation.
 */
export const PILOT_IDS=["EN-H01","DE-H01"];
export const PILOT_SOURCE="publish/pilot-hubs-en-de";
export const PILOT_OWNERS={
 "EN-H01":{writer:"W2",session:"w2-live",branch:"writer/w2-live"},
 "DE-H01":{writer:"W3",session:"w3-live",branch:"writer/w3-live"}
};
export function legacyPilotOriginal(claim){
 const owner=PILOT_OWNERS[claim?.id];
 return Boolean(owner&&claim?.status==="SUBMITTED"&&
  claim?.legacy_pilot?.source_pr===6&&claim.legacy_pilot.source_ref===PILOT_SOURCE&&
  claim.source_branch===PILOT_SOURCE&&
  claim.source_path==="content/articles/"+claim.id+".json"&&
  claim.writer===owner.writer&&claim.session===owner.session&&claim.branch===owner.branch);
}
export function normalizeLegacyPilot(packet,claim){
 if(!legacyPilotOriginal(claim)||packet?.matrix_id!==claim.id)throw Error("UNAUTHORIZED_LEGACY_PILOT_TRANSFORM");
 // Leave original body, title, sources, slug and locale byte-identical.
 // Only set metadata truthfully for the automated Publisher's policy lane.
 return {...packet,facts_reviewed_by_human:false,serp_intent_checked:false,
  writer_session:claim.session};
}

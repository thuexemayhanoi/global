// Shared static menu renderer. Only matrix PUBLISHED pages can become clickable.
// The owner-approved menu shows exactly two Supporting labels per Hub. When a
// Hub gains more Supporting rows (topical-map promotion), PUBLISHED rows win,
// then lowest priority; the rest are reached from the Hub page itself.
export const MENU_CHILDREN_PER_HUB=2;
// The four original Hubs own the fixed menu groups and labels. Hubs added later
// (owner authorization 2026-10-27) join a "More topics" group once PUBLISHED.
export const LEGACY_HUB_CLUSTERS=["vehicle-choice","rental-costs","documents-contracts","safety-support"];
const MORE_TOPICS={vi:"Chủ đề khác",en:"More topics",de:"Weitere Themen",fr:"Autres rubriques",es:"Más temas",nl:"Meer onderwerpen",zh:"更多主题",pt:"Mais temas",ko:"더 많은 주제",ja:"その他のテーマ"};
export function menuChildren(matrix,hubId){
  return matrix.rows.filter(r=>r.parent_id===hubId&&r.role==="SUPPORT"&&r.status!=="BLOCKED")
    .sort((a,b)=>(a.status==="PUBLISHED"?0:1)-(b.status==="PUBLISHED"?0:1)||a.priority-b.priority||a.id.localeCompare(b.id))
    .slice(0,MENU_CHILDREN_PER_HUB);
}
export function enhanceNavigation(files, locales, matrix) {
  const translations = {
    vi:["Trang chủ","Chọn loại xe","Giá thuê & cọc","Giấy tờ & hợp đồng","An toàn & hỗ trợ","Kiểm tra xe","Danh mục","Sắp có bài","Xem hướng dẫn","Ngôn ngữ"],
    en:["Home","Choose a vehicle","Prices & deposits","Documents & contracts","Safety & support","Rental checklist","Topics","Coming soon","Current guide","Languages"],
    de:["Startseite","Fahrzeugwahl","Preise & Kaution","Papiere & Vertrag","Sicherheit & Hilfe","Miet-Checkliste","Themen","In Vorbereitung","Aktueller Ratgeber","Sprachen"],
    fr:["Accueil","Choisir un véhicule","Tarifs & caution","Documents & contrat","Sécurité & aide","Checklist de location","Rubriques","À venir","Guide disponible","Langues"],
    es:["Inicio","Elegir vehículo","Precio y depósito","Documentos y contrato","Seguridad y ayuda","Lista de control","Categorías","Próximamente","Guía disponible","Idiomas"],
    nl:["Start","Voertuig kiezen","Prijs & borg","Documenten & contract","Veiligheid & hulp","Huurchecklist","Onderwerpen","Binnenkort","Bestaande gids","Talen"],
    zh:["首页","车型选择","费用与押金","证件与合同","安全与援助","取车检查清单","分类","即将推出","当前指南","语言"],
    pt:["Início","Escolher veículo","Preços & caução","Documentos & contrato","Segurança & apoio","Checklist de aluguer","Categorias","Em preparação","Guia disponível","Idiomas"],
    ko:["홈","차종 선택","요금과 보증금","서류와 계약","안전과 지원","인수 체크리스트","주제","준비 중","현재 가이드","언어"],
    ja:["ホーム","車種の選び方","料金と保証金","書類と契約","安全とサポート","レンタルチェック","カテゴリー","準備中","公開中のガイド","言語"]
  };
  const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const localeByCode=Object.fromEntries(locales.map(l=>[l.code,l]));
  const published=new Set(matrix.rows.filter(r=>r.status==="PUBLISHED").map(r=>r.url));
  const hubs=code=>matrix.rows.filter(r=>r.locale===code&&r.role==="HUB"&&LEGACY_HUB_CLUSTERS.includes(r.cluster)).sort((a,b)=>a.priority-b.priority);
  // IDEA Hubs never appear here: an unpublished category gets neither a link nor a label.
  const extraHubs=code=>matrix.rows.filter(r=>r.locale===code&&r.role==="HUB"&&!LEGACY_HUB_CLUSTERS.includes(r.cluster)&&available(r)).sort((a,b)=>a.priority-b.priority);
  const children=id=>menuChildren(matrix,id);
  const available=row=>Boolean(row&&published.has(row.url)&&Object.prototype.hasOwnProperty.call(files,row.url==="/"? "index.html":row.url.slice(1)+"index.html"));
  function childItem(row,code) {
    if(available(row)) return '<a class="nav2-child" href="'+esc(row.url)+'">'+esc(row.working_title)+'</a>';
    return '<span class="nav2-child nav2-pending" data-planned-id="'+esc(row.id)+'" aria-disabled="true">'+esc(row.working_title)+'<small>'+esc(translations[code][7])+'</small></span>';
  }
  function topicMenu(l,hub,index){
    const label=esc(translations[l.code][index+1]);
    const link=available(hub)?hub.url:'/'+l.code+'/#topics';
    return '<details class="nav2-topic" data-topic="'+esc(hub.id)+'"><summary>'+label+' <span aria-hidden="true">⌄</span></summary><div class="nav2-panel"><strong>'+label+'</strong><a class="nav2-parent-link" href="'+esc(link)+'">'+esc(translations[l.code][8])+' →</a>'+children(hub.id).map(r=>childItem(r,l.code)).join('')+'</div></details>';
  }
  function moreTopicsMenu(l){
    const extra=extraHubs(l.code);
    if(!extra.length)return '';
    const label=esc(MORE_TOPICS[l.code]||MORE_TOPICS.en);
    return '<details class="nav2-topic nav2-more" data-topic="more"><summary>'+label+' <span aria-hidden="true">⌄</span></summary><div class="nav2-panel"><strong>'+label+'</strong>'+extra.map(r=>'<a class="nav2-child" href="'+esc(r.url)+'">'+esc(r.working_title)+'</a>').join('')+'</div></details>';
  }
  function languages(l,isChecklist){
    return '<details class="lang nav2-lang"><summary aria-label="'+esc(translations[l.code][9])+'">🌐 '+esc(l.flag)+' '+esc(l.name)+' ⌄</summary><div class="lang-options">'+locales.map(to=>'<a href="/'+esc(to.code)+'/'+(isChecklist?'checklist/':'')+'" lang="'+esc(to.htmlLang)+'"'+(to.code===l.code?' aria-current="page"':'')+'>'+esc(to.flag)+' '+esc(to.name)+'</a>').join('')+'</div></details>';
  }
  function navHead(l,isChecklist) {
    const tr=translations[l.code], groups=hubs(l.code);
    if(groups.length!==4||groups.some(g=>children(g.id).length!==2))throw Error('Expected 4 hubs with 8 children for '+l.code);
    return '<header class="header nav2-head" data-nav-version="2"><div class="container nav2-head-inner"><a class="brand nav2-brand" href="/"><span class="mark" aria-hidden="true">✳</span>VIETNAM<span class="brand-light">/</span>WHEELS</a><details class="nav2-drawer" open><summary class="nav2-menu-button">☰ '+esc(tr[6])+'</summary><nav class="nav2-main" aria-label="'+esc(tr[6])+'"><a class="nav2-direct" href="/'+l.code+'/">'+esc(tr[0])+'</a>'+groups.map((g,i)=>topicMenu(l,g,i)).join('')+moreTopicsMenu(l)+'<a class="nav2-direct" href="/'+l.code+'/checklist/">'+esc(tr[5])+'</a></nav></details>'+languages(l,isChecklist)+'</div></header>';
  }
  function moreTopicsFooter(l){
    const extra=extraHubs(l.code);
    return extra.length?'<section class="nav2-foot-more"><h3>'+esc(MORE_TOPICS[l.code]||MORE_TOPICS.en)+'</h3>'+extra.map(r=>'<a class="nav2-child" href="'+esc(r.url)+'">'+esc(r.working_title)+'</a>').join('')+'</section>':'';
  }
  function footer(l){
    const tr=translations[l.code],groups=hubs(l.code);
    return '<footer class="footer nav2-footer" data-footer-version="2"><div class="container nav2-foot-wrap"><div class="nav2-footer-main"><div class="nav2-foot-brand"><a href="/" class="nav2-foot-logo">VIETNAM / WHEELS</a><p>'+esc(l.navNote)+'</p><a href="/'+l.code+'/">'+esc(tr[0])+'</a><a href="/'+l.code+'/checklist/">'+esc(tr[5])+'</a></div><nav class="nav2-foot-groups" aria-label="'+esc(tr[6])+'">'+groups.map((hub,i)=>'<section><h3>'+esc(tr[i+1])+'</h3>'+children(hub.id).map(r=>childItem(r,l.code)).join('')+'</section>').join('')+moreTopicsFooter(l)+'</nav></div><div class="nav2-foot-bottom"><div class="nav2-foot-languages">'+locales.map(to=>'<a lang="'+esc(to.htmlLang)+'" href="/'+esc(to.code)+'/"'+(to.code===l.code?' aria-current="page"':'')+'>'+esc(to.flag)+' '+esc(to.code.toUpperCase())+'</a>').join('')+'</div><div class="nav2-legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></div></div></div></footer>';
  }
  // Header and footer depend on the locale (and checklist switcher), never on the page:
  // render each once instead of re-scanning the Matrix for every page (O(pages × rows)).
  const rendered=new Map(),once=(key,render)=>{if(!rendered.has(key))rendered.set(key,render());return rendered.get(key);};
  const publicHeader='<header class="header nav2-head" data-nav-version="2"><div class="container nav2-head-inner"><a class="brand nav2-brand" href="/"><span class="mark" aria-hidden="true">✳</span>VIETNAM<span class="brand-light">/</span>WHEELS</a><a class="nav2-global-link" href="/#languages">🌐 Languages ↓</a></div></header>';
  const publicFooter='<footer class="footer nav2-footer" data-footer-version="2"><div class="container nav2-foot-wrap"><div class="nav2-footer-main"><div class="nav2-foot-brand"><a href="/" class="nav2-foot-logo">VIETNAM / WHEELS</a><p>Practical information for two-wheel travel in Vietnam.</p></div><nav class="nav2-foot-globallangs" aria-label="Languages">'+locales.map(l=>'<a href="/'+esc(l.code)+'/" lang="'+esc(l.htmlLang)+'">'+esc(l.flag)+' '+esc(l.name)+'</a>').join('')+'</nav></div><div class="nav2-foot-bottom"><span>Vietnam Two-Wheel Guide</span><div class="nav2-legal"><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></div></div></div></footer>';
  for(const [p,raw] of Object.entries(files)){
    if(!p.endsWith('.html'))continue;
    const m=p.match(/^([a-z]{2})\/(?:checklist\/|(?:topics|guides)\/[a-z0-9-]+\/)?index\.html$/);
    const l=m&&localeByCode[m[1]],isChecklist=p.includes('/checklist/');
    const h=l?once("head:"+l.code+":"+isChecklist,()=>navHead(l,isChecklist)):publicHeader,f=l?once("foot:"+l.code,()=>footer(l)):publicFooter;
    let html=raw.replace(/<header class="header">[\s\S]*?<\/header>/,h).replace(/<footer class="footer">[\s\S]*?<\/footer>/,f);

    if(!html.includes('data-nav-version="2"'))html=html.replace(/(<body><a class="skip"[^>]*>[^<]*<\/a>)/,'$1'+h);
    if(!html.includes('data-footer-version="2"'))html=html.replace(/<\/body>/,f+'</body>');
    const labels={vi:["Giới thiệu","Liên hệ","Bảo mật","Điều khoản"],en:["About","Contact","Privacy","Terms"],de:["Über uns","Kontakt","Datenschutz","Nutzungsbedingungen"],fr:["À propos","Contact","Confidentialité","Conditions"],es:["Acerca de","Contacto","Privacidad","Condiciones"],nl:["Over ons","Contact","Privacybeleid","Voorwaarden"],zh:["关于我们","联系我们","隐私政策","使用条款"],pt:["Sobre","Contacto","Privacidade","Termos"],ko:["소개","문의","개인정보 보호","이용약관"],ja:["サイトについて","お問い合わせ","プライバシー","利用規約"]};
    const [aboutLabel,contactLabel,privacyLabel,termsLabel]=labels[l?.code||"en"];
    html=html.replace('<div class="nav2-legal">','<div class="nav2-legal"><a href="/about/">'+esc(aboutLabel)+'</a><a href="/contact/">'+esc(contactLabel)+'</a>');
    html=html.replace('<a href="/privacy/">Privacy</a>','<a href="/privacy/">'+esc(privacyLabel)+'</a>').replace('<a href="/terms/">Terms</a>','<a href="/terms/">'+esc(termsLabel)+'</a>');

    if(!html.includes('/assets/navigation.css'))html=html.replace('<link rel="stylesheet" href="/assets/styles.css">','<link rel="stylesheet" href="/assets/styles.css">\n<link rel="stylesheet" href="/assets/navigation.css">');
    if(p==='index.html')html=html.replace('<div class="language-grid">','<div class="language-grid" id="languages">');
    files[p]=html;
  }
  return files;
}

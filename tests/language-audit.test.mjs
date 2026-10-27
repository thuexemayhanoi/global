import test from "node:test";
import assert from "node:assert/strict";
import {detectLanguage,bodyText,longestVietnameseRun,auditPage,auditSite} from "../scripts/seo/language-audit.mjs";

const SAMPLES={
 vi:"Khi thuê xe máy ở Hà Nội, bạn nên kiểm tra phanh, đèn và lốp trước khi đi. Nếu không có bằng lái phù hợp thì bạn có thể bị phạt và bảo hiểm sẽ không chi trả cho những thiệt hại của người lái.",
 en:"When you rent a scooter in Hanoi, check the brakes, lights and tyres before you ride. If your licence is not valid for the bike, the police can fine you and your travel insurance may not pay for the damage.",
 de:"Wenn du in Hanoi einen Roller mietest, prüfe vor der Fahrt die Bremsen, das Licht und die Reifen. Ist dein Führerschein nicht gültig, kann die Polizei ein Bußgeld verhängen und die Versicherung zahlt nicht für den Schaden.",
 fr:"Avant de louer un scooter à Hanoï, vérifiez les freins, les phares et les pneus. Si votre permis ne couvre pas la cylindrée, la police peut vous verbaliser et votre assurance voyage risque de ne pas prendre en charge les dommages.",
 es:"Si alquilas una moto en Hanói, revisa los frenos, las luces y los neumáticos antes de salir. Si tu carné no es válido para la moto, la policía puede multarte y el seguro de viaje no pagará los daños.",
 nl:"Als je in Hanoi een scooter huurt, controleer dan voor vertrek de remmen, de lampen en de banden. Is je rijbewijs niet geldig voor de motor, dan kan de politie een boete geven en betaalt je reisverzekering de schade niet.",
 pt:"Antes de alugar uma mota em Hanói, verifique os travões, as luzes e os pneus. Se a sua carta não for válida para a mota, a polícia pode aplicar uma multa e o seguro de viagem não paga os danos.",
 zh:"在河内租摩托车之前，请先检查刹车、车灯和轮胎。如果你的驾照不适用于这辆车，警察可能会罚款，旅行保险也可能不赔偿损失。",
 ja:"ハノイでバイクを借りる前に、ブレーキやライト、タイヤを確認しましょう。免許が車両に対応していない場合は罰金の対象になり、旅行保険でも補償されないことがあります。",
 ko:"하노이에서 오토바이를 빌리기 전에 브레이크와 라이트, 타이어를 확인하세요. 면허가 차량에 맞지 않으면 벌금을 물 수 있고 여행자 보험도 손해를 보상하지 않을 수 있습니다.",
};
const LOCALE_LANG={vi:"vi",en:"en",de:"de",fr:"fr",es:"es",nl:"nl",zh:"zh-CN",pt:"pt",ko:"ko",ja:"ja"};
const page=(lang,body,extra="")=>`<!doctype html><html lang="${lang}"><head>${extra}</head><body><header>Menu</header><main><h1>T</h1><p>${body}</p><section class="article-references"><h2>Quellen</h2><ol><li>Thư Viện Pháp Luật: Điều 428 (đơn phương chấm dứt thực hiện hợp đồng) Bộ luật Dân sự 2015 của nước Cộng hòa xã hội chủ nghĩa Việt Nam</li></ol></section></main><footer>F</footer></body></html>`;

test("function words and scripts identify each site language",()=>{
 for(const [loc,text] of Object.entries(SAMPLES))assert.equal(detectLanguage(text),loc,loc);
});

test("a correctly declared page passes, and cited Vietnamese source titles are not counted as body text",()=>{
 const html=page("de",SAMPLES.de.repeat(3),'<script type="application/ld+json">{"@type":"Article","inLanguage":"de"}</script>');
 assert.ok(!bodyText(html).includes("Bộ luật"),"the source list is excluded");
 assert.deepEqual(auditPage({url:"/de/guides/x/",html,pageLocale:"de",localeLang:LOCALE_LANG}),[]);
});

test("a German article declared as English, or English text on a German page, fails",()=>{
 const codes=html=>auditPage({url:"/de/guides/x/",html,pageLocale:"de",localeLang:LOCALE_LANG}).map(i=>i.code);
 assert.ok(codes(page("en",SAMPLES.de.repeat(3))).includes("HTML_LANG_MISMATCH"));
 assert.ok(codes(page("de",SAMPLES.en.repeat(3))).includes("BODY_LANGUAGE_MISMATCH"));
});

test("inLanguage, og:locale, hreflang codes and language links must agree with the declared language",()=>{
 const head='<script type="application/ld+json">{"@graph":[{"@type":"Article","inLanguage":"en"}]}</script><meta property="og:locale" content="en_US"><link rel="alternate" hreflang="zh" href="https://global.rentbikehanoi.com/zh/">';
 const html=page("de",SAMPLES.de.repeat(3)+' <a lang="zh" href="/zh/">中文</a>',head);
 const codes=auditPage({url:"/de/",html,pageLocale:"de",localeLang:LOCALE_LANG}).map(i=>i.code).sort();
 assert.deepEqual(codes,["HREFLANG_CODE_MISMATCH","INLANGUAGE_MISMATCH","LANGUAGE_LINK_LANG_MISMATCH","OG_LOCALE_MISMATCH"]);
 const root=auditPage({url:"/",html:page("en",SAMPLES.en,'<script type="application/ld+json">{"@type":"WebSite","inLanguage":["vi","en","zh-CN"]}</script>'),pageLocale:null,localeLang:LOCALE_LANG});
 assert.deepEqual(root,[],"the multilingual WebSite entity of / may list every site language");
});

test("an untranslated Vietnamese passage in the body of a foreign page is reported",()=>{
 const leak=SAMPLES.en.repeat(2)+" "+SAMPLES.vi;
 assert.ok(longestVietnameseRun(leak).length>=12);
 const found=auditPage({url:"/en/guides/x/",html:page("en",leak),pageLocale:"en",localeLang:LOCALE_LANG});
 assert.ok(found.some(i=>i.code==="VIETNAMESE_RUN_OUTSIDE_SOURCES"&&i.severity==="WARN"));
});

test("the committed site passes the language audit",()=>{
 const r=auditSite(process.cwd());
 assert.ok(r.pages>1000,"audits every generated page");
 assert.equal(r.fail,0,JSON.stringify(r.issues.filter(i=>i.severity==="FAIL").slice(0,5)));
});

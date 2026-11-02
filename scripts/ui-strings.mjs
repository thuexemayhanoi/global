// Localized interface strings of the shared templates (Matrix task TECH-08): skip link, breadcrumb landmark label,
// reading-time badge and the two labels of the Pillar hero illustration. English stays the fallback for the
// language-neutral pages (root, about, contact, privacy, terms, search, 404).
export const UI={
 vi:{skip:"Chuyển đến nội dung chính",crumb:"Đường dẫn điều hướng",read:n=>"≈"+n+" phút đọc",langs:"10 NGÔN NGỮ",hubs:"4 CHỦ ĐỀ CHÍNH"},
 en:{skip:"Skip to content",crumb:"Breadcrumb",read:n=>"≈"+n+" min read",langs:"10 LANGUAGES",hubs:"4 TOPIC HUBS"},
 de:{skip:"Zum Inhalt springen",crumb:"Brotkrumennavigation",read:n=>"≈"+n+" Min. Lesezeit",langs:"10 SPRACHEN",hubs:"4 THEMENBEREICHE"},
 fr:{skip:"Aller au contenu",crumb:"Fil d’Ariane",read:n=>"≈"+n+" min de lecture",langs:"10 LANGUES",hubs:"4 THÈMES PRINCIPAUX"},
 es:{skip:"Saltar al contenido",crumb:"Ruta de navegación",read:n=>"≈"+n+" min de lectura",langs:"10 IDIOMAS",hubs:"4 TEMAS PRINCIPALES"},
 nl:{skip:"Naar de inhoud",crumb:"Kruimelpad",read:n=>"≈"+n+" min leestijd",langs:"10 TALEN",hubs:"4 HOOFDTHEMA’S"},
 zh:{skip:"跳到正文",crumb:"面包屑导航",read:n=>"约 "+n+" 分钟阅读",langs:"10 种语言",hubs:"4 大主题"},
 pt:{skip:"Saltar para o conteúdo",crumb:"Trilho de navegação",read:n=>"≈"+n+" min de leitura",langs:"10 IDIOMAS",hubs:"4 TEMAS PRINCIPAIS"},
 ko:{skip:"본문으로 건너뛰기",crumb:"이동 경로",read:n=>"약 "+n+"분 읽기",langs:"10개 언어",hubs:"4개 주요 주제"},
 ja:{skip:"本文へスキップ",crumb:"パンくずリスト",read:n=>"約"+n+"分で読めます",langs:"10言語",hubs:"4つの主要テーマ"}
};
export const ui=code=>UI[String(code||"").slice(0,2)]||UI.en;

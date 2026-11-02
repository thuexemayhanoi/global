// Localized calendar dates for visible page and reference dates (Matrix tasks CONTENT-03 and CONTENT-04).
// Hand-written formats instead of Intl, so the build output does not depend on the ICU data of the Node version.
const MONTHS={en:["January","February","March","April","May","June","July","August","September","October","November","December"],
 de:["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],
 fr:["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"],
 es:["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],
 nl:["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"],
 pt:["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"]};
export function localDate(iso,code){
 const [y,m,d]=String(iso).slice(0,10).split("-").map(Number),p=n=>String(n).padStart(2,"0");
 if(code==="vi")return p(d)+"/"+p(m)+"/"+y;
 if(code==="zh"||code==="ja")return y+"年"+m+"月"+d+"日";
 if(code==="ko")return y+"년 "+m+"월 "+d+"일";
 if(code==="de")return d+". "+MONTHS.de[m-1]+" "+y;
 if(code==="fr")return (d===1?"1er":d)+" "+MONTHS.fr[m-1]+" "+y;
 if(code==="es"||code==="pt")return d+" de "+MONTHS[code][m-1]+" de "+y;
 return d+" "+(MONTHS[code]||MONTHS.en)[m-1]+" "+y;
}

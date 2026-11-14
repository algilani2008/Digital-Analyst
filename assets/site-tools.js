(function(){
  /* ---------- helpers ---------- */
  function $(id){return document.getElementById(id)}
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function pad(n){n=String(n);return n.length<2?"0"+n:n}
  function fmt(n){return Math.round(n).toLocaleString("en-US")}
  function clean(v){return String(v).replace(/[٠-٩]/g,function(d){return "٠١٢٣٤٥٦٧٨٩".indexOf(d)}).replace(/[۰-۹]/g,function(d){return "۰۱۲۳۴۵۶۷۸۹".indexOf(d)}).replace(/٫/g,".").replace(/[,٬\s ]/g,"").replace(/ر\.?س\.?|ريال|sar|sr|\$|﷼/gi,"")}
  function num0(v){if(typeof v==="number")return v;if(v instanceof Date||v==null||v==="")return NaN;var s=clean(v),neg=/^\(.*\)$/.test(s);s=s.replace(/[()]/g,"");return /^-?\d+(\.\d+)?%?$/.test(s)?(neg?-1:1)*parseFloat(s):NaN}
  function num(v){var x=num0(v);return isNaN(x)?0:x}
  function findCol(row,re){return Object.keys(row).find(function(k){return re.test(String(k).trim())})}
  var monthNames=["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  function monthKey(v){
    if(v instanceof Date&&!isNaN(v))return v.getFullYear()+"-"+pad(v.getMonth()+1);
    if(typeof v==="number"&&v>20000){var d=new Date(Math.round((v-25569)*864e5));return d.getUTCFullYear()+"-"+pad(d.getUTCMonth()+1)}
    var s=String(v),m=s.match(/(\d{4})[-\/.](\d{1,2})/);if(m)return m[1]+"-"+pad(m[2]);
    m=s.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/);if(m)return m[3]+"-"+pad(m[2]);
    return null;
  }
  function monthLabel(k){var p=k.split("-");return monthNames[+p[1]-1]+" "+p[0].slice(2)}

  /* ---------- free quota: kept on the account when signed in, else in this browser ---------- */
  /* رصيد التحليل مشترك بين المبيعات والزيارات: الملف يخصم أكثر من الإدخال اليدوي */
  var COST=window.DA&&DA.costs?DA.costs():{manual:1,file:2,ai:5};
  var Q={credits:window.DA&&DA.freeCredits?DA.freeCredits():4,maint:3},mem={},DB=null,UID=null,shared=false;
  function cr(v){v=Number(v);return isFinite(v)&&v>=0?Math.min(Math.round(v*100)/100,1e6):0}
  function int(v){v=Math.floor(Number(v));return isFinite(v)&&v>=0?Math.min(v,1e6):0}
  var PR={high:1,mid:1,low:1};
  function cleanReq(r){if(!r||typeof r!=="object")return null;
    var t=String(r.title||"").slice(0,200).trim();if(!t)return null;
    return {id:String(r.id||"").slice(0,40),title:t,loc:String(r.loc||"").slice(0,120),who:String(r.who||"").slice(0,80),
      pr:PR[r.pr]?r.pr:"mid",st:Math.min(2,int(r.st)),at:int(r.at)||Date.now(),ex:!!r.ex}}
  function load(){var raw;try{raw=JSON.parse(localStorage.getItem("da_free")||"{}")}catch(e){raw={}}
    if(!raw||typeof raw!=="object"||Array.isArray(raw))raw={};
    var u=raw.used&&typeof raw.used==="object"?raw.used:{};
    mem={used:{credits:"credits" in u?cr(u.credits):(int(u.sales)+int(u.traffic))*COST.file},made:int(raw.made),seeded:!!raw.seeded,
      reqs:(Array.isArray(raw.reqs)?raw.reqs:[]).slice(0,200).map(cleanReq).filter(Boolean)};
    if(!mem.seeded){mem.seeded=true;var now=Date.now();
      mem.reqs=[{id:"ص-مثال1",title:"تسريب مكيف في غرفة الاجتماعات",loc:"الدور الثاني",pr:"high",who:"الفني خالد",st:1,at:now-3*864e5,ex:true},
                {id:"ص-مثال2",title:"لمبة معطلة في الممر",loc:"المدخل الرئيسي",pr:"low",who:"الفني سامي",st:0,at:now-5*36e5,ex:true}]}}
  var usageBusy=Promise.resolve(),usageSent="";
  function save(){var out=mem;if(PORTAL){try{PORTAL.sync(mem)}catch(e){}out=Object.assign({},mem,{used:FREE.used,made:FREE.made})}
    try{localStorage.setItem("da_free",JSON.stringify(out))}catch(e){}
    if(!DB||!UID)return;var key=[mem.used.credits,mem.made].join();if(key===usageSent)return;usageSent=key;
    var body={credits:mem.used.credits,maint:mem.made,at:Date.now()};
    usageBusy=usageBusy.then(function(){return DB.doc("usage/"+UID).set(body)}).catch(function(){})}
  function qk(k){return k==="maint"?"maint":"credits"}
  function used(k){return k==="maint"?mem.made:mem.used.credits}
  function left(k){return Math.max(0,Q[qk(k)]-used(k))}
  /* يكفي الرصيد لهذا النوع؟ mode: file أو manual أو ai */
  function can(mode){return Q.credits===Infinity||left("sales")>=COST[mode]}
  function spend(mode){mem.used.credits=cr(mem.used.credits+COST[mode]);save();meter("sales");meter("traffic")}
  function nf(v){return String(Math.round(v*100)/100)}
  function meter(k){var r=left(k),el=$("m-"+k),q=Q[qk(k)];if(!el)return;
    if(q===Infinity){el.querySelector(".mt").textContent="بدون حد ضمن باقة "+PORTAL.pkg;el.querySelector("i").style.width="100%";$("lock-"+k).hidden=true;return}
    el.querySelector(".mt").textContent=k==="maint"?"متبقي "+r+" من "+q+" طلبات"+(PORTAL?" (باقة "+PORTAL.pkg+")":""):"رصيدك "+nf(r)+" من "+nf(q)+(PORTAL?" (باقة "+PORTAL.pkg+")":"")+" · الملف "+nf(COST.file)+" واليدوي "+nf(COST.manual);
    el.querySelector("i").style.width=(q?r/q*100:0)+"%";$("lock-"+k).hidden=k==="maint"?r>0:can("manual")}
  load();
  /* العميل الداخل بحسابه: الحدود من باقته بدل الحد المجاني، والاستخدام يتسجل على حسابه */
  var PORTAL=null,FREE=null;try{PORTAL=window.DA&&DA.portalLimits?DA.portalLimits():null}catch(e){PORTAL=null}
  if(PORTAL){FREE={used:mem.used,made:mem.made};Q=PORTAL.limits;mem.used={credits:PORTAL.used.credits};mem.made=PORTAL.used.maint;
    var pb=document.createElement("p");pb.className="safe";pb.innerHTML="<span>أنت داخل بحساب <b></b>، والأدوات تشتغل بحدود باقة <b></b>. <a href=\"portal/\">ارجع لبوابتك</a></span>";
    pb.querySelectorAll("b")[0].textContent=PORTAL.company;pb.querySelectorAll("b")[1].textContent=PORTAL.pkg;
    var tw=document.querySelector("#tools .tool-wrap");if(tw)tw.insertBefore(pb,tw.firstChild)}

  /* ---------- tabs ---------- */
  function showTool(t){
    document.querySelectorAll("[data-t]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.t===t))});
    ["sales","maint","traffic"].forEach(function(k){$("t-"+k).hidden=k!==t});
  }
  document.querySelectorAll("[data-t]").forEach(function(b){b.addEventListener("click",function(){showTool(b.dataset.t)})});
  document.querySelectorAll("[data-tool]").forEach(function(a){a.addEventListener("click",function(){showTool(a.dataset.tool)})});
  (function(){var tq=new URLSearchParams(location.search).get("tool");if(tq&&["sales","maint","traffic"].indexOf(tq)>=0)showTool(tq)})();

  /* ---------- file reading ---------- */
  function filled(c){return !(c===""||c==null||(typeof c==="string"&&!c.trim()))}
  function isText(c){return typeof c==="string"&&c.trim()!==""&&isNaN(num0(c))&&!monthKey(c)}
  /* find the real header row (skips report titles above it), drop empty & total rows */
  function toObjects(aoa){
    var bi=0,best=-1e9;
    for(var i=0;i<Math.min(20,aoa.length);i++){var row=aoa[i]||[],t=0,n=0;
      row.forEach(function(c){if(isText(c))t++;else if(filled(c))n++});
      var next=aoa.slice(i+1,i+4).some(function(r){return (r||[]).some(filled)});
      var sc=t*2-n*3;if(t>=2&&next&&sc>best){best=sc;bi=i}}
    var hdr=(aoa[bi]||[]).map(function(h,j){h=filled(h)?String(h).trim():"";return h||("عمود "+(j+1))}),seen={};
    hdr=hdr.map(function(h){if(seen[h]){seen[h]++;return h+" ("+seen[h]+")"}seen[h]=1;return h});
    var out=[];
    aoa.slice(bi+1).forEach(function(r){r=r||[];if(!r.some(filled))return;
      if(r.some(function(c){return typeof c==="string"&&/^(ال)?(إجمالي|اجمالي|مجموع|المجموع)(\s|$)|^(grand\s*)?total(s)?$/i.test(c.trim())}))return;
      var o={};hdr.forEach(function(h,j){o[h]=r[j]==null?"":r[j]});out.push(o)});
    return out;
  }
  function profile(rows){
    var P={};Object.keys(rows[0]||{}).forEach(function(c){var ne=0,nn=0,d=0,t=0,sum=0,u={},small=0;
      rows.forEach(function(r){var v=r[c];if(!filled(v))return;ne++;
        if(v instanceof Date){d++;return}
        if(typeof v==="string"&&monthKey(v)&&isNaN(num0(v))){d++;return}
        var x=num0(v);if(!isNaN(x)){nn++;sum+=x;if(Math.abs(x)<=1)small++;return}
        t++;u[String(v).trim()]=1});
      P[c]={ne:ne,numR:ne?nn/ne:0,dateR:ne?d/ne:0,textR:ne?t/ne:0,sum:sum,uniq:Object.keys(u).length,rate:nn&&small/nn>.9}});
    return P;
  }
  var MAX_BYTES=5*1024*1024,MAX_ROWS=20000,MAX_COLS=60,MAX_SHEETS=10;
  /* CSV saved from Arabic Excel is often Windows-1256, not UTF-8 */
  function decodeCsv(buf){var u=new Uint8Array(buf);
    if(u[0]===0xFF&&u[1]===0xFE)return new TextDecoder("utf-16le").decode(u);
    try{return new TextDecoder("utf-8",{fatal:true}).decode(u).replace(/^﻿/,"")}
    catch(e){try{return new TextDecoder("windows-1256").decode(u)}catch(e2){return new TextDecoder("utf-8").decode(u)}}}
  function readFile(file,ok,bad){
    if(typeof XLSX==="undefined"){bad("ما قدرنا نحمّل قارئ الملفات. حدّث الصفحة وجرّب مرة ثانية.");return}
    var ext=(String(file.name).match(/\.([a-z0-9]+)$/i)||[])[1];ext=ext?ext.toLowerCase():"";
    if(["xlsx","xls","csv"].indexOf(ext)<0){bad("الصيغة هذي ما ندعمها. ارفع ملف ‎.xlsx أو ‎.xls أو ‎.csv.");return false}
    if(!file.size){bad("الملف فاضي.");return false}
    if(file.size>MAX_BYTES){bad("حجم الملف "+(file.size/1048576).toFixed(1)+" ميقا، والحد الأقصى 5 ميقا. احذف الأعمدة اللي ما تحتاجها أو قسّم الملف وجرّب.");return false}
    var fr=new FileReader();
    fr.onload=function(){try{
      var opts={cellDates:true,cellHTML:false,cellFormula:false,cellStyles:false,sheetRows:MAX_ROWS+25},
          wb=ext==="csv"?XLSX.read(decodeCsv(fr.result),Object.assign({type:"string",raw:false},opts)):XLSX.read(new Uint8Array(fr.result),Object.assign({type:"array"},opts)),pick=null,ps=-1;
      wb.SheetNames.slice(0,MAX_SHEETS).forEach(function(nm){var aoa=XLSX.utils.sheet_to_json(wb.Sheets[nm],{header:1,defval:"",raw:true}).map(function(r){return (r||[]).slice(0,MAX_COLS)}),rows=toObjects(aoa);
        if(!rows.length)return;var P=profile(rows),numCols=Object.keys(P).filter(function(c){return P[c].numR>=.6}).length,sc=rows.length*(numCols+1);
        if(sc>ps){ps=sc;pick=rows}});
      if(!pick){bad("الملف ما فيه بيانات نقدر نقرأها. تأكد إنه مو فاضي.");return}ok(pick.slice(0,MAX_ROWS))}
      catch(e){bad("الملف ما انقرى. ارفع ملف Excel (‎.xlsx) أو CSV.")}};
    fr.onerror=function(){bad("ما قدرنا نقرأ الملف. جرّب ترفعه مرة ثانية.")};
    fr.readAsArrayBuffer(file);
  }
  /* column pickers: by name first, then by what the column actually contains */
  function pickNum(P,re,excl,used,maxSum){var cols=Object.keys(P);
    var n=cols.find(function(c){return !used[c]&&re.test(c)&&P[c].numR>=.6&&!P[c].rate});if(n)return n;
    return cols.filter(function(c){return !used[c]&&P[c].numR>=.6&&P[c].dateR<.5&&!P[c].rate&&!(excl&&excl.test(c))&&(maxSum==null||P[c].sum<maxSum)})
      .sort(function(a,b){return P[b].sum-P[a].sum})[0]||null}
  function pickDate(P,re,used){var cols=Object.keys(P);
    return cols.find(function(c){return !used[c]&&re.test(c)&&P[c].dateR>=.5})||cols.filter(function(c){return !used[c]&&P[c].dateR>=.6}).sort(function(a,b){return P[b].dateR-P[a].dateR})[0]||null}
  function textCols(P,used){return Object.keys(P).filter(function(c){var p=P[c];return !used[c]&&p.textR>=.6&&!(p.ne>20&&p.uniq>p.ne*.9)})}
  function autoSales(rows){var P=profile(rows),u={},m={};
    m.date=pickDate(P,/تاريخ|date|شهر|month|يوم|day/i,u);if(m.date)u[m.date]=1;
    m.amount=pickNum(P,/مبلغ|مبيعات|قيمة|إجمالي|اجمالي|صافي|الدخل|amount|sales|total|revenue|net|value/i,/كمية|عدد|qty|quantity|رقم|^id$|كود|code|سعر الوحدة|unit|هاتف|phone|جوال|سنة|year/i,u);if(m.amount)u[m.amount]=1;
    var tc=textCols(P,u);
    m.branch=tc.find(function(c){return /فرع|branch|store|location|موقع|محل|مدينة|city/i.test(c)})||null;if(m.branch)u[m.branch]=1;
    m.item=textCols(P,u).find(function(c){return /صنف|منتج|item|product|sku|بند|خدمة|service|category|فئة/i.test(c)})||null;if(m.item)u[m.item]=1;
    tc=textCols(P,u).sort(function(a,b){return P[a].uniq-P[b].uniq});
    if(!m.branch&&!m.item){if(tc.length>=2){m.branch=tc[0];m.item=tc[tc.length-1]}else if(tc.length===1){if(P[tc[0]].uniq<=15)m.branch=tc[0];else m.item=tc[0]}}
    else if(!m.branch&&tc.length&&P[tc[0]].uniq<=30)m.branch=tc[0];
    else if(!m.item&&tc.length)m.item=tc[tc.length-1];
    return m}
  function autoTraffic(rows){var P=profile(rows),u={},m={};
    var tc=textCols(P,u);
    m.source=tc.find(function(c){return /مصدر|قناة|source|channel|medium|منصة|platform|campaign|حملة/i.test(c)})||tc.sort(function(a,b){return P[b].uniq-P[a].uniq})[0]||null;if(m.source)u[m.source]=1;
    m.visits=pickNum(P,/زيارات|جلسات|sessions|visits|users|مستخدم|زوار|نقرات|clicks/i,/تحويل|طلبات|conversion|orders|purchase|إيراد|revenue|معدل|rate|نسبة|تكلفة|cost/i,u);if(m.visits)u[m.visits]=1;
    m.orders=pickNum(P,/طلبات|تحويل|مبيعات|conversions|orders|purchases|transactions|leads|key events|أحداث رئيسية|عملاء/i,/إيراد|revenue|تكلفة|cost|مبلغ/i,u,m.visits?P[m.visits].sum:null);
    return m}
  function mapperHtml(tool,rows,map,fields,note){var cols=Object.keys(rows[0]||{});
    return '<div class="mapper"><p class="card-t" style="margin:0">الأعمدة اللي اعتمدنا عليها</p><p class="fmt">'+(note||'اكتشفناها تلقائياً من محتوى ملفك. لو تبي تغيّر شي اختر من القائمة وتتحدث النتيجة فوراً، بدون ما ينخصم من رصيدك.')+'</p><div class="map-row">'+
      fields.map(function(f){return '<div class="field"><label for="mp-'+tool+'-'+f[0]+'">'+f[1]+'</label><select id="mp-'+tool+'-'+f[0]+'" data-map="'+tool+'" data-f="'+f[0]+'"><option value="">بدون</option>'+
        cols.map(function(c){return '<option value="'+esc(c)+'"'+(map[f[0]]===c?' selected':'')+'>'+esc(c)+'</option>'}).join("")+'</select></div>'}).join("")+'</div></div>'}
  var last={};
  function readMap(tool){var m={};document.querySelectorAll('[data-map="'+tool+'"]').forEach(function(s){m[s.dataset.f]=s.value||null});return m}
  ["sales","traffic"].forEach(function(t){$("out-"+t).addEventListener("change",function(e){if(!e.target.matches("[data-map]")||!last[t])return;
    (t==="sales"?runSales:runTraffic)(last[t].rows,last[t].label,readMap(t),true)})});
  function err(k,t){var e=$("err-"+k);e.textContent=t||"";e.hidden=!t}
  /* results export: one workbook per tool, offered through the viewer's save prompt */
  var exportData={};
  function resActions(tool,pitch,pkg){
    return '<div class="res-actions"><button type="button" class="btn btn-ghost btn-sm" data-xl="'+tool+'">احفظ النتائج Excel</button><span class="status" id="xl-'+tool+'" aria-live="polite"></span></div>'+
      '<div class="upsell"><p>'+esc(pitch)+'</p><a class="btn btn-primary btn-sm" href="#contact" data-pkg="'+esc(pkg)+'">اطلب عرض سعر</a></div>'}
  window.__daSaveXlsx=function(a,b,c,d){return saveXlsx(a,b,c,d)};
  async function saveXlsx(sheets,name,statusEl,errFn){
    var wb=XLSX.utils.book_new();wb.Workbook={Views:[{RTL:true}]};
    sheets.forEach(function(s){var ws=XLSX.utils.json_to_sheet(s.rows);ws["!cols"]=Object.keys(s.rows[0]||{}).map(function(){return {wch:20}});XLSX.utils.book_append_sheet(wb,ws,s.name.slice(0,31))});
    var buf=XLSX.write(wb,{bookType:"xlsx",type:"array"}),dl=null;
    try{dl=window.claude&&claude.use?await claude.use("downloads"):null}catch(x){}
    if(!dl){try{XLSX.writeFile(wb,name);if(statusEl)statusEl.textContent="انحفظ الملف."}catch(x){errFn("ما قدرنا نحفظ الملف. جرّب مرة ثانية.")}return}
    try{await dl.save({filename:name,data:new Blob([buf])});if(statusEl)statusEl.textContent="انحفظ الملف."}
    catch(x){if(x&&x.code!=="declined")errFn("ما قدرنا نحفظ الملف. جرّب مرة ثانية.")}}
  document.addEventListener("click",function(e){
    var p=e.target.closest("[data-xl]");if(p){var t=p.dataset.xl,d=exportData[t];if(d)saveXlsx(d,t==="sales"?"تحليل-المبيعات.xlsx":"تحليل-الزيارات.xlsx",$("xl-"+t),function(m){err(t,m)});return}
    var k=e.target.closest("[data-pkg]");if(k&&$("f-type")){$("f-type").value=k.dataset.pkg}});
  function bars(list,max,fmtFn,warnFn){
    return '<div class="hbars">'+list.map(function(r){var w=max?Math.max(2,r[1]/max*100):0;
      return '<div class="hb"><span class="nm" title="'+esc(r[0])+'">'+esc(r[0])+'</span><span class="track"><span class="fill'+(warnFn&&warnFn(r)?" warn":"")+'" style="width:'+w+'%;display:block"></span></span><span class="num">'+fmtFn(r[1])+'</span></div>'}).join("")+'</div>';
  }
  function lineSvg(labels,vals){
    var W=440,H=170,pl=44,pr=14,pt=16,pb=26,n=vals.length,mx=Math.max.apply(null,vals)*1.15||1;
    var step=Math.pow(10,Math.floor(Math.log10(mx/3)));var nice=[1,2,5,10].map(function(m){return m*step}).find(function(s){return mx/s<=5})||step*10;
    var top=Math.ceil(mx/nice)*nice,iw=W-pl-pr,ih=H-pt-pb;
    function x(i){return n<2?W/2:document.documentElement.dir==="ltr"?pl+(i/(n-1))*iw:W-pr-(i/(n-1))*iw}function y(v){return pt+ih-v/top*ih}
    var s='<svg class="mini-chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="المبيعات حسب الشهر">';
    for(var g=0;g<=top+1e-9;g+=nice)s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(g)+'" y2="'+y(g)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(y(g)+4)+'" text-anchor="end">'+(g>=1000?(g/1000)+"k":g)+'</text>';
    var pts=vals.map(function(v,i){return x(i)+","+y(v)}).join(" ");
    s+='<polygon points="'+pts+" "+x(n-1)+","+y(0)+" "+x(0)+","+y(0)+'" fill="var(--accent)" opacity=".12"/>';
    s+='<polyline points="'+pts+'" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
    var every=Math.ceil(n/6);labels.forEach(function(l,i){if(i%every===0||i===n-1)s+='<text x="'+x(i)+'" y="'+(H-6)+'" text-anchor="middle">'+esc(l)+'</text>'});
    s+='<circle cx="'+x(n-1)+'" cy="'+y(vals[n-1])+'" r="5" fill="var(--data)" stroke="var(--surface)" stroke-width="2"/></svg>';
    return s;
  }

  /* ---------- sales dashboard ---------- */
  function sampleSales(){var rows=[],br=["الفرع الرئيسي","فرع الشمال","فرع الكورنيش"],it=["عود","مسك","عنبر","بخور","زيوت عطرية"];
    for(var m=1;m<=6;m++)br.forEach(function(b,bi){it.forEach(function(x,ii){
      var v=(1400+bi*420+(ii%2?260:-180)*ii/2+m*(90+bi*35))*(x==="زيوت عطرية"?0.3:1)*(x==="عنبر"&&bi===2?0.5:1);
      rows.push({"التاريخ":"2026-"+pad(m)+"-15","الفرع":b,"الصنف":x,"المبلغ":Math.round(v)})})});return rows}
  var SF=[["amount","المبلغ"],["branch","الفرع"],["item","الصنف"],["date","التاريخ"]];
  function runSales(rows,label,map,showMap){
    map=map||autoSales(rows);last.sales={rows:rows,label:label};
    var cA=map.amount,cB=map.branch,cI=map.item,cD=map.date,mp=showMap?mapperHtml("sales",rows,map,SF):"";
    err("sales");
    if(!cA){$("out-sales").innerHTML=mapperHtml("sales",rows,map,SF,"ما لقينا عمود فيه أرقام مبيعات. اختر عمود المبلغ من القائمة وتطلع النتيجة.");return true}
    var tot=0,byB={},byI={},byM={};
    rows.forEach(function(r){var a=num(r[cA]);if(!a)return;tot+=a;
      var b=cB?String(r[cB]).trim()||"غير محدد":"كل المبيعات",i=cI?String(r[cI]).trim()||"غير محدد":null,m=cD?monthKey(r[cD]):null;
      byB[b]=(byB[b]||0)+a;if(i)byI[i]=(byI[i]||0)+a;if(m)byM[m]=(byM[m]||0)+a});
    if(!tot){$("out-sales").innerHTML=mapperHtml("sales",rows,map,SF,"العمود المختار ما فيه أرقام. اختر عمود ثاني للمبلغ.");return true}
    var B=Object.entries(byB).sort(function(a,b){return b[1]-a[1]}),I=Object.entries(byI).sort(function(a,b){return b[1]-a[1]}),
        Mk=Object.keys(byM).sort(),nm=Mk.length;
    var avgItem=I.length?tot/I.length:0,slow=I.filter(function(x){return x[1]<avgItem*0.5});
    var h='<p class="fmt">'+esc(label)+' · '+fmt(rows.length)+' صف</p><div class="res-kpis">'+
      '<div class="kpi"><span class="label">إجمالي المبيعات</span><span class="value num">'+fmt(tot)+' ر.س</span></div>'+
      '<div class="kpi"><span class="label">أفضل فرع</span><span class="value">'+esc(B[0][0])+'</span></div>'+
      '<div class="kpi"><span class="label">متوسط الشهر</span><span class="value num">'+(nm?fmt(tot/nm)+' ر.س':'—')+'</span></div>'+
      '<div class="kpi"><span class="label">أصناف بطيئة</span><span class="value num">'+slow.length+'</span></div></div>';
    h+='<div class="grid2"><div><p class="card-t">المبيعات حسب الفرع</p>'+bars(B,B[0][1],fmt)+'</div>';
    h+='<div><p class="card-t">المبيعات حسب الشهر</p>'+(nm>=2?lineSvg(Mk.map(monthLabel),Mk.map(function(k){return byM[k]})):'<p class="fmt">أضف عمود «التاريخ» عشان يطلع اتجاه الأشهر.</p>')+'</div></div>';
    if(I.length){h+='<div><p class="card-t">ترتيب الأصناف</p><div class="tbl-wrap"><table class="data"><thead><tr><th>الصنف</th><th>المبيعات</th><th>النسبة</th><th>الحالة</th></tr></thead><tbody>'+
      I.map(function(x,i){var st=i<3?'<span class="flag good">الأعلى مبيعاً</span>':(x[1]<avgItem*0.5?'<span class="flag">بطيء</span>':'');
        return '<tr><td>'+esc(x[0])+'</td><td class="num">'+fmt(x[1])+'</td><td class="num">'+(x[1]/tot*100).toFixed(1)+'%</td><td>'+st+'</td></tr>'}).join("")+'</tbody></table></div></div>'}
    var ins=['<li>'+esc(B[0][0])+' يحقق '+(B[0][1]/tot*100).toFixed(0)+'% من المبيعات'+(B.length>1?'، وأضعف فرع '+esc(B[B.length-1][0])+' بنسبة '+(B[B.length-1][1]/tot*100).toFixed(0)+'%.':'.')+'</li>'];
    if(nm>=2){var a=byM[Mk[0]],z=byM[Mk[nm-1]],ch=(z-a)/a*100;ins.push('<li>المبيعات '+(ch>=0?'ارتفعت':'انخفضت')+' '+Math.abs(ch).toFixed(0)+'% من '+monthLabel(Mk[0])+' إلى '+monthLabel(Mk[nm-1])+'.</li>')}
    if(slow.length)ins.push('<li>'+slow.length+' صنف مبيعاته أقل من نصف المتوسط، راجع تسعيرها أو عرضها: '+slow.slice(0,3).map(function(x){return esc(x[0])}).join("، ")+'.</li>');
    h+='<div><p class="card-t">وش تقول الأرقام</p><ul class="insights">'+ins.join("")+'</ul></div>';
    exportData.sales=[{name:"حسب الفرع",rows:B.map(function(x){return {"الفرع":x[0],"المبيعات (ر.س)":Math.round(x[1]),"النسبة %":+(x[1]/tot*100).toFixed(1)}})}];
    if(I.length)exportData.sales.push({name:"حسب الصنف",rows:I.map(function(x){return {"الصنف":x[0],"المبيعات (ر.س)":Math.round(x[1]),"النسبة %":+(x[1]/tot*100).toFixed(1),"بطيء":x[1]<avgItem*0.5?"نعم":""}})});
    if(nm)exportData.sales.push({name:"حسب الشهر",rows:Mk.map(function(k){return {"الشهر":k,"المبيعات (ر.س)":Math.round(byM[k])}})});
    h+=resActions("sales","تبي هذي اللوحة تتحدث لك كل شهر من ملفاتك أو نظام نقاط البيع؟","تحليل بيانات ولوحة معلومات");
    $("out-sales").innerHTML=mp+h;return true;
  }
  $("demo-sales").addEventListener("click",function(){runSales(sampleSales(),"بيانات تجريبية: متجر عطور بثلاثة فروع")});
  $("f-sales").addEventListener("change",function(e){var f=e.target.files[0];e.target.value="";if(!f)return;
    if(!can("file")){meter("sales");err("sales",noCredit("file"));return}
    readFile(f,function(rows){spend("file");runSales(rows,f.name,null,true)},function(m){err("sales",m)})});

  /* ---------- traffic analyzer ---------- */
  function sampleTraffic(){return [["بحث قوقل",4200,126],["انستقرام",3100,40],["سناب شات",2600,21],["مباشر",1500,52],["إعلانات قوقل",1800,45],["واتساب",600,38]].map(function(r){return {"المصدر":r[0],"الزيارات":r[1],"الطلبات":r[2]}})}
  var TF=[["source","المصدر"],["visits","الزيارات"],["orders","الطلبات"]];
  function runTraffic(rows,label,map,showMap){
    map=map||autoTraffic(rows);last.traffic={rows:rows,label:label};
    var cS=map.source,cV=map.visits,cC=map.orders,mp=showMap?mapperHtml("traffic",rows,map,TF):"";
    err("traffic");
    if(!cV){$("out-traffic").innerHTML=mapperHtml("traffic",rows,map,TF,"ما لقينا عمود فيه أعداد الزيارات. اختره من القائمة وتطلع النتيجة.");return true}
    var agg={},tv=0,tc=0;rows.forEach(function(r){var s=cS?(String(r[cS]).trim()||"غير محدد"):"كل الزيارات",v=num(r[cV]),c=cC?num(r[cC]):0;if(!agg[s])agg[s]={v:0,c:0};agg[s].v+=v;agg[s].c+=c;tv+=v;tc+=c});
    if(!tv){$("out-traffic").innerHTML=mapperHtml("traffic",rows,map,TF,"العمود المختار للزيارات ما فيه أرقام. اختر عمود ثاني.");return true}
    var L=Object.entries(agg).map(function(e){return {s:e[0],v:e[1].v,c:e[1].c,r:e[1].v?e[1].c/e[1].v*100:0}}).sort(function(a,b){return b.v-a.v});
    var overall=tc/tv*100,best=L.slice().filter(function(x){return x.v>=tv*0.03}).sort(function(a,b){return b.r-a.r})[0]||L[0];
    var weak=L.filter(function(x){return x.v>=tv*0.1&&x.r<overall*0.6});
    var h='<p class="fmt">'+esc(label)+'</p><div class="res-kpis">'+
      '<div class="kpi"><span class="label">إجمالي الزيارات</span><span class="value num">'+fmt(tv)+'</span></div>'+
      '<div class="kpi"><span class="label">إجمالي الطلبات</span><span class="value num">'+(cC?fmt(tc):'—')+'</span></div>'+
      '<div class="kpi"><span class="label">معدل التحويل</span><span class="value num">'+(cC?overall.toFixed(2)+'%':'—')+'</span></div>'+
      '<div class="kpi"><span class="label">أفضل قناة</span><span class="value">'+(cC?esc(best.s):'—')+'</span></div></div>';
    h+='<div class="grid2"><div><p class="card-t">الزيارات حسب المصدر</p>'+bars(L.map(function(x){return [x.s,x.v,x]}),L[0].v,fmt,function(r){return cC&&r[2].r<overall*0.6})+'<p class="fmt" style="margin-top:8px">البرتقالي: قناة تحويلها أقل بكثير من المتوسط.</p></div>';
    if(cC){var R=L.slice().sort(function(a,b){return b.r-a.r});h+='<div><p class="card-t">معدل التحويل حسب المصدر</p>'+bars(R.map(function(x){return [x.s,x.r,x]}),R[0].r,function(n){return n.toFixed(1)+"%"},function(r){return r[2].r<overall*0.6})+'</div>'}
    h+='</div>';
    var ins=[];
    if(cC){ins.push('<li>'+esc(best.s)+' أعلى قناة في التحويل ('+best.r.toFixed(1)+'%)، ركّز عليها في الميزانية والمحتوى.</li>');
      weak.forEach(function(w){ins.push('<li>'+esc(w.s)+' تجيب '+(w.v/tv*100).toFixed(0)+'% من الزيارات لكن تحويلها '+w.r.toFixed(1)+'% فقط. راجع الإعلان أو صفحة الهبوط اللي توديها.</li>')});
      if(!weak.length)ins.push('<li>ما فيه قناة كبيرة تحويلها ضعيف بشكل واضح. توزيعك متوازن.</li>')}
    else ins.push('<li>أضف عمود «الطلبات» عشان نحسب أي قناة تجيب عملاء فعلاً، مو بس زيارات.</li>');
    ins.push('<li>'+esc(L[0].s)+' أكبر مصدر زيارات بنسبة '+(L[0].v/tv*100).toFixed(0)+'%.</li>');
    h+='<div><p class="card-t">وش تقول الأرقام</p><ul class="insights">'+ins.join("")+'</ul></div>';
    exportData.traffic=[{name:"حسب المصدر",rows:L.map(function(x){var o={"المصدر":x.s,"الزيارات":x.v};if(cC){o["الطلبات"]=x.c;o["معدل التحويل %"]=+x.r.toFixed(2)}return o})}];
    h+=resActions("traffic","تبي تقرير شهري يقول لك وين تصرف ميزانية الإعلانات؟","مشروع متكامل");
    $("out-traffic").innerHTML=mp+h;return true;
  }
  $("demo-traffic").addEventListener("click",function(){runTraffic(sampleTraffic(),"بيانات تجريبية: متجر إلكتروني لشهر واحد")});
  $("f-traffic").addEventListener("change",function(e){var f=e.target.files[0];e.target.value="";if(!f)return;
    if(!can("file")){meter("traffic");err("traffic",noCredit("file"));return}
    readFile(f,function(rows){spend("file");runTraffic(rows,f.name,null,true)},function(m){err("traffic",m)})});
  /* الإدخال اليدوي ينحسب من الرصيد مثل رفع الملف */
  function noCredit(mode){return can("manual")&&mode==="file"?"رصيدك "+nf(left("sales"))+" ما يكفي لتحليل ملف ("+nf(COST.file)+"). تقدر تدخل البيانات يدويًا بـ "+nf(COST.manual)+" أو تطلب باقة.":"خلص رصيدك. اطلب باقة عشان تكمل."}
  window.__daManual=function(tool,rows){if(!can("manual")){meter(tool);return false}
    spend("manual");(tool==="sales"?runSales:runTraffic)(rows,"بيانات أدخلتها يدويًا",null,false);return true};
  window.__daCredits=function(){return {left:Q.credits===Infinity?Infinity:left("sales"),cost:COST}};

  /* ---------- maintenance requests ---------- */
  var stN=["جديد","قيد التنفيذ","مكتمل"],prN={high:"عالية",mid:"متوسطة",low:"منخفضة"},prO={high:0,mid:1,low:2};
  function age(t){var h=Math.floor((Date.now()-t)/36e5);return h<1?"الحين":h<24?"قبل "+h+" ساعة":"قبل "+Math.floor(h/24)+" يوم"}
  var sharedReqs=null,canWrite=true;
  function reqList(){return shared&&sharedReqs?sharedReqs:mem.reqs}
  function renderReqs(){
    var all=reqList();
    $("m-mode").textContent=shared?"الطلبات هنا مشتركة: أي أحد من فريقك يفتح الصفحة يشوفها ويحدّثها.":"الطلبات محفوظة في هذا المتصفح فقط، وما توصل لأي فريق صيانة.";
    var L=all.slice().sort(function(a,b){return (a.st===2)-(b.st===2)||prO[a.pr]-prO[b.pr]||a.at-b.at});
    var c=[0,0,0],late=0;all.forEach(function(r){c[r.st]++;if(r.st<2&&Date.now()-r.at>48*36e5)late++});
    $("m-counts").innerHTML='<span>جديد: <b class="num">'+c[0]+'</b></span><span>قيد التنفيذ: <b class="num">'+c[1]+'</b></span><span>مكتمل: <b class="num">'+c[2]+'</b></span>'+(late?'<span class="pill late">متأخر: '+late+'</span>':'');
    $("m-list").innerHTML=L.length?L.map(function(r){var isLate=r.st<2&&Date.now()-r.at>48*36e5;
      return '<div class="req p-'+r.pr+(r.st===2?' done':'')+'"><div><div class="t">'+esc(r.title)+(r.ex?' <span class="flag">مثال</span>':'')+'</div>'+
        '<div class="meta"><span class="num">#'+esc(r.id)+'</span><span>'+esc(r.loc||"—")+'</span><span>'+esc(r.who||"بدون مسؤول")+'</span><span>أولوية '+prN[r.pr]+'</span><span>'+age(r.at)+'</span></div></div>'+
        '<div class="req-actions">'+(isLate?'<span class="pill late">متأخر</span>':'')+'<span class="pill s'+r.st+'">'+stN[r.st]+'</span>'+
        (canWrite&&r.st<2?'<button type="button" class="btn btn-ghost btn-sm" data-adv="'+esc(r.key||r.id)+'">'+(r.st===0?'ابدأ التنفيذ':'أنهِ الطلب')+'</button>':'')+
        (canWrite?'<button type="button" class="btn btn-ghost btn-sm" data-del="'+esc(r.key||r.id)+'" aria-label="حذف الطلب">حذف</button>':'')+'</div></div>'}).join(""):'<p class="fmt">ما فيه طلبات. أضف أول طلب من النموذج فوق.</p>';
  }
  function dbFail(){err("maint","ما قدرنا نحفظ التغيير. تأكد من الاتصال وجرّب مرة ثانية.")}
  $("m-list").addEventListener("click",function(e){var a=e.target.closest("[data-adv]"),d=e.target.closest("[data-del]");
    if(shared&&sharedReqs){
      if(a){var r=sharedReqs.find(function(x){return x.key===a.dataset.adv});if(r&&r.st<2)DB.doc("maint/"+r.key).update({st:r.st+1,upd:Date.now()}).catch(dbFail)}
      if(d&&armed(d,"تأكيد الحذف للكل"))DB.doc("maint/"+d.dataset.del).delete().catch(dbFail);
      return}
    if(a){mem.reqs.forEach(function(r){if(r.id===a.dataset.adv&&r.st<2)r.st++});save();renderReqs()}
    if(d){mem.reqs=mem.reqs.filter(function(r){return r.id!==d.dataset.del});save();renderReqs()}});
  $("mform").addEventListener("submit",function(e){e.preventDefault();
    var t=$("m-title").value.trim().slice(0,200);
    if(!t){err("maint","اكتب وصف المشكلة عشان ينضاف الطلب.");return}
    if(!left("maint")){err("maint");meter("maint");return}
    err("maint");mem.made++;
    var r={id:"ص-"+("00"+mem.made).slice(-3),title:t,loc:$("m-loc").value.trim().slice(0,120),pr:PR[$("m-pr").value]?$("m-pr").value:"mid",who:$("m-who").value.trim().slice(0,80),st:0,at:Date.now()};
    if(shared&&sharedReqs){r.id="ص-"+Date.now().toString(36).slice(-4).toUpperCase();r.by=UID;
      DB.collection("maint").add(r).catch(function(){mem.made--;save();meter("maint");dbFail()})}
    else mem.reqs.push(r);
    save();$("m-title").value="";$("m-loc").value="";$("m-who").value="";meter("maint");renderReqs()});
  /* export maintenance requests as a spreadsheet */
  $("m-export").addEventListener("click",async function(){
    var rows=reqList().map(function(r){return {"رقم الطلب":r.id,"المشكلة":r.title,"الموقع":r.loc,"المسؤول":r.who,"الأولوية":prN[r.pr],"الحالة":stN[r.st],"تاريخ الإنشاء":new Date(r.at).toLocaleString("en-GB")}});
    if(!rows.length){err("maint","ما فيه طلبات تصدّرها.");return}
    err("maint");saveXlsx([{name:"طلبات الصيانة",rows:rows}],"طلبات-الصيانة.xlsx",null,function(m){err("maint",m)})});
  /* two-step confirm inside the page (the frame has no confirm dialog) */
  function armed(btn,label){if(btn.dataset.armed==="1")return true;
    var old=btn.textContent;btn.dataset.armed="1";btn.textContent=label;
    setTimeout(function(){if(btn.isConnected){btn.dataset.armed="";btn.textContent=old}},4000);return false}
  /* wipe this device's data (the button itself lives in index.html's privacy section; see site-footer.js) */
  if($("wipe"))$("wipe").addEventListener("click",function(){
    if(!armed(this,"اضغط مرة ثانية للتأكيد"))return;this.dataset.armed="";this.textContent="امسح بياناتي من هذا الجهاز";
    try{localStorage.removeItem("da_free")}catch(x){}
    if(window.__daSysWipe)window.__daSysWipe();
    var keep=mem.used,made=mem.made;load();
    if(DB&&UID){mem.used=keep;mem.made=made} /* the account's usage still counts */
    save();["sales","maint","traffic"].forEach(meter);renderReqs();$("wipe-status").textContent="انمسحت."});

  /* ---------- account-backed storage, when this view offers it ---------- */
  (async function(){
    var user=null,db=null;
    try{if(window.claude&&claude.use){user=await claude.use("user");db=await claude.use("db")}}catch(x){}
    if(!db||!user)return;
    var id=null;try{id=await user.id()}catch(x){}
    if(!id)return;
    var w=null;try{w=user.can?await user.can("data.write"):null}catch(x){}
    if(w===false)return;
    DB=db;UID=id;
    /* usage: the higher of this browser and the account, so clearing the browser does not reset it */
    try{var s=await db.doc("usage/"+id).get();if(s.exists){var u=s.data();
      mem.used.credits=Math.max(mem.used.credits,"credits" in u?cr(u.credits):(int(u.sales)+int(u.traffic))*COST.file);mem.made=Math.max(mem.made,int(u.maint))}}catch(x){}
    save();["sales","maint","traffic"].forEach(meter);
    /* shared maintenance board */
    var timer=setTimeout(function(){if(!sharedReqs){shared=false;renderReqs()}},10000);
    db.collection("maint").orderBy("at","asc").limit(300).onSnapshot(function(snap){
      clearTimeout(timer);shared=true;
      sharedReqs=snap.docs.map(function(d){var r=cleanReq(d.data());if(r)r.key=d.id;return r}).filter(Boolean);
      renderReqs()},function(){clearTimeout(timer);shared=false;sharedReqs=null;renderReqs()});
    /* service requests inbox for the owner */
    var own=false;try{own=!!(user.isOwner&&await user.isOwner())}catch(x){}
    if(own){$("inbox").hidden=false;
      db.collection("leads").onSnapshot(function(snap){
        var items=[];snap.docs.forEach(function(d){var b=d.data()||{};(Array.isArray(b.items)?b.items:[]).forEach(function(it){items.push(it)})});
        items.sort(function(a,b){return (b.at||0)-(a.at||0)});
        $("inbox-list").innerHTML=items.length?items.map(function(it){return '<div class="lead"><div class="meta">'+esc(new Date(int(it.at)).toLocaleString("en-GB"))+'</div><pre>'+esc(String(it.text||"").slice(0,2500))+'</pre></div>'}).join(""):'<p class="fmt">ما وصلت طلبات للحين.</p>'},
        function(){$("inbox-list").innerHTML='<p class="fmt">ما قدرنا نجيب الطلبات الحين.</p>'})}
    window.__daLeads=function(text){var ref=db.doc("leads/"+id);
      return ref.get().then(function(s){var items=s.exists&&Array.isArray(s.data().items)?s.data().items.slice(-19):[];
        items.push({text:text,at:Date.now()});return ref.set({items:items,at:Date.now()})})};
  })();

  ["sales","maint","traffic"].forEach(meter);
  renderReqs();
  runSales(sampleSales(),"بيانات تجريبية: متجر عطور بثلاثة فروع");
  runTraffic(sampleTraffic(),"بيانات تجريبية: متجر إلكتروني لشهر واحد");
})();

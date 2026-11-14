/* ---------- feasibility calculator ---------- */
(function(){
  function $(i){return document.getElementById(i)}
  function n(v){v=Number(v);return isFinite(v)?v:0}
  function fmt(v){return Math.round(v).toLocaleString("en-US")}
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}

  /* ===== GOVERNMENT RATES: the only place these numbers live. Update here when decisions change. ===== */
  var GOV={
    updated:"2026-11-10",
    gosiSaudiEmployer:0.1175,   /* pensions 9% + occupational hazards 2% + SANED 0.75% */
    gosiExpatEmployer:0.02,     /* occupational hazards only */
    gosiCap:45000,              /* monthly contributory wage cap */
    levyHigh:800,               /* per expat per month when expats exceed Saudis */
    levyLow:700,                /* per expat per month when expats do not exceed Saudis */
    smallExempt:2,              /* expats exempt in a 9-or-fewer establishment with full-time owner in GOSI */
    smallExemptMax:9,
    smallExemptEnds:"2027-01-21",
    workPermit:100,             /* per expat per year */
    iqama:650,                  /* per expat per year */
    crConfirm:{est:500,llc:1200}, /* commercial register annual confirmation, due from year 2 */
    chamberFreeYears:3,
    chamberAfter:{est:500,llc:200}, /* reduced subscription after the exemption years (conditions apply) */
    vatRate:0.15,
    vatThreshold:375000,        /* mandatory registration: taxable supplies over this in 12 months */
    zakatRate:0.025,
    incomeTax:0.20,
    sources:[["التأمينات الاجتماعية","https://www.gosi.gov.sa"],["قوى","https://www.qiwa.sa"],["بلدي","https://balady.gov.sa"],["وزارة التجارة","https://mc.gov.sa"],["هيئة الزكاة والضريبة والجمارك","https://zatca.gov.sa"]]
  };
  window.__daGov=GOV;

  var TPL={ /* illustrative inputs only, not market averages */
    cafe:{cust:120,ticket:22,days:30,cogs:35,vatinc:1,sa:2,sasal:5000,ex:4,exsal:3000,owner:0,med:2500,small:false,rent:15000,oth:6000,pay:1.5,dshare:20,dcomm:20,ent:"est",balady:3000,hc:150,govoth:1000,own:"sa",capex:350000,pre:3,ramp:50,weak:2,drop:25,grow:6,inf:3,disc:10},
    rest:{cust:140,ticket:45,days:30,cogs:38,vatinc:1,sa:3,sasal:5500,ex:8,exsal:3200,owner:0,med:2500,small:false,rent:25000,oth:12000,pay:1.5,dshare:30,dcomm:20,ent:"est",balady:4000,hc:150,govoth:1500,own:"sa",capex:600000,pre:4,ramp:50,weak:2,drop:25,grow:5,inf:3,disc:10},
    online:{cust:15,ticket:180,days:30,cogs:55,vatinc:1,sa:2,sasal:6000,ex:0,exsal:0,owner:0,med:2500,small:false,rent:3000,oth:12000,pay:2,dshare:0,dcomm:0,ent:"est",balady:1000,hc:0,govoth:0,own:"sa",capex:120000,pre:2,ramp:40,weak:2,drop:20,grow:12,inf:3,disc:12},
    salon:{cust:20,ticket:120,days:28,cogs:15,vatinc:1,sa:1,sasal:5000,ex:4,exsal:3500,owner:0,med:2500,small:true,rent:12000,oth:5000,pay:1.5,dshare:0,dcomm:0,ent:"est",balady:2000,hc:150,govoth:1000,own:"sa",capex:250000,pre:3,ramp:50,weak:2,drop:20,grow:6,inf:3,disc:10},
    blank:{cust:0,ticket:0,days:30,cogs:30,vatinc:1,sa:0,sasal:5000,ex:0,exsal:3000,owner:0,med:2500,small:false,rent:0,oth:0,pay:1.5,dshare:0,dcomm:0,ent:"est",balady:1000,hc:0,govoth:0,own:"sa",capex:0,pre:2,ramp:50,weak:0,drop:0,grow:5,inf:3,disc:10}};
  var NUM=["cust","ticket","days","cogs","sa","sasal","ex","exsal","owner","med","rent","oth","pay","dshare","dcomm","balady","hc","govoth","capex","pre","wc","ramp","weak","drop","grow","inf","disc"];
  var SEL=["vatinc","ent","own"];
  var wcTouched=false;
  function fill(k){var t=TPL[k];NUM.forEach(function(f){if(f in t)$("c-"+f).value=t[f]});SEL.forEach(function(f){$("c-"+f).value=String(t[f])});$("c-small").checked=!!t.small;wcTouched=false}
  function clamp(v,a,b){return Math.min(b,Math.max(a,v))}
  function read(){var o={};NUM.forEach(function(f){o[f]=Math.max(0,n($("c-"+f).value))});
    o.grow=n($("c-grow").value);o.vatinc=$("c-vatinc").value==="1";o.ent=$("c-ent").value==="llc"?"llc":"est";o.own=$("c-own").value==="fx"?"fx":"sa";o.small=$("c-small").checked;
    o.days=clamp(o.days||30,1,31);o.cogs=clamp(o.cogs,0,100);o.ramp=clamp(o.ramp||100,10,100);o.weak=Math.floor(clamp(o.weak,0,6));o.drop=clamp(o.drop,0,90);
    o.pay=clamp(o.pay,0,10);o.dshare=clamp(o.dshare,0,100);o.dcomm=clamp(o.dcomm,0,60);o.pre=Math.floor(clamp(o.pre,0,24));o.sa=Math.floor(o.sa);o.ex=Math.floor(o.ex);
    return o}

  /* government cost lines for one year, before inflation */
  function govLines(o,year){
    var G=GOV,lines=[],staff=o.sa+o.ex;
    var gosiSa=o.sa*Math.min(o.sasal,G.gosiCap)*G.gosiSaudiEmployer*12,gosiEx=o.ex*Math.min(o.exsal,G.gosiCap)*G.gosiExpatEmployer*12;
    if(gosiSa)lines.push(["التأمينات للسعوديين (حصة المنشأة 11.75%)",gosiSa]);
    if(gosiEx)lines.push(["التأمينات لغير السعوديين (أخطار مهنية 2%)",gosiEx]);
    var exempt=o.small&&staff<=G.smallExemptMax?Math.min(o.ex,G.smallExempt):0,rate=o.ex>o.sa?G.levyHigh:G.levyLow,levy=(o.ex-exempt)*rate*12;
    if(o.ex)lines.push(["المقابل المالي ("+rate+" ر.س شهرياً"+(exempt?"، معفى "+exempt:"")+")",levy]);
    if(o.ex)lines.push(["رخص العمل والإقامات",o.ex*(G.workPermit+G.iqama)]);
    if(staff&&o.med)lines.push(["التأمين الطبي (تقديري)",staff*o.med]);
    if(staff&&o.hc)lines.push(["الشهادات الصحية",staff*o.hc]);
    if(o.balady)lines.push(["رخصة بلدي واللوحة (تقديري)",o.balady]);
    if(year>=2)lines.push(["التأكيد السنوي للسجل التجاري",G.crConfirm[o.ent]]);
    if(year>G.chamberFreeYears)lines.push(["اشتراك الغرفة التجارية",G.chamberAfter[o.ent]]);
    if(o.govoth)lines.push(["رسوم أخرى (سلامة، تصاريح)",o.govoth]);
    return lines}
  function sum(lines){return lines.reduce(function(a,l){return a+l[1]},0)}

  /* monthly model over 60 months after opening */
  function model(o,adj){
    adj=adj||{};var sf=adj.sales==null?1:adj.sales,tf=adj.ticket==null?1:adj.ticket,rf=adj.rent==null?1:adj.rent,salf=adj.sal==null?1:adj.sal,cogs=(o.cogs+(adj.cogsPts||0))/100,delay=adj.delay||0;
    var G=GOV,pre=o.pre+delay,cap=o.capex,initial=-(cap+pre*o.rent*rf);
    var weakSet={};if(o.weak){for(var w=0;w<o.weak;w++)weakSet[Math.round((w+0.5)*12/o.weak)%12]=1}
    var years=[],cum=initial,minCum=initial,payM=null,cfY=[initial],m;
    for(var y=1;y<=5;y++){
      var infl=Math.pow(1+o.inf/100,y-1),gro=Math.pow(1+o.grow/100,y-1),gross=0;
      var mg=[];for(m=1;m<=12;m++){var abs=(y-1)*12+m,ramp=abs<=12?o.ramp/100+(1-o.ramp/100)*(abs-1)/11:1,season=weakSet[m-1]?1-o.drop/100:1;
        var g=o.cust*o.ticket*tf*o.days*sf*ramp*season*gro;mg.push(g);gross+=g}
      var vatOn=gross>G.vatThreshold,vdiv=vatOn&&o.vatinc?1+G.vatRate:1,rev=gross/vdiv;
      var cg=rev*cogs,comm=gross*(o.pay/100+o.dshare/100*o.dcomm/100);
      var salaries=(o.sa*o.sasal+o.ex*o.exsal)*salf*12*infl,owner=o.owner*12*infl;
      var gl=govLines(o,y),gov=sum(gl)*infl;
      var rent=o.rent*rf*12*infl,oth=o.oth*12*infl;
      var pretax=rev-cg-comm-salaries-owner-gov-rent-oth;
      var zak=Math.max(0,pretax)*(o.own==="fx"?G.incomeTax:G.zakatRate);
      var net=pretax-zak;
      var fixedM=(salaries+owner+gov+rent+oth)/12;
      for(m=0;m<12;m++){var gm=mg[m],rm=gm/vdiv,flow=rm-rm*cogs-gm*(o.pay/100+o.dshare/100*o.dcomm/100)-fixedM-(m===11?zak:0);
        var prev=cum;cum+=flow;if(cum<minCum)minCum=cum;if(payM===null&&prev<0&&cum>=0)payM=(y-1)*12+m+1}
      cfY.push(net);
      years.push({y:y,gross:gross,rev:rev,vatOn:vatOn,cogs:cg,comm:comm,sal:salaries+owner,gov:gov,govLines:gl,rent:rent+oth,pretax:pretax,zak:zak,net:net,cum:cum})}
    function npv(r){return cfY.reduce(function(a,cf,i){return a+cf/Math.pow(1+r,i)},0)}
    var irr=null;if(npv(0)>0&&initial<0){var lo=-0.99,hi=10;for(var i=0;i<200;i++){var mid=(lo+hi)/2;if(npv(mid)>0)lo=mid;else hi=mid}irr=lo}
    var y1=years[0],y2=years[1],vd=y2.vatOn&&o.vatinc?1+G.vatRate:1,contrib=1-cogs-vd*(o.pay/100+o.dshare/100*o.dcomm/100),fixedY2=(y2.sal+y2.gov+y2.rent)/12;
    var be=contrib>0?fixedY2/contrib:Infinity;
    return {years:years,initial:-initial,npv:npv(o.disc/100),irr:irr,payM:payM,maxNeed:-minCum,be:be,beCust:o.ticket*o.days>0?be*vd/(o.ticket*o.days):Infinity,
            monthNetY2:y2.net/12,govY1:y1.gov}}
  window.__daFeasModel=model;

  /* chart */
  function chart(years,init){
    var W=440,H=210,pl=50,pr=12,pt=14,pb=26,vals=[-init,0].concat(years.map(function(r){return r.net}),years.map(function(r){return r.cum}));
    var mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals);if(mx===mn)mx+=1;
    var span=mx-mn,step=Math.pow(10,Math.floor(Math.log10(span/4)));var nice=[1,2,5,10].map(function(m){return m*step}).find(function(s){return span/s<=5})||step*10;
    mn=Math.floor(mn/nice)*nice;mx=Math.ceil(mx/nice)*nice;
    var iw=W-pl-pr,ih=H-pt-pb,slot=iw/6;
    function x(i){return document.documentElement.dir==="ltr"?pl+slot*(i+.5):W-pr-slot*(i+.5)}
    function y(v){return pt+(mx-v)/(mx-mn)*ih}
    function k(v){var a=Math.abs(v);return (v<0?"-":"")+(a>=1e6?(a/1e6).toFixed(a>=1e7?0:1)+"M":a>=1e3?Math.round(a/1e3)+"k":Math.round(a))}
    var s="";
    for(var g=mn;g<=mx+1e-9;g+=nice)s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y(g)+'" y2="'+y(g)+'" stroke="var(--line)"'+(Math.abs(g)<1e-9?' stroke-width="1.5"':'')+'/><text x="'+(pl-6)+'" y="'+(y(g)+4)+'" text-anchor="end">'+k(g)+'</text>';
    years.forEach(function(r,i){var bx=x(i+1)-slot*.28,top=y(Math.max(0,r.net)),h=Math.abs(y(r.net)-y(0));
      s+='<rect x="'+bx+'" y="'+top+'" width="'+(slot*.56)+'" height="'+Math.max(1,h)+'" rx="3" fill="'+(r.net>=0?"var(--accent)":"var(--data)")+'" opacity=".85"/>'});
    var pts=[[x(0),y(-init)]].concat(years.map(function(r,i){return [x(i+1),y(r.cum)]}));
    s+='<polyline points="'+pts.map(function(p){return p.join(",")}).join(" ")+'" fill="none" stroke="var(--fg)" stroke-width="2" stroke-linejoin="round"/>';
    pts.forEach(function(p,i){s+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.5" fill="'+(i&&years[i-1].cum>=0?"var(--accent)":"var(--data)")+'" stroke="var(--surface)" stroke-width="1.5"/>'});
    ["البداية","س1","س2","س3","س4","س5"].forEach(function(l,i){s+='<text x="'+x(i)+'" y="'+(H-6)+'" text-anchor="middle">'+l+'</text>'});
    $("c-chart").innerHTML=s}

  function payTxt(pm){return pm===null?"أكثر من ٥ سنوات":pm<12?pm+" شهر":(pm/12).toFixed(1)+" سنة"}
  var last=null;
  /* discount simulator: contribution per unit before vs after a price discount d */
  function dsimCalc(o,m,d){var y2=m.years[1],vd=y2.vatOn&&o.vatinc?1+GOV.vatRate:1,k=o.pay/100+o.dshare/100*o.dcomm/100,c=o.cogs/100;
    var cm0=1-c-k*vd,cm1=cm0-d*(1-k*vd),R=y2.rev/12;
    return {cm0:cm0,cm1:cm1,need:cm1>0?cm0/cm1-1:Infinity,lossMonth:R*d*(1-k*vd),R:R}}
  function dsim(o,m){var el=$("c-dres"),tb=$("c-dtab"),d=clamp(n($("c-dpct").value),0,90)/100;
    if(!o.cust||!o.ticket){el.textContent="اكتب أرقام المبيعات فوق عشان نحسب.";el.className="verdict";tb.innerHTML="";return}
    var r=dsimCalc(o,m,d),bad=false,t;
    if(r.cm0<=0){t="هامشك قبل الخصم سالب أصلاً: كل بيعة تخسر. عالج التكلفة أو السعر قبل أي عرض.";bad=true}
    else if(r.cm1<=0){t="خصم "+Math.round(d*100)+"٪ أكبر من هامشك ("+(r.cm0*100).toFixed(0)+"٪). مع هالخصم كل بيعة تخسر، مهما زاد عدد العملاء.";bad=true}
    else{var add=r.need,cust=o.cust*(1+add);
      t="هامشك "+(r.cm0*100).toFixed(0)+"٪. عشان يعوّض خصم "+Math.round(d*100)+"٪ لازم تزيد المبيعات "+(add*100).toFixed(0)+"٪، يعني تقريباً من "+fmt(o.cust)+" إلى "+fmt(Math.ceil(cust))+" عميل في اليوم. لو العملاء ما زادوا، تخسر قرابة "+fmt(r.lossMonth)+" ر.س شهرياً من الربح.";
      bad=add>0.3}
    el.textContent=t;el.className="verdict"+(bad?" bad":"");
    if(r.cm0>0)tb.innerHTML='<thead><tr><th>الخصم</th><th>الزيادة المطلوبة في المبيعات</th><th>العملاء المطلوبين يومياً</th></tr></thead><tbody>'+[5,10,15,20,25].map(function(p){var x=dsimCalc(o,m,p/100);
      return '<tr><td>'+p+'٪</td><td class="num"'+(x.cm1<=0||x.need>0.5?' style="color:var(--data)"':'')+'>'+(x.cm1<=0?'يخسر دائماً':(x.need*100).toFixed(0)+'٪')+'</td><td class="num">'+(x.cm1<=0?'—':fmt(Math.ceil(o.cust*(1+x.need))))+'</td></tr>'}).join("")+'</tbody>';
    else tb.innerHTML=""}
  function render(){
    var o=read();
    var fixedM=o.rent+o.oth+o.sa*o.sasal+o.ex*o.exsal+o.owner,suggest=Math.round(fixedM*3/1000)*1000;
    $("c-wc-hint").textContent="المقترح: ٣ أشهر من المصاريف الثابتة ≈ "+fmt(suggest)+" ر.س";
    if(!wcTouched){$("c-wc").value=suggest;o.wc=suggest}
    var G=GOV;$("c-small-note").textContent="يعفى أول "+G.smallExempt+" من المقابل المالي بشروط، والإعفاء الحالي ينتهي "+G.smallExemptEnds+" حسب المنشور. تحقق من قوى.";
    var m=model(o);last={o:o,m:m};
    var need=m.maxNeed,have=m.initial+o.wc;
    $("c-kpis").innerHTML=
      '<div class="kpi"><span class="label">متوسط الربح الشهري في السنة الثانية (بعد الزكاة)</span><span class="value num'+(m.monthNetY2<0?' stock-low':'')+'">'+fmt(m.monthNetY2)+' ر.س</span></div>'+
      '<div class="kpi"><span class="label">أقصى مبلغ يحتاجه المشروع</span><span class="value num">'+fmt(need)+' ر.س</span></div>'+
      '<div class="kpi"><span class="label">فترة الاسترداد</span><span class="value">'+payTxt(m.payM)+'</span></div>'+
      '<div class="kpi"><span class="label">التكاليف الحكومية في السنة الأولى</span><span class="value num">'+fmt(m.govY1)+' ر.س</span></div>';
    var v=$("c-verdict"),bad=false,t;
    if(!o.cust||!o.ticket){t="اكتب عدد العملاء ومتوسط الفاتورة عشان تطلع النتائج.";bad=true}
    else if(m.monthNetY2<=0){t="بهذي الأرقام المشروع يخسر بعد ما يستقر. تحتاج تقريباً "+(isFinite(m.beCust)?Math.ceil(m.beCust)+" عميل في اليوم":"مبيعات أعلى")+" عشان تتعادل، أو تخفض المصاريف الثابتة.";bad=true}
    else if(m.payM!==null&&m.payM<=36&&m.npv>0)t="مؤشرات مبدئية إيجابية: ترجع فلوسك خلال "+payTxt(m.payM)+" ونقطة التعادل "+(isFinite(m.beCust)?Math.ceil(m.beCust)+" عميل في اليوم":"—")+". الخطوة الجاية تتأكد من عدد العملاء ومتوسط الفاتورة في السوق.";
    else if(m.npv>0)t="المشروع يربح بس الاسترداد طويل ("+payTxt(m.payM)+"). راجع تكاليف التأسيس أو المصاريف الثابتة قبل القرار.";
    else {t="المشروع يربح بعد ما يستقر، لكن خلال ٥ سنوات ما يغطي استثمارك بالعائد المطلوب ("+o.disc+"%).";bad=true}
    v.textContent=t;v.className="verdict"+(bad?" bad":"");
    var c=$("c-cash");
    if(o.cust&&o.ticket&&need>have){c.hidden=false;c.textContent="انتبه: المشروع يحتاج في أسوأ شهر "+fmt(need)+" ر.س، وأنت راصد "+fmt(have)+" (التأسيس والتجهيز مع الاحتياطي). ارفع الاحتياطي "+fmt(need-have)+" ر.س على الأقل، لأن نقص السيولة في الأشهر الأولى من أكثر أسباب تعثر المشاريع."}else c.hidden=true;
    /* gov table */
    var gl=m.years[0].govLines;
    $("c-gov").innerHTML='<thead><tr><th>البند</th><th>سنوياً (ر.س)</th><th>شهرياً</th></tr></thead><tbody>'+
      (gl.length?gl.map(function(l){return '<tr><td>'+esc(l[0])+'</td><td class="num">'+fmt(l[1])+'</td><td class="num">'+fmt(l[1]/12)+'</td></tr>'}).join("")+
      '<tr><td style="font-weight:600">الإجمالي</td><td class="num" style="font-weight:600">'+fmt(m.govY1)+'</td><td class="num">'+fmt(m.govY1/12)+'</td></tr>':'<tr><td colspan="3" class="sys-note">ما فيه تكاليف حكومية بالمدخلات الحالية.</td></tr>')+
      (m.years[0].vatOn?'<tr><td colspan="3" class="sys-note">مبيعاتك فوق '+fmt(G.vatThreshold)+' ر.س سنوياً، فالتسجيل في ضريبة القيمة المضافة إلزامي، وحسبنا الإيرادات بعد خصم '+(G.vatRate*100)+'%'+(o.vatinc?'':' (أسعارك بدون الضريبة، فتضاف على العميل)')+'.</td></tr>':'')+'</tbody>';
    $("c-gov-src").innerHTML="آخر تحديث للرسوم: <span class=\"num\">"+esc(G.updated)+"</span>. السجل التجاري يبدأ من السنة الثانية، والغرفة التجارية بعد "+G.chamberFreeYears+" سنوات إعفاء. "+(o.own==="fx"?"ضريبة الدخل "+(G.incomeTax*100)+"%":"الزكاة "+(G.zakatRate*100)+"%")+" محسوبة تقديرياً على صافي الربح، والوعاء الفعلي يحدده محاسب. تحقق من: "+
      G.sources.map(function(s){return '<a href="'+s[1]+'" target="_blank" rel="noopener noreferrer">'+esc(s[0])+'</a>'}).join("، ");
    /* sensitivity */
    if(o.cust&&o.ticket){
      var tests=[["المبيعات أقل ٢٠٪",{sales:.8}],["متوسط الفاتورة أقل ١٠٪",{ticket:.9}],["تكلفة البضاعة أعلى ٥ نقاط",{cogsPts:5}],["الرواتب أعلى ١٥٪",{sal:1.15}],["الإيجار أعلى ٢٠٪",{rent:1.2}],["الافتتاح يتأخر ٣ أشهر",{delay:3}],["المبيعات أعلى ٢٠٪",{sales:1.2}]];
      var res=tests.map(function(t){var r=model(o,t[1]);return {l:t[0],r:r,d:r.npv-m.npv}}).sort(function(a,b){return Math.abs(b.d)-Math.abs(a.d)});
      $("c-sens").innerHTML='<thead><tr><th>لو</th><th>الربح الشهري (س2)</th><th>الاسترداد</th><th>أثره على صافي القيمة الحالية</th></tr></thead><tbody>'+
        '<tr><td>الأرقام زي ما هي</td><td class="num">'+fmt(m.monthNetY2)+'</td><td>'+payTxt(m.payM)+'</td><td class="num">'+fmt(m.npv)+'</td></tr>'+
        res.map(function(x){return '<tr><td>'+x.l+'</td><td class="num">'+fmt(x.r.monthNetY2)+'</td><td>'+payTxt(x.r.payM)+'</td><td class="num"'+(x.d<0?' style="color:var(--data)"':'')+'>'+(x.d>=0?"+":"")+fmt(x.d)+'</td></tr>'}).join("")+'</tbody>';
    }else $("c-sens").innerHTML="";
    dsim(o,m);
    var rows=[["الإيرادات (بعد الضريبة)","rev"],["تكلفة البضاعة","cogs"],["عمولات الدفع والتوصيل","comm"],["الرواتب","sal"],["التكاليف الحكومية","gov"],["الإيجار ومصاريف أخرى","rent"],["الربح قبل الزكاة والضريبة","pretax"],[o.own==="fx"?"ضريبة الدخل التقديرية":"الزكاة التقديرية","zak"],["صافي الربح","net"],["الرصيد التراكمي","cum"]];
    $("c-table").innerHTML='<thead><tr><th>البند (ر.س)</th>'+m.years.map(function(r){return '<th>س'+r.y+'</th>'}).join("")+'</tr></thead><tbody>'+
      rows.map(function(rw){return '<tr><td'+(rw[1]==="net"?' style="font-weight:600"':'')+'>'+rw[0]+'</td>'+m.years.map(function(r){return '<td class="num"'+(r[rw[1]]<0?' style="color:var(--data)"':'')+'>'+fmt(r[rw[1]])+'</td>'}).join("")+'</tr>'}).join("")+'</tbody>';
    chart(m.years,m.initial)}

  $("c-tpl").addEventListener("change",function(){if(TPL[this.value]){fill(this.value);render()}});
  window.__daFeasBase=function(){return Object.assign({},TPL.blank)};
  window.__daFeasLoad=function(o){NUM.forEach(function(f){if(f in o)$("c-"+f).value=o[f]});
    SEL.forEach(function(f){if(f in o)$("c-"+f).value=f==="vatinc"?(o[f]?"1":"0"):String(o[f])});$("c-small").checked=!!o.small;
    wcTouched="wc" in o;$("c-tpl").value="custom";render();var c=$("calc");if(c)c.scrollIntoView({behavior:"smooth",block:"start"})};
  $("calc").addEventListener("input",function(e){if(e.target.id==="c-wc")wcTouched=true;render()});
  $("calc").addEventListener("change",render);
  $("c-dpct").addEventListener("input",function(){if(last)dsim(last.o,last.m)});
  $("c-xl").addEventListener("click",function(){if(!last||!window.__daSaveXlsx)return;var o=last.o,m=last.m;
    var labels={cust:"عملاء يومياً",ticket:"متوسط الفاتورة",days:"أيام العمل",cogs:"تكلفة البضاعة %",sa:"موظفين سعوديين",sasal:"راتب السعودي",ex:"موظفين غير سعوديين",exsal:"راتب غير السعودي",owner:"راتب المالك",med:"تأمين طبي سنوي/موظف",rent:"الإيجار",oth:"مصاريف أخرى شهرية",pay:"عمولة الدفع %",dshare:"مبيعات التوصيل %",dcomm:"عمولة التوصيل %",balady:"بلدي سنوياً",hc:"شهادة صحية/عامل",govoth:"رسوم أخرى سنوية",capex:"تكاليف التأسيس",pre:"أشهر التجهيز",wc:"احتياطي السيولة",ramp:"مبيعات أول شهر %",weak:"أشهر ضعيفة",drop:"انخفاضها %",grow:"النمو %",inf:"زيادة المصاريف %",disc:"معدل الخصم %"};
    var inputs=Object.keys(labels).map(function(k){return {"الافتراض":labels[k],"القيمة":o[k]}});
    var pl=m.years.map(function(r){return {"السنة":r.y,"الإيرادات":Math.round(r.rev),"تكلفة البضاعة":Math.round(r.cogs),"العمولات":Math.round(r.comm),"الرواتب":Math.round(r.sal),"التكاليف الحكومية":Math.round(r.gov),"الإيجار وأخرى":Math.round(r.rent),"قبل الزكاة":Math.round(r.pretax),"الزكاة أو الضريبة":Math.round(r.zak),"صافي الربح":Math.round(r.net),"الرصيد التراكمي":Math.round(r.cum)}});
    var gov=m.years[0].govLines.map(function(l){return {"البند":l[0],"سنوياً":Math.round(l[1])}});
    var kp=[["أقصى مبلغ يحتاجه المشروع",Math.round(m.maxNeed)],["فترة الاسترداد (شهر)",m.payM===null?"أكثر من 60":m.payM],["صافي القيمة الحالية",Math.round(m.npv)],["العائد الداخلي %",m.irr===null?"—":+(m.irr*100).toFixed(1)],["آخر تحديث للرسوم",GOV.updated]].map(function(r){return {"المؤشر":r[0],"القيمة":r[1]}});
    window.__daSaveXlsx([{name:"الافتراضات",rows:inputs},{name:"قائمة الدخل",rows:pl},{name:"التكاليف الحكومية",rows:gov.length?gov:[{"البند":"—","سنوياً":0}]},{name:"المؤشرات",rows:kp}],"دراسة-جدوى-مبدئية.xlsx",$("c-xl-st"),function(msg){$("c-xl-st").textContent=msg})});
  $("c-send").addEventListener("click",function(){if(!last)return;var o=last.o,m=last.m,tp=$("c-tpl");
    var txt="أبي دراسة جدوى لمشروع: "+tp.options[tp.selectedIndex].text+"\nتكاليف التأسيس: "+fmt(o.capex)+" ر.س\nعملاء يومياً: "+o.cust+" · متوسط الفاتورة: "+o.ticket+" ر.س\nالموظفين: "+o.sa+" سعودي و"+o.ex+" غير سعودي\nنتيجة الحاسبة: ربح شهري "+fmt(m.monthNetY2)+" ر.س في السنة الثانية، أقصى احتياج "+fmt(m.maxNeed)+" ر.س، استرداد "+payTxt(m.payM);
    var t=$("f-type"),msg=$("f-msg");if(t)t.value="دراسة جدوى تفصيلية";if(msg)msg.value=txt.slice(0,2000);
    var c=$("contact");if(c)c.scrollIntoView({behavior:"smooth",block:"start"});setTimeout(function(){var nm=$("f-name");if(nm)nm.focus({preventScroll:true})},500)});
  fill("cafe");render();
})();

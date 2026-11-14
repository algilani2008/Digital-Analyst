/* ---------- systems demos: CRM, inventory, HR (stored in this browser) ---------- */
(function(){
  function $(i){return document.getElementById(i)}
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  function n(v){v=Number(v);return isFinite(v)&&v>=0?v:0}
  function fmt(v){return Math.round(v).toLocaleString("en-US")}
  function day(off){var d=new Date();d.setDate(d.getDate()+(off||0));return d.toISOString().slice(0,10)}
  function today(){return day(0)}
  function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6)}
  function err(k,t){var e=$(k+"-err");e.textContent=t||"";e.hidden=!t}
  function armed(btn,label){if(btn.dataset.armed==="1")return true;var old=btn.textContent;btn.dataset.armed="1";btn.textContent=label;
    setTimeout(function(){if(btn.isConnected){btn.dataset.armed="";btn.textContent=old}},4000);return false}
  var KEY="da_sys_v1";
  function seed(){return {
    crm:[{id:uid(),name:"مطعم الريف",val:18000,st:2,next:day(1)},{id:uid(),name:"صيدلية الشفاء",val:9500,st:1,next:day(-2)},
         {id:uid(),name:"متجر أناقة",val:24000,st:0,next:day(0)},{id:uid(),name:"مؤسسة البناء الحديث",val:41000,st:3,next:""},
         {id:uid(),name:"كافيه سحاب",val:7000,st:4,next:""}],
    inv:[{id:uid(),name:"أكواب ورق 12 أونص",qty:180,min:200,cost:.35},{id:uid(),name:"حبوب قهوة (كيلو)",qty:42,min:20,cost:85},
         {id:uid(),name:"حليب (كرتون)",qty:0,min:30,cost:62},{id:uid(),name:"أغطية أكواب",qty:640,min:200,cost:.12}],
    log:[],
    emps:[{id:"e1",name:"سارة العتيبي",dept:"المبيعات",bal:21},{id:"e2",name:"خالد الحربي",dept:"العمليات",bal:9},{id:"e3",name:"نورة القحطاني",dept:"المالية",bal:15}],
    leaves:[{id:uid(),emp:"e2",from:day(2),days:3,st:0},{id:uid(),emp:"e1",from:day(-1),days:2,st:1}],
    ex:true}}
  var S;
  function load(){try{S=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){S=null}
    if(!S||typeof S!=="object"||!Array.isArray(S.crm)||!Array.isArray(S.inv)||!Array.isArray(S.emps)||!Array.isArray(S.leaves))S=seed();
    if(!Array.isArray(S.log))S.log=[];
    S.crm=S.crm.slice(0,300);S.inv=S.inv.slice(0,300);S.emps=S.emps.slice(0,200);S.leaves=S.leaves.slice(-300);S.log=S.log.slice(-50)}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
  load();

  /* tabs */
  document.querySelectorAll("[data-s]").forEach(function(b){b.addEventListener("click",function(){
    document.querySelectorAll("[data-s]").forEach(function(o){o.setAttribute("aria-pressed",String(o===b))});
    ["crm","inv","hr"].forEach(function(k){$("s-"+k).hidden=k!==b.dataset.s})})});

  /* ---- CRM ---- */
  var STG=["جديد","تواصلنا","عرض سعر","تم البيع","خسرناه"];
  function renderCrm(){
    var open=S.crm.filter(function(d){return d.st<3}),won=S.crm.filter(function(d){return d.st===3}),lost=S.crm.filter(function(d){return d.st===4});
    var due=open.filter(function(d){return d.next&&d.next<=today()}).length,closed=won.length+lost.length;
    $("crm-kpis").innerHTML=
      '<div class="kpi"><span class="label">قيمة الفرص المفتوحة</span><span class="value num">'+fmt(open.reduce(function(a,d){return a+n(d.val)},0))+' ر.س</span></div>'+
      '<div class="kpi"><span class="label">المبيعات المغلقة</span><span class="value num">'+fmt(won.reduce(function(a,d){return a+n(d.val)},0))+' ر.س</span></div>'+
      '<div class="kpi"><span class="label">نسبة الإغلاق</span><span class="value num">'+(closed?Math.round(won.length/closed*100)+'%':'—')+'</span></div>'+
      '<div class="kpi"><span class="label">متابعات اليوم أو متأخرة</span><span class="value num'+(due?' stock-low':'')+'">'+due+'</span></div>';
    $("crm-board").innerHTML=STG.map(function(s,i){var L=S.crm.filter(function(d){return d.st===i});
      return '<div class="col"><div class="col-h"><span>'+s+'</span><span class="num">'+L.length+' · '+fmt(L.reduce(function(a,d){return a+n(d.val)},0))+'</span></div>'+
        (L.length?L.map(function(d){var late=i<3&&d.next&&d.next<today(),now=i<3&&d.next===today();
          return '<div class="card"><span class="t">'+esc(d.name)+'</span><div class="meta"><span class="num">'+fmt(n(d.val))+' ر.س</span>'+
            (i<3&&d.next?'<span'+(late?' class="stock-low"':'')+'>'+(late?'متابعة متأخرة ':now?'تابع اليوم ':'متابعة ')+'<span class="num">'+esc(d.next)+'</span></span>':'')+'</div>'+
            '<div class="acts">'+(i<3?'<button type="button" class="btn btn-ghost" data-crm="next" data-id="'+esc(d.id)+'">'+(i===2?'تم البيع':'المرحلة التالية')+'</button><button type="button" class="btn btn-ghost" data-crm="lost" data-id="'+esc(d.id)+'">خسرناه</button>':'')+
            '<button type="button" class="btn btn-ghost" data-crm="del" data-id="'+esc(d.id)+'">حذف</button></div></div>'}).join(""):'<p class="sys-note">ما فيه</p>')+'</div>'}).join("");
  }
  $("crm-board").addEventListener("click",function(e){var b=e.target.closest("[data-crm]");if(!b)return;
    var d=S.crm.find(function(x){return x.id===b.dataset.id});if(!d)return;
    if(b.dataset.crm==="next")d.st=Math.min(3,d.st+1);
    else if(b.dataset.crm==="lost")d.st=4;
    else if(b.dataset.crm==="del"){if(!armed(b,"تأكيد"))return;S.crm=S.crm.filter(function(x){return x!==d})}
    save();renderCrm()});
  $("crm-form").addEventListener("submit",function(e){e.preventDefault();
    var nm=$("crm-name").value.trim().slice(0,80);if(!nm){err("crm","اكتب اسم العميل أو الجهة.");return}
    err("crm");S.crm.push({id:uid(),name:nm,val:n($("crm-val").value),st:0,next:$("crm-next").value||day(1)});
    $("crm-name").value="";$("crm-val").value="";$("crm-next").value="";save();renderCrm()});

  /* ---- Inventory ---- */
  function status(it){return it.qty<=0?["نفد","late"]:it.qty<=it.min?["اطلب الحين","s0"]:["متوفر","s1"]}
  function renderInv(){
    var low=S.inv.filter(function(i){return i.qty>0&&i.qty<=i.min}).length,out=S.inv.filter(function(i){return i.qty<=0}).length;
    $("inv-kpis").innerHTML=
      '<div class="kpi"><span class="label">قيمة المخزون</span><span class="value num">'+fmt(S.inv.reduce(function(a,i){return a+n(i.qty)*n(i.cost)},0))+' ر.س</span></div>'+
      '<div class="kpi"><span class="label">عدد الأصناف</span><span class="value num">'+S.inv.length+'</span></div>'+
      '<div class="kpi"><span class="label">تحت حد الطلب</span><span class="value num'+(low?' stock-low':'')+'">'+low+'</span></div>'+
      '<div class="kpi"><span class="label">نفدت</span><span class="value num'+(out?' stock-low':'')+'">'+out+'</span></div>';
    var L=S.inv.slice().sort(function(a,b){return (a.qty/(a.min||1))-(b.qty/(b.min||1))});
    $("inv-body").innerHTML=L.length?L.map(function(i){var s=status(i);
      return '<tr><td>'+esc(i.name)+'</td><td class="num">'+fmt(i.qty)+'</td><td class="num">'+fmt(i.min)+'</td><td class="num">'+fmt(i.qty*i.cost)+'</td><td><span class="pill '+s[1]+'">'+s[0]+'</span></td>'+
        '<td><span style="display:flex;gap:4px;align-items:center;flex-wrap:wrap"><input class="qty" type="number" min="1" aria-label="الكمية لـ'+esc(i.name)+'" id="q-'+esc(i.id)+'"><button type="button" class="btn btn-ghost btn-sm" data-inv="in" data-id="'+esc(i.id)+'">وارد</button><button type="button" class="btn btn-ghost btn-sm" data-inv="out" data-id="'+esc(i.id)+'">صرف</button><button type="button" class="btn btn-ghost btn-sm" data-inv="del" data-id="'+esc(i.id)+'">حذف</button></span></td></tr>'}).join(""):
      '<tr><td colspan="6" class="sys-note">ما فيه أصناف. أضف أول صنف من النموذج فوق.</td></tr>';
    $("inv-log").innerHTML=S.log.length?S.log.slice(-8).reverse().map(function(l){return '<li>'+(l.t==="in"?"وارد":"صرف")+' <span class="num">'+fmt(l.q)+'</span> من '+esc(l.name)+' · <span class="num">'+esc(l.d)+'</span></li>'}).join(""):'<li>ما فيه حركات للحين. اكتب كمية واضغط وارد أو صرف.</li>';
  }
  $("inv-body").addEventListener("click",function(e){var b=e.target.closest("[data-inv]");if(!b)return;
    var it=S.inv.find(function(x){return x.id===b.dataset.id});if(!it)return;
    if(b.dataset.inv==="del"){if(!armed(b,"تأكيد"))return;S.inv=S.inv.filter(function(x){return x!==it});save();renderInv();return}
    var q=Math.floor(n(($("q-"+it.id)||{}).value));if(!q){err("inv","اكتب الكمية في الخانة جنب الصنف.");return}
    if(b.dataset.inv==="out"&&q>it.qty){err("inv","الكمية المطلوبة ("+q+") أكثر من المتوفر ("+it.qty+") في "+it.name+".");return}
    err("inv");it.qty+=b.dataset.inv==="in"?q:-q;S.log.push({t:b.dataset.inv,q:q,name:it.name,d:today()});S.log=S.log.slice(-50);save();renderInv()});
  $("inv-form").addEventListener("submit",function(e){e.preventDefault();
    var nm=$("inv-name").value.trim().slice(0,80);if(!nm){err("inv","اكتب اسم الصنف.");return}
    err("inv");S.inv.push({id:uid(),name:nm,qty:Math.floor(n($("inv-qty").value)),min:Math.floor(n($("inv-min").value)),cost:n($("inv-cost").value)});
    ["inv-name","inv-qty","inv-min","inv-cost"].forEach(function(i){$(i).value=""});save();renderInv()});

  /* ---- HR ---- */
  var LST=["بانتظار الموافقة","معتمدة","مرفوضة"];
  function emp(id){return S.emps.find(function(x){return x.id===id})}
  function endOf(l){var d=new Date(l.from);d.setDate(d.getDate()+l.days-1);return d.toISOString().slice(0,10)}
  function renderHr(){
    var t=today(),pend=S.leaves.filter(function(l){return l.st===0}).length,
        off=S.leaves.filter(function(l){return l.st===1&&l.from<=t&&endOf(l)>=t}).length;
    $("hr-kpis").innerHTML=
      '<div class="kpi"><span class="label">الموظفين</span><span class="value num">'+S.emps.length+'</span></div>'+
      '<div class="kpi"><span class="label">طلبات بانتظار الموافقة</span><span class="value num'+(pend?' stock-low':'')+'">'+pend+'</span></div>'+
      '<div class="kpi"><span class="label">في إجازة اليوم</span><span class="value num">'+off+'</span></div>'+
      '<div class="kpi"><span class="label">متوسط رصيد الإجازة</span><span class="value num">'+(S.emps.length?Math.round(S.emps.reduce(function(a,e){return a+n(e.bal)},0)/S.emps.length):0)+' يوم</span></div>';
    $("hr-emp").innerHTML=S.emps.map(function(e){return '<option value="'+esc(e.id)+'">'+esc(e.name)+'</option>'}).join("");
    $("hr-emps").innerHTML=S.emps.length?S.emps.map(function(e){return '<tr><td>'+esc(e.name)+'</td><td>'+esc(e.dept||"—")+'</td><td class="num">'+n(e.bal)+' يوم</td></tr>'}).join(""):'<tr><td colspan="3" class="sys-note">أضف أول موظف.</td></tr>';
    var L=S.leaves.slice().sort(function(a,b){return a.st-b.st||(a.from<b.from?-1:1)});
    $("hr-reqs").innerHTML=L.length?L.map(function(l){var e=emp(l.emp)||{name:"موظف محذوف",bal:0};
      return '<div class="req'+(l.st===0?' p-high':l.st===1?' p-mid':' done')+'"><div><div class="t">'+esc(e.name)+' · <span class="num">'+l.days+'</span> أيام</div>'+
        '<div class="meta"><span>من <span class="num">'+esc(l.from)+'</span> إلى <span class="num">'+esc(endOf(l))+'</span></span><span>الرصيد الحالي <span class="num">'+n(e.bal)+'</span></span></div></div>'+
        '<div class="req-actions"><span class="pill s'+(l.st===0?0:l.st===1?1:2)+'">'+LST[l.st]+'</span>'+
        (l.st===0?'<button type="button" class="btn btn-ghost btn-sm" data-hr="ok" data-id="'+esc(l.id)+'">اعتمد</button><button type="button" class="btn btn-ghost btn-sm" data-hr="no" data-id="'+esc(l.id)+'">ارفض</button>':'')+'</div></div>'}).join(""):'<p class="sys-note">ما فيه طلبات إجازة.</p>';
  }
  $("hr-reqs").addEventListener("click",function(e){var b=e.target.closest("[data-hr]");if(!b)return;
    var l=S.leaves.find(function(x){return x.id===b.dataset.id});if(!l||l.st!==0)return;var em=emp(l.emp);
    if(b.dataset.hr==="ok"){if(!em||em.bal<l.days){err("hr","رصيد "+(em?em.name:"الموظف")+" ما يكفي ("+(em?em.bal:0)+" يوم). ارفض الطلب أو عدّل عدد الأيام.");return}em.bal-=l.days;l.st=1}
    else l.st=2;
    err("hr");save();renderHr()});
  $("hr-form").addEventListener("submit",function(e){e.preventDefault();
    var id=$("hr-emp").value,from=$("hr-from").value,d=Math.floor(n($("hr-days").value));
    if(!id){err("hr","أضف موظف أول.");return}if(!from){err("hr","اختر تاريخ بداية الإجازة.");return}if(!d||d>60){err("hr","عدد الأيام لازم يكون بين 1 و 60.");return}
    err("hr");S.leaves.push({id:uid(),emp:id,from:from,days:d,st:0});$("hr-from").value="";$("hr-days").value="";save();renderHr()});
  $("hr-add").addEventListener("submit",function(e){e.preventDefault();
    var nm=$("hr-nm").value.trim().slice(0,60);if(!nm){err("hr","اكتب اسم الموظف.");return}
    err("hr");S.emps.push({id:uid(),name:nm,dept:$("hr-dp").value.trim().slice(0,40),bal:21});$("hr-nm").value="";$("hr-dp").value="";save();renderHr()});

  /* export + reset */
  document.addEventListener("click",function(e){var b=e.target.closest("[data-sx]");if(!b)return;var k=b.dataset.sx,sheets;
    if(!window.__daSaveXlsx){err(k,"التصدير ما تحمّل. حدّث الصفحة.");return}
    if(k==="crm")sheets=[{name:"الفرص",rows:S.crm.map(function(d){return {"العميل":d.name,"القيمة (ر.س)":n(d.val),"المرحلة":STG[d.st],"المتابعة القادمة":d.next||""}})}];
    else if(k==="inv")sheets=[{name:"المخزون",rows:S.inv.map(function(i){return {"الصنف":i.name,"الكمية":i.qty,"حد الطلب":i.min,"تكلفة الوحدة":i.cost,"القيمة":+(i.qty*i.cost).toFixed(2),"الحالة":status(i)[0]}})}].concat(S.log.length?[{name:"الحركات",rows:S.log.map(function(l){return {"التاريخ":l.d,"النوع":l.t==="in"?"وارد":"صرف","الصنف":l.name,"الكمية":l.q}})}]:[]);
    else sheets=[{name:"الموظفين",rows:S.emps.map(function(x){return {"الاسم":x.name,"القسم":x.dept,"رصيد الإجازة":x.bal}})}].concat(S.leaves.length?[{name:"الإجازات",rows:S.leaves.map(function(l){var em=emp(l.emp);return {"الموظف":em?em.name:"—","من":l.from,"إلى":endOf(l),"الأيام":l.days,"الحالة":LST[l.st]}})}]:[]);
    if(!sheets[0].rows.length){err(k,"ما فيه بيانات تصدّرها.");return}
    window.__daSaveXlsx(sheets,{crm:"العملاء-والمبيعات.xlsx",inv:"المخزون.xlsx",hr:"الموارد-البشرية.xlsx"}[k],$("sx-"+k),function(m){err(k,m)})});
  $("sys-reset").addEventListener("click",function(){if(!armed(this,"اضغط مرة ثانية للتأكيد"))return;this.dataset.armed="";this.textContent="ارجع للبيانات التجريبية";
    S=seed();save();renderCrm();renderInv();renderHr()});

  window.__daSysWipe=function(){try{localStorage.removeItem(KEY)}catch(e){}S=seed();renderCrm();renderInv();renderHr()};
  renderCrm();renderInv();renderHr();
})();

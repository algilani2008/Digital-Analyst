(function(){
  var $=function(i){return document.getElementById(i)},role="client";
  var TXT={
    client:{t:"بوابة العملاء",lead:"كل شي يخص مشروعك في مكان واحد.",list:["أدوات التحليل بحدود باقتك","مراحل مشروعك وحالة كل مرحلة","تقاريرك ولوحاتك الشهرية","طلباتك وردودنا عليها","فواتيرك واشتراكك"],ft:"دخول العملاء",fl:"استخدم اسم المستخدم وكلمة المرور اللي وصلتك منا."},
    owner:{t:"مركز التحكم",lead:"إدارة العملاء والباقات والمشاريع من شاشة وحدة.",list:["العملاء وحسابات دخولهم","الباقات وحدود الاستخدام","المشاريع ومراحلها","الطلبات والردود","التقارير والفواتير"],ft:"دخول المالك",fl:"هذا الدخول لمالك الموقع فقط."}};
  $("wa").href="https://wa.me/966569184730?text="+encodeURIComponent("السلام عليكم، نسيت كلمة مرور بوابة العملاء في العالم الرقمي.");
  function paint(){var x=TXT[role];$("side-title").textContent=x.t;$("side-lead").textContent=x.lead;
    $("side-list").innerHTML=x.list.map(function(l){return "<li>"+UI.esc(l)+"</li>"}).join("");
    $("form-title").textContent=x.ft;$("form-lead").textContent=x.fl;$("help").hidden=role!=="client";
    document.querySelectorAll("[data-role]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.role===role))});
    $("err").textContent="";document.title=x.t+" | العالم الرقمي";checkSetup()}
  async function checkSetup(){var has=true;try{has=await DA.hasOwner()}catch(e){}
    var setup=role==="owner"&&!has;$("setup").hidden=!setup;$("login").hidden=setup;
    var n=$("demo-note");n.hidden=DA.MODE!=="demo";
    if(DA.MODE==="demo")n.innerHTML="<b>وضع تجريبي:</b> الحسابات والبيانات محفوظة في هذا المتصفح فقط لين نربط الموقع بخادم Hostinger."+(role==="client"&&has?" للتجربة: اسم المستخدم <span class=\"num\">cafe</span> وكلمة المرور <span class=\"num\">Demo-2026</span>.":role==="client"?" ادخل مركز التحكم أول عشان تتجهز البيانات التجريبية.":"")}
  document.querySelectorAll("[data-role]").forEach(function(b){b.onclick=function(){role=b.dataset.role;paint()}});
  $("show").onclick=function(){var p=$("p");p.type=p.type==="password"?"text":"password";this.textContent=p.type==="password"?"إظهار":"إخفاء"};
  function go(s){location.href=s.role==="owner"?"admin/":"portal/"}
  $("login").onsubmit=async function(e){e.preventDefault();var u=$("u").value.trim(),p=$("p").value;
    if(!u||!p){$("err").textContent="اكتب اسم المستخدم وكلمة المرور.";return}
    $("go").disabled=true;$("go").textContent="جاري التحقق…";
    try{go(await DA.login(u,p,role))}catch(x){$("err").textContent=x.message;$("go").disabled=false;$("go").textContent="دخول"}};
  $("setup").onsubmit=async function(e){e.preventDefault();var er=$("s-err");
    if($("s-p").value!==$("s-p2").value){er.textContent="كلمتا المرور غير متطابقتين.";return}
    try{go(await DA.setupOwner($("s-name").value.trim(),$("s-u").value.trim(),$("s-p").value))}catch(x){er.textContent=x.message}};
  var s=DA.session();if(s){go(s);return}
  if(new URLSearchParams(location.search).get("as")==="owner")role="owner";
  paint();
})();

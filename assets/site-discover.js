(function(){
  var months=["ديس","نوف","أكت","سبت","أغس","يول","يون","ماي","أبر","مار","فبر","ينا"].reverse();
  var data={
    visits:{v:[4200,4800,5100,4900,5600,6200,6900,7400,7100,8000,8600,9300],fmt:function(n){return n.toLocaleString("en-US")},step:2000,max:10000},
    conv:{v:[1.8,2.0,2.1,1.9,2.3,2.4,2.6,2.8,2.7,3.0,3.1,3.3],fmt:function(n){return n.toFixed(1)+"%"},step:1,max:4}
  };
  var svg=document.getElementById("chart"),W=440,H=200,pl=40,pr=12,pt=14,pb=28,ns="http://www.w3.org/2000/svg";
  function el(t,a){var e=document.createElementNS(ns,t);for(var k in a)e.setAttribute(k,a[k]);return e}
  function draw(key){
    var d=data[key],n=d.v.length,iw=W-pl-pr,ih=H-pt-pb;
    // RTL time axis: first month on the right
    function x(i){return document.documentElement.dir==="ltr"?pl+(i/(n-1))*iw:W-pr-(i/(n-1))*iw}
    function y(v){return pt+ih-(v/d.max)*ih}
    svg.innerHTML="";
    for(var g=0;g<=d.max+1e-9;g+=d.step){
      svg.appendChild(el("line",{x1:pl,x2:W-pr,y1:y(g),y2:y(g),stroke:"var(--line)","stroke-width":1}));
      var t=el("text",{x:pl-6,y:y(g)+4,"text-anchor":"end"});t.textContent=key==="conv"?g+"%":(g/1000)+"k";svg.appendChild(t);
    }
    [0,3,6,9,11].forEach(function(i){var t=el("text",{x:x(i),y:H-8,"text-anchor":"middle"});t.textContent=months[i];svg.appendChild(t)});
    var pts=d.v.map(function(v,i){return x(i)+","+y(v)});
    var grad=el("linearGradient",{id:"ga",x1:0,y1:0,x2:0,y2:1});
    grad.appendChild(el("stop",{offset:"0","stop-color":"var(--accent)","stop-opacity":".22"}));
    grad.appendChild(el("stop",{offset:"1","stop-color":"var(--accent)","stop-opacity":"0"}));
    var defs=el("defs",{});defs.appendChild(grad);svg.appendChild(defs);
    svg.appendChild(el("polygon",{points:pts.join(" ")+" "+x(n-1)+","+y(0)+" "+x(0)+","+y(0),fill:"url(#ga)"}));
    svg.appendChild(el("polyline",{class:"line-path",points:pts.join(" "),fill:"none",stroke:"var(--accent)","stroke-width":2.5,"stroke-linejoin":"round","stroke-linecap":"round"}));
    var lx=x(n-1),ly=y(d.v[n-1]);
    svg.appendChild(el("circle",{cx:lx,cy:ly,r:5,fill:"var(--data)",stroke:"var(--surface)","stroke-width":2}));
    var lab=el("text",{x:lx+8,y:ly-8,"text-anchor":"start",style:"fill:var(--fg);font-weight:600"});lab.textContent=d.fmt(d.v[n-1]);svg.appendChild(lab);
    var first=d.v[0],last=d.v[n-1];
    document.getElementById("k3").textContent="+"+Math.round((last-first)/first*100)+"%";
  }
  document.querySelectorAll(".tabs button[data-k]").forEach(function(b){
    b.addEventListener("click",function(){
      document.querySelectorAll(".tabs button[data-k]").forEach(function(o){o.setAttribute("aria-pressed",String(o===b))});
      draw(b.dataset.k);
    });
  });
  draw("visits");

  /* ---------- contact details: fill these in and they appear across the page ---------- */
  /* روابط التواصل الأساسية في assets/site-footer.js (يحمّل قبل هذا الملف). نفس بيانات الاتصال هناك. */
  var CONTACT={whatsapp:"966569184730",email:""}; /* whatsapp: international digits only, e.g. 9665XXXXXXXX */
  function $id(i){return document.getElementById(i)}
  function waLink(text){return window.__daWaLink?window.__daWaLink(text):(CONTACT.whatsapp?"https://wa.me/"+CONTACT.whatsapp.replace(/\D/g,"")+(text?"?text="+encodeURIComponent(text):""):"")}
  function mailLink(text){return CONTACT.email?"mailto:"+CONTACT.email+"?subject="+encodeURIComponent("طلب خدمة: العالم الرقمي")+(text?"&body="+encodeURIComponent(text):""):""}
  function reachLinks(text,small){var c=small?" btn-sm":"",out=[];
    var w=waLink(text),m=mailLink(text);
    if(w){var a=document.createElement("a");a.className="btn btn-primary"+c;a.href=w;a.target="_blank";a.rel="noopener noreferrer";a.textContent="واتساب";out.push(a)}
    if(m){var b=document.createElement("span");b.className="chip";b.style.userSelect="all";b.dir="ltr";b.textContent=CONTACT.email;out.push(b)}
    return out}
  function fillReach(el,text,small){el.textContent="";reachLinks(text,small).forEach(function(a){el.appendChild(a)})}
  fillReach($id("reach"),"السلام عليكم، اطلعت على خدمات العالم الرقمي وأبي أناقش احتياج منشأتي.");

  var form=$id("req"),sending=false;
  /* الوصول من صفحة ثانية (الأدوات، الأنظمة، دراسات الجدوى) بنوع خدمة أو رسالة جاهزة: ?pkg=...&msg=... */
  (function(){
    var qs=new URLSearchParams(location.search),pkg=qs.get("pkg"),msg=qs.get("msg");
    if(!pkg&&!msg)return;
    var sel=$id("f-type");
    if(pkg&&sel){var opt=[].find.call(sel.options,function(o){return o.value===pkg});if(opt)sel.value=pkg}
    if(msg)$id("f-msg").value=msg.slice(0,2000);
    try{history.replaceState(null,"",location.pathname+location.hash)}catch(e){}
    var c=$id("contact");if(c)setTimeout(function(){c.scrollIntoView({behavior:"smooth",block:"start"});var nm=$id("f-name");if(nm)nm.focus({preventScroll:true})},300);
  })();
  function looksLikeContact(s){return /^[+\d][\d\s-]{7,16}$/.test(s)||/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)}
  form.addEventListener("submit",async function(e){
    e.preventDefault();if(sending)return;
    var name=$id("f-name").value.trim().slice(0,80),msg=$id("f-msg").value.trim().slice(0,2000),ct=$id("f-contact").value.trim().slice(0,80);
    $id("e-name").textContent=name?"":"اكتب اسمك عشان نعرف نخاطبك.";
    $id("e-contact").textContent=!ct?"اكتب جوالك أو إيميلك عشان نرد عليك.":(looksLikeContact(ct)?"":"اكتب رقم جوال أو إيميل صحيح.");
    $id("e-msg").textContent=msg?"":"اكتب وصف مختصر للي تحتاجه.";
    if(!name||!msg||!ct||!looksLikeContact(ct))return;
    var txt="السلام عليكم،\nالاسم: "+name+
      "\nالتواصل: "+ct+
      "\nالجهة: "+($id("f-org").value.trim().slice(0,120)||"—")+
      "\nنوع الخدمة: "+$id("f-type").value+
      "\nالموعد المتوقع: "+$id("f-time").value+
      "\nالتفاصيل: "+msg;
    $id("out-text").textContent=txt;$id("copy-status").textContent="";
    var sent=false;
    if(window.__daLeads){sending=true;$id("send").disabled=true;$id("send").textContent="جاري الإرسال…";
      try{await window.__daLeads(txt);sent=true}catch(x){}
      sending=false;$id("send").disabled=false;$id("send").textContent="أرسل الطلب"}
    $id("out-title").textContent=sent?"وصلنا طلبك، شكراً لك":"طلبك جاهز";
    $id("out-note").textContent=sent?"نرد عليك على "+ct+" في أقرب وقت. هذي نسخة من طلبك:":
      (CONTACT.whatsapp||CONTACT.email?"أرسله لنا بضغطة من الأزرار تحت:":"انسخ الطلب وأرسله لنا:");
    fillReach($id("out-reach"),sent?"":txt,true);
    $id("copy").hidden=sent;
    $id("out").hidden=false;
    if(sent){$id("f-msg").value=""}
  });
  $id("copy").addEventListener("click",function(){
    var pre=document.getElementById("out-text"),s=document.getElementById("copy-status");
    function fallback(){var r=document.createRange();r.selectNodeContents(pre);var sel=getSelection();sel.removeAllRanges();sel.addRange(r);s.textContent="حدّدنا النص، انسخه يدوياً."}
    try{navigator.clipboard.writeText(pre.textContent).then(function(){s.textContent="انتسخ الطلب."},fallback)}catch(err){fallback()}
  });
})();

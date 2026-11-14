/* ---------- needs finder: turns plain-language problems into an analysis plan ---------- */
(function(){
  function $(i){return document.getElementById(i)}
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
  var SECTORS=[
    ["food","مطعم أو كافيه",["أكثر الأطباق مبيعاً وربحية","ساعات وأيام الذروة","نسبة الهدر في المواد"]],
    ["retail","متجر أو فروع تجزئة",["المبيعات لكل متر أو فرع","أداء العروض والخصومات"]],
    ["online","متجر إلكتروني",["السلات المتروكة","نسبة الإرجاع","تكلفة الشحن من الطلب"]],
    ["service","عيادة أو خدمات",["نسبة الحضور للمواعيد","الإيراد لكل مقدم خدمة","الطاقة المستغلة من المواعيد"]],
    ["project","مقاولات أو صيانة",["الإنجاز الفعلي مقابل الخطة","التكلفة الفعلية مقابل المقدّرة"]],
    ["other","منشأة أخرى",[]]
  ];
  var PAINS={
    newproj:{label:"أبي أفتح مشروع جديد وما أدري يستاهل",title:"دراسة جدوى للمشروع",
      q:["هل فيه طلب كافي على المشروع في المكان اللي تبيه؟","كم يكلف التأسيس والتشغيل الشهري؟","متى تتعادل ومتى ترجع فلوسك؟"],
      kpi:["تكاليف التأسيس","نقطة التعادل","فترة الاسترداد","صافي القيمة الحالية والعائد"],
      data:"فكرة المشروع، والموقع المقترح، والميزانية المتاحة تقريباً",link:"#feasibility",linkText:"جرّب حاسبة الجدوى"},
    sales:{label:"المبيعات: ما أعرف وش يبيع ووش واقف",title:"تحليل المبيعات",
      q:["أي الفروع والمنتجات تجيب أغلب الدخل؟","وش الأصناف البطيئة اللي حاجزة فلوسك؟","متى مواسمك وأيام الذروة؟"],
      kpi:["نمو المبيعات","متوسط قيمة الفاتورة","المبيعات حسب الفرع والصنف","الأصناف البطيئة"],
      data:"تقرير مبيعات أو فواتير من نظام نقاط البيع أو Excel",tool:"sales"},
    marketing:{label:"الإعلانات: أصرف وما أعرف وش يجيب نتيجة",title:"تحليل التسويق والإعلانات",
      q:["أي قناة تجيب عملاء يشترون فعلاً؟","كم يكلفك العميل الواحد من كل قناة؟","وين يطلع الزائر قبل ما يشتري؟"],
      kpi:["معدل التحويل حسب القناة","تكلفة اكتساب العميل","العائد على الإعلان","مصادر الزيارات"],
      data:"تقارير منصات الإعلانات وGoogle Analytics",tool:"traffic"},
    finance:{label:"الربح: الدخل زين بس الربح ما يبان",title:"التحليل المالي",
      q:["وين تروح المصاريف وأي بند يكبر؟","أي فرع أو خدمة تربح فعلاً بعد التكاليف؟","هل الصرف ماشي حسب الميزانية؟"],
      kpi:["صافي الربح وهامشه","المصاريف حسب البند","الربحية حسب الفرع أو المنتج","الفعلي مقابل الميزانية"],
      data:"كشف المصاريف أو تقارير النظام المحاسبي"},
    ops:{label:"التشغيل: الطلبات والشغل يتأخر",title:"تحليل التشغيل",
      q:["كم ياخذ الطلب من استلامه لإنجازه؟","وين يتأخر الشغل وعند مين؟","كم طلب متأخر الحين؟"],
      kpi:["متوسط زمن الإنجاز","نسبة الطلبات المتأخرة","الطلبات حسب المسؤول","الطلبات المفتوحة"],
      data:"سجل الطلبات أو المهام بتاريخ الفتح والإغلاق",tool:"maint"},
    stock:{label:"المخزون: أصناف راكدة وأصناف تخلص",title:"تحليل المخزون والمشتريات",
      q:["وش الأصناف الراكدة وكم قيمتها؟","متى تطلب كمية جديدة قبل ما يخلص الصنف؟","أي مورد يتأخر أو يرفع السعر؟"],
      kpi:["دوران المخزون","قيمة المخزون الراكد","أيام التغطية لكل صنف","أداء الموردين"],
      data:"جرد المخزون وحركة الصرف والمشتريات"},
    hr:{label:"الموظفين: غياب أو ترك أو إنتاجية",title:"تحليل الموارد البشرية",
      q:["كم نسبة ترك الموظفين ووين تتركز؟","وش نمط الغياب والتأخير؟","كم تكلفة الرواتب مقابل إنتاجية كل قسم؟"],
      kpi:["معدل دوران الموظفين","نسبة الغياب","تكلفة الرواتب حسب القسم","الإنتاجية لكل موظف"],
      data:"سجل الحضور وبيانات الموظفين والرواتب"},
    customers:{label:"العملاء: يجون مرة وما يرجعون",title:"تحليل العملاء",
      q:["كم عميل يرجع يشتري مرة ثانية؟","مين أكثر عملائك قيمة؟","وش أسباب الشكاوى المتكررة؟"],
      kpi:["نسبة العملاء العائدين","تكرار الشراء","قيمة العميل على المدى الطويل","أسباب الشكاوى"],
      data:"فواتير مربوطة برقم العميل أو جواله، وسجل الشكاوى"}
  };
  var DATA=[
    ["excel","ملفات Excel","نبدأ مباشرة من ملفاتك."],
    ["system","نظام نقاط بيع أو محاسبي","نسحب منه التقارير، أو نربطه مباشرة لو يسمح."],
    ["web","متجر إلكتروني أو Google Analytics","نربط التحليلات ومنصات الإعلانات."],
    ["paper","ورق أو واتساب","أول خطوة نرتب تسجيل البيانات بنموذج أو نظام بسيط، وبعدها يبدأ التحليل."],
    ["unsure","ما أدري","نحددها سوا في الاستشارة المجانية."]
  ];
  var FREQ=[
    ["once","مرة وحدة أفهم وضعي","تقرير تحليلي بالنتائج والتوصيات","تحليل بيانات ولوحة معلومات","تقرير لمرة وحدة"],
    ["monthly","كل شهر","لوحة معلومات وتقرير شهري بالتوصيات","مشروع متكامل","باقة النمو"],
    ["live","يومياً أو أسبوعياً","لوحة مربوطة بمصادرك تتحدث تلقائياً","مشروع متكامل","باقة النمو مع ربط مباشر"]
  ];
  function opts(el,name,list,type,checked){
    $(el).innerHTML=list.map(function(o){return '<label class="opt"><input type="'+type+'" name="'+name+'" value="'+o[0]+'"'+(checked.indexOf(o[0])>=0?" checked":"")+'><span>'+esc(o[1])+'</span></label>'}).join("")}
  opts("q-sector","sector",SECTORS,"radio",["retail"]);
  opts("q-pain","pain",Object.keys(PAINS).map(function(k){return [k,PAINS[k].label]}),"checkbox",["sales"]);
  opts("q-data","data",DATA,"checkbox",["excel"]);
  opts("q-freq","freq",FREQ,"radio",["monthly"]);

  function vals(name){return Array.prototype.map.call(document.querySelectorAll('#finder input[name="'+name+'"]:checked'),function(i){return i.value})}
  function find(list,k){return list.filter(function(x){return x[0]===k})[0]}
  var touched=false,summary="",pkg="";
  function render(){
    var sector=find(SECTORS,vals("sector")[0]||"other"),pains=vals("pain"),data=vals("data"),freq=find(FREQ,vals("freq")[0]||"monthly");
    var h='<div class="plan-head"><h3>خطة التحليل المقترحة</h3>'+(touched?'':'<span class="tag">مثال، غيّر الاختيارات</span>')+'</div>';
    if(!pains.length){$("plan").innerHTML=h+'<p class="fmt">اختر من السؤال الثاني ولو مشكلة وحدة، وتطلع لك الخطة هنا.</p>';summary="";return}
    var focus=pains.slice(0,2);
    h+='<dl class="plan-sum"><dt>نبدأ بـ</dt><dd>'+focus.map(function(k){return esc(PAINS[k].title)}).join(" + ")+'</dd>'+
       '<dt>التسليم</dt><dd>'+(pains[0]==="newproj"?'دراسة جدوى ونموذج مالي لخمس سنوات':esc(freq[2]))+'</dd>'+
       '<dt>الأنسب لك</dt><dd>'+(pains[0]==="newproj"?'دراسة جدوى'+(pains.length>1?' + '+esc(freq[4])+' بعد الافتتاح':''):esc(freq[4])+(focus.indexOf("newproj")>=0?' + دراسة جدوى':'')+(data.indexOf("paper")>=0?' + تنظيم تسجيل البيانات':''))+'</dd></dl>';
    if(pains.length>2)h+='<p class="fmt">اخترت '+pains.length+' مشاكل. ننصح تبدأ بأول اثنتين، ولما تشوف النتيجة نضيف الباقي. البداية الصغيرة تجيب نتيجة أسرع.</p>';
    pains.forEach(function(k,i){var p=PAINS[k];
      h+='<div class="need"'+(i>=2?' style="opacity:.7"':'')+'><h4>'+esc(p.title)+(i>=2?' <span class="fmt">(مرحلة لاحقة)</span>':'')+'</h4>'+
        '<ul>'+p.q.map(function(q){return '<li>'+esc(q)+'</li>'}).join("")+'</ul>'+
        '<div class="chips">'+p.kpi.map(function(x){return '<span class="chip">'+esc(x)+'</span>'}).join("")+'</div>'+
        '<p class="src">البيانات المطلوبة: '+esc(p.data)+'</p>'+
        (p.tool?'<a class="btn btn-ghost btn-sm" href="#tools" data-tool="'+p.tool+'" style="align-self:flex-start">جرّب أداة '+esc(p.title)+' مجاناً</a>':p.link?'<a class="btn btn-ghost btn-sm" href="'+p.link+'" style="align-self:flex-start">'+esc(p.linkText)+'</a>':'')+'</div>'});
    if(sector[2].length)h+='<div class="need"><h4>مؤشرات خاصة بـ'+esc(sector[1])+'</h4><div class="chips">'+sector[2].map(function(x){return '<span class="chip">'+esc(x)+'</span>'}).join("")+'</div></div>';
    if(data.length)h+='<div class="need"><h4>من وين نبدأ بالبيانات</h4><ul>'+data.map(function(d){return '<li>'+esc(find(DATA,d)[2])+'</li>'}).join("")+'</ul></div>';
    pkg=pains[0]==="newproj"?"دراسة جدوى تفصيلية":data.indexOf("paper")>=0&&data.length===1?"تحليل وتصميم نظام":freq[3];
    summary="خطتي من أداة «وش أحتاج؟»:\nالنشاط: "+sector[1]+"\nأبي أفهم: "+pains.map(function(k){return PAINS[k].title}).join("، ")+
      "\nبياناتي: "+(data.length?data.map(function(d){return find(DATA,d)[1]}).join("، "):"ما حددت")+"\nكل كم: "+freq[1];
    h+='<div class="cta" style="margin-top:4px"><button type="button" class="btn btn-primary" id="plan-send">أرسل الخطة مع طلبك</button><a class="btn btn-ghost" href="#contact" data-pkg="الباقة المجانية: استشارة أولى">أبي استشارة مجانية أول</a></div>';
    $("plan").innerHTML=h;
  }
  $("finder").addEventListener("change",function(){touched=true;render()});
  $("plan").addEventListener("click",function(e){
    var b=e.target.closest("#plan-send");if(!b||!summary)return;
    var t=$("f-type"),m=$("f-msg");if(t)t.value=pkg;
    if(m){m.value=(summary+(m.value.trim()?"\n\n"+m.value.trim():"")).slice(0,2000)}
    var c=$("contact");if(c)c.scrollIntoView({behavior:"smooth",block:"start"});
    setTimeout(function(){var n=$("f-name");if(n)n.focus({preventScroll:true})},500)});
  /* tool links inside the plan switch the tools tab (the main script binds only links present at load) */
  $("plan").addEventListener("click",function(e){var a=e.target.closest("[data-tool]");if(a){var tb=document.querySelector('[data-t="'+a.dataset.tool+'"]');if(tb)tb.click()}});
  render();
})();

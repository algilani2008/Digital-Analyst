/* المنتجات الأعلى طلباً: تُقرأ من data/products.json ويحدّثها وكيل ذكاء اصطناعي كل أسبوع (scripts/update-products.mjs). */
(function () {
  var root = document.getElementById("top-products"); if (!root) return;
  var BASE = (document.currentScript && document.currentScript.src || "").replace(/assets\/products\.js.*$/, "");
  var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var f0 = function (v) { return v == null || !isFinite(v) ? "—" : Math.round(v).toLocaleString("en-US"); };
  var CONF = {
    official: ["رقم رسمي", "good", "الرقم من جهة رسمية أو منصة حكومية"],
    report: ["من تقرير منشور", "good", "الرقم من تقرير سوق أو استطلاع يذكر مصدره"],
    estimate: ["تقدير مبدئي", "", "ما لقينا رقماً منشوراً، فهذا تقدير يحتاج تتأكد منه بنفسك"]
  };
  var D = null, cur = 0, EN = window.DA_LANG === "en";
  /* القائمة فيها اسم إنجليزي لكل منتج ونشاط، فنستخدمه مباشرة بدل ما نمر على قاموس الترجمة */
  var nm = function (o) { return EN && o.name_en ? o.name_en : o.name; };

  /* يترجم مؤشر الطلب لكلمة يفهمها صاحب المحل */
  function demandWord(n) { return n >= 70 ? "طلب عالي جداً" : n >= 50 ? "طلب قوي" : n >= 30 ? "طلب جيد" : "طلب محدود"; }

  function card(p, src) {
    var s = (p.sources || []).map(function (id) { return src[id]; }).filter(Boolean)[0];
    var c = CONF[p.confidence] || CONF.estimate;
    var range = p.price.min != null && p.price.max != null ? "يتراوح بين " + f0(p.price.min) + " و" + f0(p.price.max) + " ر.س حسب المكان والجودة" : "ما عندنا مدى سعري مؤكد";
    return '<article class="prod"><div class="prod-top"><span class="rank" aria-hidden="true">' + p.rank + '</span><div><h3>' + E(nm(p)) + '</h3><span class="fmt">السعر لكل ' + E(p.unit) + "</span></div>" +
      '<span class="flag' + (c[1] ? " " + c[1] : "") + '" title="' + E(c[2]) + '">' + c[0] + "</span></div>" +

      '<div class="prod-price"><span class="fmt">السعر اللي يبيع فيه أغلب المحلات</span>' +
      '<p class="big num">' + f0(p.price.avg) + ' <span class="fmt">ر.س / ' + E(p.unit) + "</span></p>" +
      '<p class="fmt">' + range + "</p></div>" +

      '<div class="prod-demand"><div class="lbl"><span>قوة الطلب عليه</span><b>' + demandWord(p.demand) + "</b></div>" +
      '<div class="bar" role="img" aria-label="قوة الطلب ' + p.demand + ' من 100"><span style="width:' + Math.max(3, p.demand) + '%"></span></div>' +
      '<p class="fmt">' + p.demand + " من 100 مقارنة ببقية منتجات نفس النشاط" + (p.note ? " · " + E(p.note) : "") + "</p></div>" +

      (p.rating ? '<p class="fmt prod-rate">تقييم العملاء: <b class="num">' + p.rating.score + ' من 5</b>' + (p.rating.count ? ' من <span class="num">' + f0(p.rating.count) + '</span> تقييم' : '') + (p.rating.source ? ' (' + E(p.rating.source) + ')' : '') + '</p>' : '') +
      (s ? '<p class="fmt">مصدر الأرقام: <a href="' + E(s.url) + '" target="_blank" rel="noopener noreferrer">' + E(s.title) + "</a></p>" : "") +
      "</article>";
  }

  function render() {
    var a = D.activities[cur], src = {};
    (D.sources || []).forEach(function (s) { src[s.id] = s; });
    root.innerHTML = '<p class="fmt" id="tp-hint">اختر نشاطك، وبتشوف المنتجات مرتّبة من الأعلى طلباً، وكم يبيعها السوق، ومن وين جبنا الرقم.</p>' +
      '<div class="tabs scroll-tabs" role="group" aria-label="اختيار النشاط" aria-describedby="tp-hint">' +
      D.activities.map(function (x, i) { return '<button type="button" data-act="' + i + '" aria-pressed="' + (i === cur) + '">' + E(nm(x)) + "</button>"; }).join("") + "</div>" +
      '<details class="legend"><summary>وش تعني الأرقام في البطاقة؟</summary><dl>' +
      "<div><dt>السعر</dt><dd>سعر البيع للعميل النهائي بالريال، مو تكلفتك. عشان تعرف تكلفتك وربحك استخدم حاسبة تكلفة المنتج تحت.</dd></div>" +
      "<div><dt>قوة الطلب</dt><dd>مقياس من 100 يقارن المنتج ببقية منتجات نفس النشاط. مو عدد مبيعات، بس يقول لك أي صنف الناس تطلبه أكثر.</dd></div>" +
      "<div><dt>رقم رسمي / من تقرير منشور</dt><dd>الرقم جاء من مصدر تقدر تفتحه بنفسك من الرابط تحت البطاقة.</dd></div>" +
      "<div><dt>تقدير مبدئي</dt><dd>ما لقينا رقماً منشوراً، فهذا اجتهاد من نماذج الذكاء الاصطناعي. خذه كمؤشر بس، وتأكد منه قبل ما تبني عليه قرار.</dd></div>" +
      "<div><dt>تقييم العملاء</dt><dd>يظهر فقط لو لقينا تقييماً منشوراً لهذا الصنف من خرائط قوقل أو منصات التوصيل. ما نخترع تقييماً.</dd></div>" +
      "</dl></details>" +
      '<div class="prod-grid">' + a.products.slice().sort(function (x, y) { return x.rank - y.rank; }).map(function (p) { return card(p, src); }).join("") + "</div>" +
      '<div class="prod-foot"><p class="fmt">آخر تحديث آلي: <b class="num">' + E(D.updated) + "</b> · " + E(D.method || "") + "</p>" +
      '<div class="cta"><a class="btn btn-primary btn-sm" href="#costing">احسب تكلفة منتجك وربحك</a><a class="btn btn-ghost btn-sm" href="index.html#contact">اطلب دراسة لمنتجك</a></div></div>';
  }

  root.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    cur = +b.dataset.act; render();
  });

  function start() {
    fetch(BASE + "data/products.json").then(function (r) { return r.json(); }).then(function (d) { D = d; render(); })
      .catch(function () { root.innerHTML = '<p class="msg">ما قدرنا نحمّل القائمة. حدّث الصفحة.</p>'; });
  }
  if ("IntersectionObserver" in window) { var io = new IntersectionObserver(function (en) { if (en.some(function (x) { return x.isIntersecting; })) { io.disconnect(); start(); } }, { rootMargin: "400px" }); io.observe(root); }
  else start();
})();

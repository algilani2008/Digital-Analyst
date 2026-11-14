/* العربية هي الأصل، والإنجليزية طبقة ترجمة فوقها: قاموس نصوص (assets/i18n-en.js) + أنماط للجمل اللي فيها أرقام.
   اللغة تنحفظ في المتصفح، وتتغير من زر اللغة أو ‎?lang=en. الرجوع للعربية يعيد تحميل الصفحة. */
(function () {
  var KEY = "da_lang", q = new URLSearchParams(location.search).get("lang"), lang = "ar";
  try { lang = q === "en" || q === "ar" ? q : localStorage.getItem(KEY) || "ar"; if (q) localStorage.setItem(KEY, lang); } catch (e) { if (q) lang = q; }
  var BASE = (document.currentScript && document.currentScript.src || "").replace(/assets\/i18n\.js.*$/, "");
  var AR = /[؀-ۿ]/, D = null, seen = new WeakMap(), ATTRS = ["placeholder", "aria-label", "title", "alt"];
  var norm = function (s) { return s.replace(/\s+/g, " ").trim(); };
  var TOK = [["ر.س", "SAR"], ["م²", "m²"], ["٪", "%"], ["مكوّن", "ingredient"], ["يوم", "days"], ["ملف", "file"], ["جم", "g"], ["مل", "ml"], ["حبة", "pc"], ["شهريًا", "a month"], ["سنويًا", "a year"]];

  /* أنماط الجمل المتغيرة: $1.. تترجم هي نفسها لو لها مقابل في القاموس */
  var P = [
    [/^رصيدك (\S+) من (\S+)(?: \(باقة (.+?)\))? · الملف (\S+) واليدوي (\S+)$/, function (m) { return "Credits: " + m[1] + " of " + m[2] + (m[3] ? " (" + t(m[3]) + " package)" : "") + " · file " + m[4] + ", manual " + m[5]; }],
    [/^متبقي (\d+) من (\d+) طلبات(?: \(باقة (.+)\))?$/, "$1 of $2 requests left"],
    [/^بدون حد ضمن باقة (.+)$/, "Unlimited on the $1 package"],
    [/^متأخر: (\d+)$/, "Late: $1"], [/^جديد: (\d+)$/, "New: $1"],
    [/^قبل (\d+) يوم$/, "$1 days ago"], [/^قبل (\d+) ساعة$/, "$1 hours ago"], [/^قبل (\d+) دقيقة$/, "$1 minutes ago"],
    [/^(.+) يحقق (\S+) من المبيعات، وأضعف فرع (.+) بنسبة (\S+)\.$/, "$1 brings $2 of sales; the weakest branch is $3 at $4."],
    [/^المبيعات ارتفعت (\S+) من (.+) إلى (.+)\.$/, "Sales rose $1 from $2 to $3."], [/^المبيعات انخفضت (\S+) من (.+) إلى (.+)\.$/, "Sales fell $1 from $2 to $3."],
    [/^(\d+) صنف مبيعاته أقل من نصف المتوسط، راجع تسعيرها أو عرضها: (.+)\.$/, "$1 item(s) sell below half the average; review pricing or display: $2."],
    [/^(.+) أعلى قناة في التحويل \((.+)\)، ركّز عليها في الميزانية والمحتوى\.$/, "$1 is the top converting channel ($2); focus budget and content on it."],
    [/^(.+) تجيب (\S+) من الزيارات لكن تحويلها (\S+) فقط\. راجع الإعلان أو صفحة الهبوط اللي توديها\.$/, "$1 brings $2 of visits but converts only $3. Review the ad or the landing page it leads to."],
    [/^(.+) أكبر مصدر زيارات بنسبة (\S+)\.$/, "$1 is the largest traffic source at $2."],
    [/^مكونات الوصفة كاملة \(للكمية اللي تطلّع (\S+) (.+)\)$/, "Full recipe ingredients (for a batch yielding $1 $2)"],
    [/^التكلفة (\S+) من السعر، أعلى من هدفك (\S+)\. السعر المقترح (\S+) ر\.س، أو خفّض أغلى مكوّن: (.+) \((\S+) من التكلفة\)\.$/, "Cost is $1 of the price, above your $2 target. Suggested price $3 SAR, or cut the costliest ingredient: $4 ($5 of cost)."],
    [/^ممتاز: التكلفة (\S+) ضمن هدفك\. كل وحدة تبيعها تترك لك (\S+) ر\.س قبل الثابت\.(?: وسعرها في التطبيقات يفضل يكون قرابة (\S+) ر\.س عشان العمولة ما تاكل ربحك\.)?$/, function (m) { return "Good: cost is " + m[1] + ", within your target. Each unit leaves you " + m[2] + " SAR before fixed costs." + (m[3] ? " On delivery apps, price it around " + m[3] + " SAR so the commission doesn't eat your profit." : ""); }],
    [/^تكلفة المكونات والتغليف \((\S+)\)$/, "Ingredients and packaging ($1)"],
    [/^تكلفة (.+)$/, "Cost per $1"],
    [/^الكيلو (\S+) ر\.س · الجرام (\S+)$/, "$1 SAR/kg · $2 per g"], [/^اللتر (\S+) ر\.س · المل (\S+)$/, "$1 SAR/litre · $2 per ml"], [/^الحبة (\S+) ر\.س$/, "$1 SAR per piece"],
    [/^أكثر منتج يجيب لك ربح في الشهر \((\S+) ر\.س\)\. خله في الواجهة والعروض\.$/, "is your top monthly profit earner ($1 SAR). Keep it front and centre and in offers."],
    [/^أعلى ربح للحبة \((\S+) ر\.س\)، لكن مبيعاته أقل\. لو رفعت مبيعاته بالترويج، ربحك يكبر بسرعة\.$/, "has the highest profit per unit ($1 SAR) but sells less. Promote it and your profit grows fast."],
    [/^أكثر شي يبيع لكن تكلفته (\S+)\. زيادة سعره ربع ريال بس تضيف قرابة (\S+) ر\.س شهريًا\.$/, "is your best seller but costs $1. Raising its price by a quarter riyal adds about $2 SAR a month."],
    [/^تكلفته (\S+) فوق هدفك\. السعر المقترح (\S+) ر\.س\.$/, "costs $1, above your target. Suggested price $2 SAR."],
    [/^بـ (\S+) ر\.س شهريًا \((\S+) من المكونات\)\. فاوض مورده أو اشترِ بكميات أكبر\.$/, "at $1 SAR a month ($2 of ingredients). Negotiate with its supplier or buy in bulk."],
    [/^نقطة التعادل (\S+) وحدة شهريًا، وأنت تتوقع (\S+)\. هامش الأمان (\S+)\.$/, "Break-even is $1 units a month, and you expect $2. Safety margin $3."],
    [/^بهذي الأرقام تحتاج (\S+) وحدة شهريًا عشان تتعادل، وأنت تتوقع (\S+)\. ارفع الأسعار أو خفّض الثابت قبل أي توسع\.$/, "With these numbers you need $1 units a month to break even, and you expect $2. Raise prices or cut fixed costs before any expansion."],
    [/^صافي الربح يصير (\S+) ر\.س شهريًا \((\S+)\)$/, "Net profit becomes $1 SAR a month ($2)"],
    [/^هامشك (\S+) والتكلفة تحت السيطرة\. هذا مؤشر جيد قبل فرع ثاني، بشرط تثبت الأرقام 3 أشهر متتالية وعندك احتياطي سيولة 3 أشهر من الثابت \((\S+) ر\.س\)\.$/, "Your margin is $1 and costs are under control. A good sign before a second branch, provided the numbers hold for 3 months in a row and you keep a cash reserve of 3 months of fixed costs ($2 SAR)."],
    [/^(.+) \((ساندويتش|صحن|كوب|علبة|عينة|زجاجة|جرعة)\)$/, function (m) { return t(m[1]) + " (" + t(m[2]) + ")"; }],
    [/^(.+) \((جم|مل|حبة)\)$/, function (m) { return t(m[1]) + " (" + ({ "جم": "g", "مل": "ml", "حبة": "pc" })[m[2]] + ")"; }],
    [/^(.+) في (.+) \(ر\.س للمتر سنويًا\)$/, "$1 in $2 (SAR per m² a year)"], [/^(.+) في (.+) \(ر\.س سنويًا للوحدة\)$/, "$1 in $2 (SAR a year per unit)"],
    [/^بين (\S+) و (\S+)$/, "between $1 and $2"], [/^متوسط (\d+) حي في (.+)$/, "average of $1 districts in $2"],
    [/^المقترح: ٣ أشهر من المصاريف الثابتة ≈ (\S+) ر\.س$/, "Suggested: 3 months of fixed costs ≈ $1 SAR"],
    [/^بهذي الأرقام المشروع يخسر بعد ما يستقر\. تحتاج تقريباً (\S+) عميل في اليوم عشان تتعادل، أو تخفض المصاريف الثابتة\.$/, "With these numbers the project loses money after it settles. You need about $1 customers a day to break even, or lower fixed costs."],
    [/^انتبه: المشروع يحتاج في أسوأ شهر (\S+) ر\.س، وأنت راصد (\S+) \(التأسيس والتجهيز مع الاحتياطي\)\. ارفع الاحتياطي (\S+) ر\.س على الأقل، لأن نقص السيولة في الأشهر الأولى من أكثر أسباب تعثر المشاريع\.$/, "Note: in its worst month the project needs $1 SAR, and you set aside $2 (setup and preparation plus the reserve). Raise the reserve by at least $3 SAR; running short of cash in the first months is among the most common reasons projects stumble."],
    [/^هامشك (\S+)\. عشان يعوّض خصم (\S+) لازم تزيد المبيعات (\S+)، يعني تقريباً من (\S+) إلى (\S+) عميل في اليوم\. لو العملاء ما زادوا، تخسر قرابة (\S+) ر\.س شهرياً من الربح\.$/, "Your margin is $1. To make up for a $2 discount, sales must rise $3, roughly from $4 to $5 customers a day. If customers don't increase, you lose about $6 SAR of profit a month."],
    [/^(\S+) سنة$/, "$1 years"], [/^(\d+) منتجات$/, "$1 products"], [/^(\d+) منتج$/, "$1 products"], [/^(\d+) وحدة$/, "$1 unit(s)"], [/^الكمية لـ(.+)$/, "Quantity for $1"],
    [/^واتساب: (\d+)$/, "WhatsApp: $1"],
    [/^الوحدة تخسر (\S+) ر\.س بعد نصيبها من المصاريف الثابتة\.$/, "The unit loses $1 SAR after its share of fixed costs."],
    [/^(?:متوسط (.+?)|حي (.+?)|(ما عندنا .+?)) · المصدر: (.+?)(?: · (\d{4}-\d{2}))?(?: · آخر تحديث آلي (\S+))?$/, function (m) { return (m[1] ? t(m[1]) + " average" : m[2] ? m[2] + " district" : t(m[3])) + " · Source: " + t(m[4]) + (m[5] ? " · " + m[5] : "") + (m[6] ? " · last auto-update " + m[6] : ""); }],
    [/^الألوان: سعر (.+) من (\S+) \(فاتح\) إلى (\S+) \(غامق\)\. المنقط ما له سعر\.$/, "Colours: $1 price from $2 (light) to $3 (dark). Dotted = no price."],
    [/^ما فيه أسعار (.+) لأحياء (.+) للحين\.$/, "No $1 prices for districts of $2 yet."],
    [/^(.+) \*$/, "$1 *"], [/^(.+) ●$/, "$1 ●"]
  ];

  function t(s) {
    var k = norm(s); if (!k || !AR.test(k)) return s;
    if (D[k]) return D[k];
    for (var i = 0; i < P.length; i++) { var m = k.match(P[i][0]); if (m) return typeof P[i][1] === "function" ? P[i][1](m) : P[i][1].replace(/\$(\d)/g, function (_, n) { return m[+n] == null ? "" : t(m[+n]); }); }
    /* أرقام مع وحدات فقط */
    var r = k; TOK.forEach(function (x) { r = r.split(x[0]).join(x[1]); });
    return AR.test(r) ? s : r;
  }
  function node(n) {
    var v = n.nodeValue, rec = seen.get(n); if (rec && rec === v) return; if (!AR.test(v)) return;
    var out = t(v); if (out === v) return;
    var lead = v.match(/^\s*/)[0], tail = v.match(/\s*$/)[0]; out = lead + out + tail;
    seen.set(n, out); n.nodeValue = out;
  }
  function el(e) {
    ATTRS.forEach(function (a) { var v = e.getAttribute && e.getAttribute(a); if (v && AR.test(v)) { var o = t(v); if (o !== v) e.setAttribute(a, o); } });
  }
  function walk(root) {
    if (root.nodeType === 3) return node(root); if (root.nodeType !== 1 || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(root.tagName)) return;
    el(root); root.querySelectorAll("[placeholder],[aria-label],[title],[alt]").forEach(el);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function (n) { var p = n.parentNode; return p && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(p.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } }), n, list = [];
    while ((n = w.nextNode())) list.push(n); list.forEach(node);
  }
  function setDir() {
    var en = lang === "en", h = document.documentElement; h.lang = en ? "en" : "ar"; h.dir = en ? "ltr" : "rtl";
    document.querySelectorAll('[dir="rtl"][lang="ar"],[dir="ltr"][lang="en"]').forEach(function (x) { if (x !== h) { x.dir = h.dir; x.lang = h.lang; } });
  }
  function start() {
    D = window.DA_EN || {}; setDir(); walk(document.body); if (D[norm(document.title)]) document.title = D[norm(document.title)];
    var md = document.querySelector('meta[name="description"]'); if (md && window.DA_EN_DESC) md.content = window.DA_EN_DESC;
    new MutationObserver(function (ms) { ms.forEach(function (m) { if (m.type === "characterData") node(m.target); else { m.addedNodes.forEach(walk); if (m.type === "attributes") el(m.target); } }); })
      .observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    document.documentElement.classList.remove("i18n-wait");
  }
  function button() {
    document.querySelectorAll("[data-lang-toggle]").forEach(function (b) {
      b.textContent = lang === "en" ? "عربي" : "English"; b.setAttribute("lang", lang === "en" ? "ar" : "en"); b.setAttribute("aria-label", lang === "en" ? "التحويل للعربية" : "Switch to English");
      b.onclick = function () { try { localStorage.setItem(KEY, lang === "en" ? "ar" : "en"); } catch (e) {} var u = new URL(location.href); u.searchParams.delete("lang"); location.href = u.toString(); if (u.toString() === location.href) location.reload(); };
    });
  }
  if (lang === "en") setDir();
  window.DA_LANG = lang; window.DA_T = function (s) { return lang === "en" && D ? t(s) : s; };
  button();
  if (lang !== "en") return;
  document.documentElement.classList.add("i18n-wait"); setTimeout(function () { document.documentElement.classList.remove("i18n-wait"); }, 2500);
  var s = document.createElement("script"); s.src = BASE + "assets/i18n-en.js?v=9"; s.onload = start; s.onerror = function () { document.documentElement.classList.remove("i18n-wait"); }; document.head.appendChild(s);
})();

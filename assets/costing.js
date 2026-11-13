/* حاسبة تكلفة المنتج: من المكون بالجرام والمل إلى سعر البيع والربح وخطة التوسع.
   كل البيانات في متصفح الزائر (أو حساب العميل لاحقًا)، والأسعار في النماذج افتراضية للتجربة. */
(function () {
  var root = document.getElementById("costing-app"); if (!root) return;
  var KEY = "da_cost_v1", VAT = 0.15;
  var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var n = function (v) { v = Number(v); return isFinite(v) ? v : 0; };
  var f2 = function (v) { return (Math.round(v * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var f0 = function (v) { return Math.round(v).toLocaleString("en-US"); };
  var pc = function (v) { return isFinite(v) ? (v * 100).toFixed(1) + "%" : "—"; };
  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };

  /* الوحدات: الشراء بأي وحدة، والوصفة بالوحدة الأساسية (جرام، مل، حبة) */
  var UNITS = { kg: ["كيلو", 1000, "w"], g: ["جرام", 1, "w"], l: ["لتر", 1000, "v"], ml: ["مل", 1, "v"], pc: ["حبة", 1, "c"] };
  var BASE = { w: "جم", v: "مل", c: "حبة" };

  /* ---------- النماذج حسب النشاط (أسعار افتراضية للتجربة، غيّرها بأسعارك) ---------- */
  function I(name, unit, qty, price, waste) { return { id: uid(), name: name, unit: unit, qty: qty, price: price, waste: waste || 0 }; }
  function P(name, yld, price, monthly, pack, lines, unitLabel) { return { id: uid(), name: name, yield: yld, unitLabel: unitLabel || "حبة", price: price, monthly: monthly, pack: pack || 0, lines: lines }; }
  function build(tpl) {
    var ings = tpl.ings.map(function (a) { return I.apply(null, a); }), byName = {}, prods = [];
    ings.forEach(function (i) { byName[i.name] = "i:" + i.id; });
    tpl.prods.forEach(function (p) { var pr = P(p[0], p[1], p[2], p[3], p[4], [], p[6]); byName[pr.name] = "p:" + pr.id; prods.push(pr); });
    tpl.prods.forEach(function (p, k) { prods[k].lines = p[5].map(function (l) { return { ref: byName[l[0]], qty: l[1] }; }).filter(function (l) { return l.ref; }); });
    return { activity: tpl.key, settings: JSON.parse(JSON.stringify(tpl.settings)), ings: ings, prods: prods, cur: prods.length ? prods[prods.length > 1 ? 1 : 0].id : null };
  }
  var TPL = {
    rest: { key: "rest", label: "مطعم (مثال: طعمية وفول)",
      settings: { vatInc: true, deliveryShare: 30, deliveryComm: 22, payFee: 1.5, target: 30, fixed: [["الإيجار", 6000], ["الرواتب", 10500], ["كهرباء وماء وغاز", 2000], ["أخرى", 1000]] },
      ings: [["حمص ناشف", "kg", 1, 9], ["بقدونس", "g", 100, 1.5, 15], ["كزبرة خضراء", "g", 100, 1.5, 15], ["بصل", "kg", 1, 4, 10], ["ثوم", "kg", 1, 14, 15], ["كمون مطحون", "g", 100, 4], ["كزبرة ناشفة", "g", 100, 3], ["ملح", "kg", 1, 2], ["بيكربونات", "g", 100, 2], ["سمسم", "kg", 1, 18], ["زيت قلي", "l", 18, 120], ["خبز صامولي", "pc", 10, 4], ["طحينة", "kg", 1, 22], ["طماطم", "kg", 1, 5, 10], ["مخلل خيار", "kg", 1, 8], ["فول ناشف", "kg", 1, 8], ["زيت زيتون", "l", 1, 35], ["ليمون", "kg", 1, 6, 40]],
      prods: [
        ["حبة طعمية", 65, 0, 0, 0, [["حمص ناشف", 1000], ["بقدونس", 150], ["كزبرة خضراء", 100], ["بصل", 300], ["ثوم", 40], ["كمون مطحون", 15], ["كزبرة ناشفة", 10], ["ملح", 20], ["بيكربونات", 8], ["زيت قلي", 260]]],
        ["ساندويتش طعمية", 1, 6, 4500, 0.2, [["حبة طعمية", 3], ["خبز صامولي", 1], ["طحينة", 15], ["طماطم", 20], ["مخلل خيار", 10]], "ساندويتش"],
        ["طعمية بالسمسم (حبة)", 1, 1, 3000, 0, [["حبة طعمية", 1], ["سمسم", 3]]],
        ["صحن طعمية 8 حبات", 1, 13, 900, 0.6, [["حبة طعمية", 8], ["طحينة", 40], ["طماطم", 40], ["مخلل خيار", 30], ["خبز صامولي", 2]], "صحن"],
        ["صحن فول", 1, 9, 1200, 0.6, [["فول ناشف", 130], ["زيت زيتون", 15], ["كمون مطحون", 2], ["ليمون", 30], ["خبز صامولي", 2]], "صحن"]] },
    cafe: { key: "cafe", label: "كافيه",
      settings: { vatInc: true, deliveryShare: 20, deliveryComm: 22, payFee: 1.5, target: 25, fixed: [["الإيجار", 12000], ["الرواتب", 15000], ["كهرباء وماء", 3000], ["أخرى", 2000]] },
      ings: [["حبوب قهوة", "kg", 1, 90], ["حليب طازج", "l", 1, 6.5], ["حليب مكثف محلى", "g", 397, 6], ["كوب ورقي 12 أونص", "pc", 1000, 180], ["غطاء كوب", "pc", 1000, 70], ["ثلج", "kg", 10, 10], ["صوص كراميل", "ml", 750, 38]],
      prods: [
        ["جرعة إسبريسو مزدوجة", 1, 0, 0, 0, [["حبوب قهوة", 18]], "جرعة"],
        ["لاتيه حار", 1, 16, 1800, 0, [["جرعة إسبريسو مزدوجة", 1], ["حليب طازج", 220], ["كوب ورقي 12 أونص", 1], ["غطاء كوب", 1]], "كوب"],
        ["سبانش لاتيه بارد", 1, 19, 2400, 0, [["جرعة إسبريسو مزدوجة", 1], ["حليب طازج", 180], ["حليب مكثف محلى", 30], ["ثلج", 120], ["كوب ورقي 12 أونص", 1], ["غطاء كوب", 1]], "كوب"],
        ["آيس كراميل لاتيه", 1, 20, 900, 0, [["جرعة إسبريسو مزدوجة", 1], ["حليب طازج", 180], ["صوص كراميل", 25], ["ثلج", 120], ["كوب ورقي 12 أونص", 1], ["غطاء كوب", 1]], "كوب"]] },
    bakery: { key: "bakery", label: "مخبز وحلويات",
      settings: { vatInc: true, deliveryShare: 15, deliveryComm: 22, payFee: 1.5, target: 30, fixed: [["الإيجار", 8000], ["الرواتب", 12000], ["كهرباء وغاز", 3500]] },
      ings: [["طحين أبيض", "kg", 1, 3.5], ["زبدة", "kg", 1, 38], ["سكر", "kg", 1, 4], ["خميرة فورية", "g", 500, 12], ["حليب طازج", "l", 1, 6.5], ["بيض", "pc", 30, 18], ["ملح", "kg", 1, 2], ["علبة كرتون", "pc", 100, 45]],
      prods: [
        ["كرواسون زبدة", 24, 7, 2200, 0.15, [["طحين أبيض", 1000], ["زبدة", 550], ["سكر", 100], ["خميرة فورية", 20], ["حليب طازج", 300], ["بيض", 2], ["ملح", 18]]],
        ["علبة كرواسون 6 حبات", 1, 38, 250, 0, [["كرواسون زبدة", 6], ["علبة كرتون", 1]], "علبة"]] },
    perfume: { key: "perfume", label: "عطور",
      settings: { vatInc: true, deliveryShare: 60, deliveryComm: 3, payFee: 2, target: 30, fixed: [["الإيجار", 6000], ["الرواتب", 8000], ["التسويق", 4000]] },
      ings: [["زيت عطري مركز", "ml", 100, 250], ["كحول عطري", "l", 1, 30], ["زجاجة 50 مل", "pc", 1, 6], ["علبة فاخرة", "pc", 1, 4], ["عينة 2 مل فارغة", "pc", 100, 40]],
      prods: [["عطر 50 مل", 1, 180, 300, 0, [["زيت عطري مركز", 10], ["كحول عطري", 40], ["زجاجة 50 مل", 1], ["علبة فاخرة", 1]], "زجاجة"],
        ["عينة 2 مل", 1, 0, 0, 0, [["زيت عطري مركز", 0.4], ["كحول عطري", 1.6], ["عينة 2 مل فارغة", 1]], "عينة"]] },
    blank: { key: "blank", label: "نشاط آخر (من الصفر)", settings: { vatInc: true, deliveryShare: 0, deliveryComm: 0, payFee: 1.5, target: 35, fixed: [["الإيجار", 0], ["الرواتب", 0]] }, ings: [], prods: [] }
  };

  var st;
  function load() { try { st = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { st = null; } if (!st || !Array.isArray(st.ings) || !Array.isArray(st.prods)) st = build(TPL.rest); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  load();
  var tab = "prod";

  /* ---------- الحسابات ---------- */
  function ing(id) { return st.ings.find(function (x) { return x.id === id; }); }
  function prod(id) { return st.prods.find(function (x) { return x.id === id; }); }
  function baseCost(i) { var u = UNITS[i.unit] || UNITS.g, q = n(i.qty) * u[1] * (1 - Math.min(95, n(i.waste)) / 100); return q > 0 ? n(i.price) / q : 0; }
  function baseUnit(i) { return BASE[(UNITS[i.unit] || UNITS.g)[2]]; }
  function lineInfo(l, depth) {
    var t = l.ref.slice(0, 1), id = l.ref.slice(2);
    if (t === "i") { var i = ing(id); return i ? { name: i.name, unit: baseUnit(i), cost: baseCost(i) * n(l.qty), kind: "i" } : null; }
    var p = prod(id); if (!p || depth > 6) return null;
    return { name: p.name, unit: p.unitLabel || "حبة", cost: unitCost(p, depth + 1).direct * n(l.qty), kind: "p" };
  }
  function unitCost(p, depth) {
    depth = depth || 0; var batch = 0, rows = [];
    p.lines.forEach(function (l, k) { var x = lineInfo(l, depth); if (x) { batch += x.cost; rows.push({ k: k, name: x.name, cost: x.cost / Math.max(1, n(p.yield) || 1) }); } });
    var y = Math.max(0.0001, n(p.yield) || 1);
    return { batch: batch, ingredients: batch / y, pack: n(p.pack), direct: batch / y + n(p.pack), rows: rows };
  }
  function sellable() { return st.prods.filter(function (p) { return n(p.price) > 0; }); }
  function fixedTotal() { return st.settings.fixed.reduce(function (a, f) { return a + n(f[1]); }, 0); }
  function netOf(p) { return st.settings.vatInc ? n(p.price) / (1 + VAT) : n(p.price); }
  function metrics(p) {
    var s = st.settings, c = unitCost(p), price = n(p.price), net = s.vatInc ? price / (1 + VAT) : price;
    var ds = Math.min(100, n(s.deliveryShare)) / 100, comm = net * ds * n(s.deliveryComm) / 100 + price * (1 - ds) * n(s.payFee) / 100;
    var contrib = net - c.direct - comm, rev = sellable().reduce(function (a, x) { return a + netOf(x) * n(x.monthly); }, 0);
    /* الثابت يتوزع حسب حصة المنتج من المبيعات: الصحن يتحمل أكثر من الحبة */
    var oh = rev > 0 ? fixedTotal() * net / rev : 0, target = Math.max(5, n(s.target)) / 100;
    var sug = c.direct / target * (s.vatInc ? 1 + VAT : 1);
    var dPrice = price / Math.max(0.2, 1 - n(s.deliveryComm) / 100);
    return { c: c, price: price, net: net, food: net > 0 ? c.direct / net : Infinity, comm: comm, contrib: contrib, oh: oh, profit: contrib - oh, margin: net > 0 ? (contrib - oh) / net : 0, sug: sug, dPrice: dPrice, monthly: n(p.monthly) };
  }
  function totals() {
    var list = sellable().map(function (p) { return { p: p, m: metrics(p) }; });
    var rev = 0, direct = 0, comm = 0, contrib = 0, units = 0;
    list.forEach(function (x) { var u = x.m.monthly; units += u; rev += x.m.net * u; direct += x.m.c.direct * u; comm += x.m.comm * u; contrib += x.m.contrib * u; });
    var fixed = fixedTotal(), profit = contrib - fixed, avg = units ? contrib / units : 0;
    return { list: list, rev: rev, direct: direct, comm: comm, contrib: contrib, fixed: fixed, profit: profit, units: units, be: avg > 0 ? fixed / avg : Infinity, margin: rev ? profit / rev : 0, food: rev ? direct / rev : 0 };
  }
  /* استهلاك المكونات الشهري: أي مكون يكلفك أكثر شي على مستوى المنيو */
  function ingSpend() {
    var spend = {};
    function walk(p, mult, depth) { if (depth > 6) return; var y = Math.max(0.0001, n(p.yield) || 1);
      p.lines.forEach(function (l) { var id = l.ref.slice(2), q = n(l.qty) / y * mult;
        if (l.ref[0] === "i") { var i = ing(id); if (i) spend[i.id] = (spend[i.id] || 0) + baseCost(i) * q; }
        else { var sp = prod(id); if (sp) walk(sp, q, depth + 1); } }); }
    sellable().forEach(function (p) { walk(p, n(p.monthly), 0); });
    return Object.keys(spend).map(function (k) { return { i: ing(k), v: spend[k] }; }).filter(function (x) { return x.i; }).sort(function (a, b) { return b.v - a.v; });
  }

  /* ---------- العرض ---------- */
  function render() {
    root.innerHTML =
      '<div class="tool-top"><div class="field" style="min-width:220px"><label for="cs-act">ابدأ من نموذج نشاط</label><select id="cs-act">' + Object.keys(TPL).map(function (k) { return '<option value="' + k + '"' + (k === st.activity ? " selected" : "") + ">" + E(TPL[k].label) + "</option>"; }).join("") + "</select></div>" +
      '<div class="tabs" role="group" aria-label="أقسام الحاسبة">' + [["prod", "المنتجات والوصفات"], ["ings", "المكونات وأسعارها"], ["fixed", "التكاليف الثابتة والبيع"], ["profit", "الربح وخطة التوسع"]].map(function (t) { return '<button type="button" data-cs-tab="' + t[0] + '" aria-pressed="' + (t[0] === tab) + '">' + t[1] + "</button>"; }).join("") + "</div></div>" +
      '<div id="cs-body"></div>' +
      '<div class="res-actions"><button type="button" class="btn btn-ghost btn-sm" id="cs-xl">صدّر Excel</button><button type="button" class="btn btn-primary btn-sm" id="cs-send">اطلب مراجعة تسعيرك</button><button type="button" class="btn btn-ghost btn-sm" id="cs-reset">ارجع للنموذج</button><span class="status" id="cs-st" aria-live="polite"></span></div>' +
      '<p class="fmt">الأسعار في النماذج افتراضية للتجربة، اكتب أسعار مورّدك. الحسابات تنحفظ في متصفحك بس.</p>';
    ({ prod: renderProd, ings: renderIngs, fixed: renderFixed, profit: renderProfit })[tab]();
  }

  function renderProd() {
    var b = document.getElementById("cs-body"), cur = prod(st.cur) || st.prods[0];
    if (cur) st.cur = cur.id;
    b.innerHTML = '<div class="cs-split"><aside class="cs-list"><p class="card-t">منتجاتك</p>' + st.prods.map(function (p) { var m = metrics(p), sub = !n(p.price);
        return '<button type="button" data-cs-p="' + p.id + '" aria-pressed="' + (cur && p.id === cur.id) + '"><b>' + E(p.name) + '</b><span class="num">' + f2(m.c.direct) + " ر.س" + (sub ? " · مكوّن" : " · " + pc(m.food)) + "</span></button>"; }).join("") +
      '<div class="cs-acts"><button type="button" class="btn btn-ghost btn-sm" id="cs-newp">منتج جديد</button>' + (cur ? '<button type="button" class="btn btn-ghost btn-sm" id="cs-dup">نسخة منه</button>' : "") + "</div></aside>" +
      '<div class="cs-edit" id="cs-edit">' + (cur ? editor(cur) : '<p class="fmt">أضف أول منتج. ولو مكوناتك فاضية، ابدأ من قسم «المكونات وأسعارها».</p>') + "</div></div>";
    if (cur) calc();
  }
  function editor(p) {
    var opts = '<optgroup label="المكونات">' + st.ings.map(function (i) { return '<option value="i:' + i.id + '">' + E(i.name) + " (" + baseUnit(i) + ")</option>"; }).join("") + "</optgroup>" +
      '<optgroup label="منتجات تدخل كمكوّن">' + st.prods.filter(function (x) { return x.id !== p.id; }).map(function (x) { return '<option value="p:' + x.id + '">' + E(x.name) + " (" + E(x.unitLabel || "حبة") + ")</option>"; }).join("") + "</optgroup>";
    return '<div class="cgrid cs-head"><div class="field" style="grid-column:1/-1"><label for="cs-name">اسم المنتج</label><input id="cs-name" data-cs="name" value="' + E(p.name) + '" maxlength="80"></div>' +
      '<div class="field"><label for="cs-yield">الوصفة تطلّع كم</label><input id="cs-yield" type="number" min="0.01" step="any" data-cs="yield" value="' + E(p.yield) + '"></div>' +
      '<div class="field"><label for="cs-ul">وحدة البيع</label><input id="cs-ul" data-cs="unitLabel" value="' + E(p.unitLabel || "حبة") + '" maxlength="20"></div>' +
      '<div class="field"><label for="cs-price">سعر البيع للوحدة (ر.س)</label><input id="cs-price" type="number" min="0" step="0.25" data-cs="price" value="' + E(p.price) + '"><span class="fmt">صفر = يدخل كمكوّن بس</span></div>' +
      '<div class="field"><label for="cs-mon">المبيعات المتوقعة شهريًا</label><input id="cs-mon" type="number" min="0" step="10" data-cs="monthly" value="' + E(p.monthly) + '"></div>' +
      '<div class="field"><label for="cs-pack">تغليف للوحدة (ر.س)</label><input id="cs-pack" type="number" min="0" step="0.05" data-cs="pack" value="' + E(p.pack) + '"></div></div>' +
      '<p class="card-t" style="margin-top:14px">مكونات الوصفة كاملة (للكمية اللي تطلّع ' + E(p.yield) + " " + E(p.unitLabel || "حبة") + ')</p><div class="tbl-wrap"><table class="data cs-lines"><thead><tr><th>المكوّن</th><th>الكمية</th><th>الوحدة</th><th>التكلفة للوحدة</th><th>النسبة</th><th></th></tr></thead><tbody>' +
      p.lines.map(function (l, k) { var x = lineInfo(l, 0); return '<tr><td><select data-cs-ref="' + k + '" aria-label="المكوّن">' + opts.replace('value="' + l.ref + '"', 'value="' + l.ref + '" selected') + '</select></td><td><input type="number" min="0" step="any" class="qty" data-cs-q="' + k + '" value="' + E(l.qty) + '" aria-label="الكمية"></td><td>' + E(x ? x.unit : "—") + '</td><td class="num" data-cs-lc="' + k + '"></td><td class="num" data-cs-lp="' + k + '"></td><td><button type="button" class="btn btn-ghost btn-sm" data-cs-rm="' + k + '" aria-label="حذف المكون">حذف</button></td></tr>'; }).join("") +
      '</tbody></table></div><div class="cs-acts"><button type="button" class="btn btn-ghost btn-sm" id="cs-addl">إضافة مكوّن</button><button type="button" class="btn btn-ghost btn-sm" id="cs-delp">حذف المنتج</button></div>' +
      '<div class="res-kpis" id="cs-k" style="margin-top:16px"></div><p class="verdict" id="cs-v"></p><div class="grid2"><div><p class="card-t">من وين تجي التكلفة</p><div id="cs-bars"></div></div><div><p class="card-t">سعر البيع وين يروح</p><div id="cs-split2"></div></div></div>';
  }
  function calc() {
    var p = prod(st.cur); if (!p) return; var m = metrics(p), s = st.settings;
    m.c.rows.forEach(function (r) { var c = document.querySelector('[data-cs-lc="' + r.k + '"]'), q = document.querySelector('[data-cs-lp="' + r.k + '"]'); if (c) c.textContent = f2(r.cost) + " ر.س"; if (q) q.textContent = m.c.direct ? pc(r.cost / m.c.direct) : "—"; });
    var sub = !m.price;
    document.getElementById("cs-k").innerHTML =
      kpi("تكلفة " + (p.unitLabel || "الحبة"), f2(m.c.direct) + " ر.س") +
      (sub ? kpi("تكلفة الوصفة كاملة", f2(m.c.batch) + " ر.س") + kpi("المكوّن يدخل في", st.prods.filter(function (x) { return x.lines.some(function (l) { return l.ref === "p:" + p.id; }); }).length + " منتجات") :
        kpi("نسبة التكلفة من السعر", pc(m.food), m.food > n(s.target) / 100) + kpi("ربحك من الوحدة بعد العمولات", f2(m.contrib) + " ر.س", m.contrib <= 0) + kpi("الربح الصافي بعد نصيبها من الثابت", f2(m.profit) + " ر.س", m.profit <= 0));
    var v = document.getElementById("cs-v");
    if (sub) { v.className = "verdict"; v.textContent = "هذا مكوّن (سعر بيعه صفر)، تكلفته تنحسب داخل المنتجات اللي يدخل فيها. لو تبيعه لحاله اكتب سعره."; }
    else if (m.food > n(s.target) / 100) { v.className = "verdict bad"; v.textContent = "التكلفة " + pc(m.food) + " من السعر، أعلى من هدفك " + n(s.target) + "%. السعر المقترح " + f2(Math.ceil(m.sug * 4) / 4) + " ر.س، أو خفّض أغلى مكوّن: " + topRow(m) + "."; }
    else { v.className = "verdict"; v.textContent = "ممتاز: التكلفة " + pc(m.food) + " ضمن هدفك. كل وحدة تبيعها تترك لك " + f2(m.contrib) + " ر.س قبل الثابت." + (n(s.deliveryShare) ? " وسعرها في التطبيقات يفضل يكون قرابة " + f2(Math.ceil(m.dPrice * 4) / 4) + " ر.س عشان العمولة ما تاكل ربحك." : ""); }
    var rows = m.c.rows.slice().sort(function (a, b) { return b.cost - a.cost; }), max = rows.length ? rows[0].cost : 1;
    if (m.c.pack) rows.push({ name: "التغليف", cost: m.c.pack });
    document.getElementById("cs-bars").innerHTML = '<div class="hbars">' + rows.slice(0, 8).map(function (r) { return '<div class="hb"><span class="nm" title="' + E(r.name) + '">' + E(r.name) + '</span><span class="track"><span class="fill" style="width:' + Math.max(2, r.cost / Math.max(max, m.c.pack || 0) * 100) + '%;display:block"></span></span><span class="num">' + f2(r.cost) + "</span></div>"; }).join("") + "</div>";
    if (sub) { document.getElementById("cs-split2").innerHTML = '<p class="fmt">يظهر لما يكون للمنتج سعر بيع.</p>'; return; }
    var parts = [["الضريبة", m.price - m.net], ["التكلفة المباشرة", m.c.direct], ["العمولات والدفع", m.comm], ["نصيبه من الثابت", Math.max(0, m.oh)], ["الربح", Math.max(0, m.profit)]], tot = m.price || 1;
    document.getElementById("cs-split2").innerHTML = '<div class="hbars">' + parts.map(function (r, i) { return '<div class="hb"><span class="nm">' + r[0] + '</span><span class="track"><span class="fill' + (i === 4 ? "" : " warn") + '" style="width:' + Math.max(1, r[1] / tot * 100) + '%;display:block"></span></span><span class="num">' + f2(r[1]) + "</span></div>"; }).join("") + "</div>" + (m.profit < 0 ? '<p class="fmt" style="margin-top:6px">الوحدة تخسر ' + f2(-m.profit) + " ر.س بعد نصيبها من المصاريف الثابتة.</p>" : "");
  }
  function topRow(m) { var r = m.c.rows.slice().sort(function (a, b) { return b.cost - a.cost; })[0]; return r ? r.name + " (" + pc(r.cost / m.c.direct) + " من التكلفة)" : "—"; }
  function kpi(l, v, bad) { return '<div class="kpi"><span class="label">' + E(l) + '</span><span class="value num' + (bad ? " stock-low" : "") + '">' + v + "</span></div>"; }

  function renderIngs() {
    var b = document.getElementById("cs-body"), used = {};
    st.prods.forEach(function (p) { p.lines.forEach(function (l) { used[l.ref] = (used[l.ref] || 0) + 1; }); });
    b.innerHTML = '<p class="fmt" style="margin-bottom:10px">اكتب كيف تشتري المكون (مثال: 5 كيلو بـ 40 ريال)، ونسبة الهدر (قشر، عظم، تبخر). الحاسبة تطلّع تكلفة الجرام أو المل أو الحبة.</p><div class="tbl-wrap"><table class="data"><thead><tr><th>المكوّن</th><th>أشتري</th><th>الوحدة</th><th>بسعر (ر.س)</th><th>الهدر %</th><th>التكلفة للوحدة الأساسية</th><th>يدخل في</th><th></th></tr></thead><tbody>' +
      st.ings.map(function (i, k) { return '<tr><td><input data-ci="' + k + '" data-f="name" value="' + E(i.name) + '" maxlength="60" aria-label="اسم المكون"></td><td><input class="qty" type="number" min="0" step="any" data-ci="' + k + '" data-f="qty" value="' + E(i.qty) + '" aria-label="الكمية"></td><td><select data-ci="' + k + '" data-f="unit" aria-label="الوحدة">' + Object.keys(UNITS).map(function (u) { return '<option value="' + u + '"' + (u === i.unit ? " selected" : "") + ">" + UNITS[u][0] + "</option>"; }).join("") + '</select></td><td><input class="qty" type="number" min="0" step="any" data-ci="' + k + '" data-f="price" value="' + E(i.price) + '" aria-label="السعر"></td><td><input class="qty" type="number" min="0" max="95" step="any" data-ci="' + k + '" data-f="waste" value="' + E(i.waste) + '" aria-label="الهدر"></td><td data-cb="' + k + '">' + costTxt(i) + "</td><td>" + (used["i:" + i.id] || 0) + ' منتج</td><td><button type="button" class="btn btn-ghost btn-sm" data-ci-rm="' + k + '">حذف</button></td></tr>'; }).join("") +
      '</tbody></table></div><div class="cs-acts"><button type="button" class="btn btn-ghost btn-sm" id="cs-addi">مكوّن جديد</button></div>';
  }
  function costTxt(i) { var c = baseCost(i), u = baseUnit(i);
    return u === "حبة" ? "الحبة " + f2(c) + " ر.س" : (u === "جم" ? "الكيلو " : "اللتر ") + f2(c * 1000) + " ر.س · " + (u === "جم" ? "الجرام " : "المل ") + (c).toFixed(4); }

  function renderFixed() {
    var s = st.settings, b = document.getElementById("cs-body");
    b.innerHTML = '<div class="grid2"><div><p class="card-t">المصاريف الثابتة الشهرية</p><p class="fmt" style="margin-bottom:8px">تتوزع على كل وحدة تبيعها، عشان تعرف الربح الحقيقي.</p>' +
      s.fixed.map(function (f, k) { return '<div class="cs-row"><input data-cf="' + k + '" data-i="0" value="' + E(f[0]) + '" aria-label="البند" maxlength="40"><input class="qty" type="number" min="0" step="100" data-cf="' + k + '" data-i="1" value="' + E(f[1]) + '" aria-label="المبلغ" style="width:120px"><button type="button" class="btn btn-ghost btn-sm" data-cf-rm="' + k + '">حذف</button></div>'; }).join("") +
      '<button type="button" class="btn btn-ghost btn-sm" id="cs-addf" style="margin-top:6px">بند جديد</button><p style="margin-top:10px">الإجمالي: <b class="num" id="cs-ft">' + f0(fixedTotal()) + "</b> ر.س شهريًا</p></div>" +
      '<div><p class="card-t">البيع والعمولات</p><div class="cgrid">' +
      fld("cs-vat", "الأسعار", '<select id="cs-vat" data-s="vatInc"><option value="1"' + (s.vatInc ? " selected" : "") + '>شاملة الضريبة 15%</option><option value="0"' + (s.vatInc ? "" : " selected") + ">بدون ضريبة</option></select>") +
      fld("cs-ds", "نسبة المبيعات من تطبيقات التوصيل %", '<input id="cs-ds" type="number" min="0" max="100" data-s="deliveryShare" value="' + E(s.deliveryShare) + '">') +
      fld("cs-dc", "عمولة التطبيق % (حسب عقدك)", '<input id="cs-dc" type="number" min="0" max="60" step="0.5" data-s="deliveryComm" value="' + E(s.deliveryComm) + '">') +
      fld("cs-pf", "رسوم الدفع الإلكتروني %", '<input id="cs-pf" type="number" min="0" max="10" step="0.1" data-s="payFee" value="' + E(s.payFee) + '">') +
      fld("cs-tg", "هدف نسبة التكلفة من السعر %", '<input id="cs-tg" type="number" min="5" max="90" data-s="target" value="' + E(s.target) + '">') +
      '</div><p class="fmt" style="margin-top:8px">مرجع شائع: المطاعم 28 إلى 35%، والكافيهات 20 إلى 30%، والمخابز 25 إلى 35%. هدفك يحدد السعر المقترح.</p></div></div>';
  }
  function fld(id, l, inner) { return '<div class="field"><label for="' + id + '">' + l + "</label>" + inner + "</div>"; }

  function renderProfit() {
    var t = totals(), b = document.getElementById("cs-body"), s = st.settings;
    if (!t.list.length) { b.innerHTML = '<p class="fmt">حط سعر بيع ومبيعات شهرية لمنتج واحد على الأقل.</p>'; return; }
    var byC = t.list.slice().sort(function (a, b2) { return b2.m.contrib * b2.m.monthly - a.m.contrib * a.m.monthly; });
    var best = t.list.slice().sort(function (a, b2) { return b2.m.contrib - a.m.contrib; })[0];
    var vol = t.list.slice().sort(function (a, b2) { return b2.m.monthly - a.m.monthly; })[0];
    var over = t.list.filter(function (x) { return x.m.food > n(s.target) / 100; });
    var sp = ingSpend().slice(0, 5), spTot = ingSpend().reduce(function (a, x) { return a + x.v; }, 0);
    var ins = [];
    ins.push("<li><b>" + E(byC[0].p.name) + "</b> أكثر منتج يجيب لك ربح في الشهر (" + f0(byC[0].m.contrib * byC[0].m.monthly) + " ر.س). خله في الواجهة والعروض.</li>");
    if (best.p.id !== byC[0].p.id) ins.push("<li><b>" + E(best.p.name) + "</b> أعلى ربح للحبة (" + f2(best.m.contrib) + " ر.س)، لكن مبيعاته أقل. لو رفعت مبيعاته بالترويج، ربحك يكبر بسرعة.</li>");
    if (vol.m.food > n(s.target) / 100) ins.push("<li><b>" + E(vol.p.name) + "</b> أكثر شي يبيع لكن تكلفته " + pc(vol.m.food) + ". زيادة سعره ربع ريال بس تضيف قرابة " + f0(0.25 / (s.vatInc ? 1 + VAT : 1) * vol.m.monthly) + " ر.س شهريًا.</li>");
    over.filter(function (x) { return x !== vol; }).slice(0, 3).forEach(function (x) { ins.push("<li><b>" + E(x.p.name) + "</b> تكلفته " + pc(x.m.food) + " فوق هدفك. السعر المقترح " + f2(Math.ceil(x.m.sug * 4) / 4) + " ر.س.</li>"); });
    if (sp.length) ins.push("<li>أغلى مكوّن على مستوى المنيو: <b>" + E(sp[0].i.name) + "</b> بـ " + f0(sp[0].v) + " ر.س شهريًا (" + pc(sp[0].v / Math.max(1, spTot)) + " من المكونات). فاوض مورده أو اشترِ بكميات أكبر.</li>");
    ins.push(t.profit > 0 ? "<li>نقطة التعادل " + f0(t.be) + " وحدة شهريًا، وأنت تتوقع " + f0(t.units) + ". هامش الأمان " + pc(1 - t.be / t.units) + ".</li>" : "<li>بهذي الأرقام تحتاج " + (isFinite(t.be) ? f0(t.be) : "—") + " وحدة شهريًا عشان تتعادل، وأنت تتوقع " + f0(t.units) + ". ارفع الأسعار أو خفّض الثابت قبل أي توسع.</li>");
    var ready = t.margin >= 0.15 && t.food <= n(s.target) / 100 + 0.03;
    b.innerHTML = '<div class="res-kpis">' + kpi("المبيعات الشهرية (بدون ضريبة)", f0(t.rev) + " ر.س") + kpi("تكلفة المكونات والتغليف (" + pc(t.food) + ")", f0(t.direct) + " ر.س", t.food > n(s.target) / 100) + kpi("العمولات والدفع", f0(t.comm) + " ر.س") + kpi("المصاريف الثابتة", f0(t.fixed) + " ر.س") + kpi("صافي الربح الشهري", f0(t.profit) + " ر.س", t.profit <= 0) + kpi("هامش الربح الصافي", pc(t.margin), t.margin < 0.1) + "</div>" +
      '<p class="verdict' + (ready ? "" : " bad") + '"><b>جاهزية التوسع:</b> ' + (ready ? "هامشك " + pc(t.margin) + " والتكلفة تحت السيطرة. هذا مؤشر جيد قبل فرع ثاني، بشرط تثبت الأرقام 3 أشهر متتالية وعندك احتياطي سيولة 3 أشهر من الثابت (" + f0(t.fixed * 3) + " ر.س)." : "الأفضل توصل لهامش صافي 15% على الأقل ونسبة تكلفة قريبة من هدفك قبل فرع ثاني. التوسع يكبّر الربح، ويكبّر الخسارة بنفس الطريقة.") + "</p>" +
      '<div class="tbl-wrap"><table class="data"><thead><tr><th>المنتج</th><th>السعر</th><th>التكلفة</th><th>نسبة التكلفة</th><th>ربح الوحدة</th><th>شهريًا</th><th>ربح الشهر</th><th>السعر المقترح</th></tr></thead><tbody>' +
      byC.map(function (x) { var m = x.m; return "<tr><td>" + E(x.p.name) + '</td><td class="num">' + f2(m.price) + '</td><td class="num">' + f2(m.c.direct) + '</td><td class="num"' + (m.food > n(s.target) / 100 ? ' style="color:var(--data)"' : "") + ">" + pc(m.food) + '</td><td class="num">' + f2(m.contrib) + '</td><td class="num">' + f0(m.monthly) + '</td><td class="num">' + f0(m.contrib * m.monthly) + '</td><td class="num">' + f2(Math.ceil(m.sug * 4) / 4) + "</td></tr>"; }).join("") + "</tbody></table></div>" +
      '<p class="card-t" style="margin-top:14px">وش تسوي عشان تربح وتتوسع</p><ul class="insights">' + ins.join("") + "</ul>" +
      '<div class="dsim-row" style="margin-top:14px"><label for="cs-g">لو زادت المبيعات</label><input id="cs-g" type="number" min="-50" max="300" value="20"><span>%</span><span id="cs-gr" class="num"></span></div>' +
      (sp.length ? '<p class="card-t" style="margin-top:10px">أكثر المكونات صرفًا في الشهر</p><div class="hbars">' + sp.map(function (x) { return '<div class="hb"><span class="nm">' + E(x.i.name) + '</span><span class="track"><span class="fill" style="width:' + Math.max(2, x.v / sp[0].v * 100) + '%;display:block"></span></span><span class="num">' + f0(x.v) + "</span></div>"; }).join("") + "</div>" : "");
    var g = document.getElementById("cs-g"), gr = function () { var k = n(g.value) / 100, p2 = t.contrib * (1 + k) - t.fixed; document.getElementById("cs-gr").textContent = "صافي الربح يصير " + f0(p2) + " ر.س شهريًا (" + (p2 - t.profit >= 0 ? "+" : "") + f0(p2 - t.profit) + ")"; };
    g.oninput = gr; gr();
  }

  /* ---------- الأحداث ---------- */
  root.addEventListener("click", function (e) {
    var t = e.target.closest("button,[data-cs-p]"); if (!t) return;
    if (t.dataset.csTab) { tab = t.dataset.csTab; render(); return; }
    if (t.dataset.csP) { st.cur = t.dataset.csP; save(); renderProd(); return; }
    var p = prod(st.cur);
    if (t.id === "cs-newp") { var np = P("منتج جديد", 1, 0, 0, 0, []); st.prods.push(np); st.cur = np.id; save(); renderProd(); document.getElementById("cs-name").select(); return; }
    if (t.id === "cs-dup" && p) { var c = JSON.parse(JSON.stringify(p)); c.id = uid(); c.name = p.name + " (نسخة)"; st.prods.push(c); st.cur = c.id; save(); renderProd(); return; }
    if (t.id === "cs-addl" && p) { var first = st.ings[0] ? "i:" + st.ings[0].id : st.prods.find(function (x) { return x.id !== p.id; }); if (!first) return; p.lines.push({ ref: typeof first === "string" ? first : "p:" + first.id, qty: 0 }); save(); renderProd(); return; }
    if (t.dataset.csRm != null && p) { p.lines.splice(+t.dataset.csRm, 1); save(); renderProd(); return; }
    if (t.id === "cs-delp" && p) { if (t.dataset.armed !== "1") { t.dataset.armed = "1"; t.textContent = "اضغط مرة ثانية للتأكيد"; return; }
      st.prods.forEach(function (x) { x.lines = x.lines.filter(function (l) { return l.ref !== "p:" + p.id; }); }); st.prods = st.prods.filter(function (x) { return x !== p; }); st.cur = st.prods[0] && st.prods[0].id; save(); renderProd(); return; }
    if (t.id === "cs-addi") { st.ings.push(I("مكوّن جديد", "kg", 1, 0, 0)); save(); renderIngs(); return; }
    if (t.dataset.ciRm != null) { var gone = st.ings[+t.dataset.ciRm]; st.prods.forEach(function (x) { x.lines = x.lines.filter(function (l) { return l.ref !== "i:" + gone.id; }); }); st.ings.splice(+t.dataset.ciRm, 1); save(); renderIngs(); return; }
    if (t.id === "cs-addf") { st.settings.fixed.push(["بند جديد", 0]); save(); renderFixed(); return; }
    if (t.dataset.cfRm != null) { st.settings.fixed.splice(+t.dataset.cfRm, 1); save(); renderFixed(); return; }
    if (t.id === "cs-reset") { if (t.dataset.armed !== "1") { t.dataset.armed = "1"; t.textContent = "يمسح تعديلاتك، اضغط للتأكيد"; return; } st = build(TPL[st.activity] || TPL.rest); save(); tab = "prod"; render(); return; }
    if (t.id === "cs-xl") return exportXl();
    if (t.id === "cs-send") return sendReq();
  });
  root.addEventListener("change", function (e) {
    var el = e.target;
    if (el.id === "cs-act") { st = build(TPL[el.value]); tab = "prod"; save(); render(); return; }
    if (el.dataset.csRef != null) { prod(st.cur).lines[+el.dataset.csRef].ref = el.value; save(); renderProd(); return; }
    if (el.dataset.ci != null && el.dataset.f === "unit") { st.ings[+el.dataset.ci].unit = el.value; save(); renderIngs(); return; }
  });
  root.addEventListener("input", function (e) {
    var el = e.target, p = prod(st.cur);
    if (el.dataset.cs && p) { p[el.dataset.cs] = ["name", "unitLabel"].indexOf(el.dataset.cs) >= 0 ? el.value.slice(0, 80) : n(el.value); save(); calc();
      if (el.dataset.cs === "name" || el.dataset.cs === "price") { var b = document.querySelector('[data-cs-p="' + p.id + '"] b'); if (b) b.textContent = p.name; } return; }
    if (el.dataset.csQ != null && p) { p.lines[+el.dataset.csQ].qty = n(el.value); save(); calc(); return; }
    if (el.dataset.ci != null) { var i = st.ings[+el.dataset.ci]; i[el.dataset.f] = el.dataset.f === "name" ? el.value.slice(0, 60) : n(el.value); save(); var c = document.querySelector('[data-cb="' + el.dataset.ci + '"]'); if (c) c.textContent = costTxt(i); return; }
    if (el.dataset.cf != null) { st.settings.fixed[+el.dataset.cf][+el.dataset.i] = el.dataset.i === "0" ? el.value.slice(0, 40) : n(el.value); save(); document.getElementById("cs-ft").textContent = f0(fixedTotal()); return; }
    if (el.dataset.s) { st.settings[el.dataset.s] = el.dataset.s === "vatInc" ? el.value === "1" : n(el.value); save(); return; }
  });
  root.addEventListener("change", function (e) { if (e.target.dataset.s === "vatInc") { st.settings.vatInc = e.target.value === "1"; save(); } });

  function exportXl() {
    var stEl = document.getElementById("cs-st");
    if (!window.__daSaveXlsx) { stEl.textContent = "التصدير ما تحمّل، حدّث الصفحة."; return; }
    var t = totals();
    var prods = st.prods.map(function (p) { var m = metrics(p); return { "المنتج": p.name, "الوصفة تطلّع": p.yield, "الوحدة": p.unitLabel || "حبة", "تكلفة الوحدة": +m.c.direct.toFixed(3), "سعر البيع": m.price, "نسبة التكلفة %": m.price ? +(m.food * 100).toFixed(1) : "", "ربح الوحدة بعد العمولات": m.price ? +m.contrib.toFixed(2) : "", "المبيعات الشهرية": m.monthly, "ربح الشهر": m.price ? Math.round(m.contrib * m.monthly) : "", "السعر المقترح": m.price ? +(Math.ceil(m.sug * 4) / 4).toFixed(2) : "" }; });
    var lines = []; st.prods.forEach(function (p) { var c = unitCost(p); p.lines.forEach(function (l, k) { var x = lineInfo(l, 0), r = c.rows.find(function (z) { return z.k === k; }); lines.push({ "المنتج": p.name, "المكوّن": x ? x.name : "—", "الكمية للوصفة": l.qty, "الوحدة": x ? x.unit : "", "تكلفته للوحدة": r ? +r.cost.toFixed(4) : 0 }); }); });
    var ings = st.ings.map(function (i) { return { "المكوّن": i.name, "أشتري": i.qty, "الوحدة": UNITS[i.unit][0], "السعر": i.price, "الهدر %": i.waste, "تكلفة 1000 وحدة أساسية": +(baseCost(i) * 1000).toFixed(3) }; });
    var sum = [["المبيعات الشهرية بدون ضريبة", Math.round(t.rev)], ["تكلفة المكونات والتغليف", Math.round(t.direct)], ["العمولات والدفع", Math.round(t.comm)], ["المصاريف الثابتة", Math.round(t.fixed)], ["صافي الربح الشهري", Math.round(t.profit)], ["هامش الربح %", +(t.margin * 100).toFixed(1)], ["نقطة التعادل (وحدة/شهر)", isFinite(t.be) ? Math.round(t.be) : "—"]].map(function (r) { return { "البند": r[0], "القيمة": r[1] }; });
    window.__daSaveXlsx([{ name: "المنتجات", rows: prods }, { name: "الوصفات", rows: lines.length ? lines : [{ "المنتج": "—" }] }, { name: "المكونات", rows: ings.length ? ings : [{ "المكوّن": "—" }] }, { name: "الملخص", rows: sum }], "تكلفة-المنتجات.xlsx", stEl, function (m) { stEl.textContent = m; });
  }
  function sendReq() {
    var t = totals(), txt = "أبي مراجعة تسعير منتجاتي (" + (TPL[st.activity] || TPL.blank).label + "):\n" +
      t.list.map(function (x) { return "- " + x.p.name + ": السعر " + f2(x.m.price) + "، التكلفة " + f2(x.m.c.direct) + " (" + pc(x.m.food) + ")"; }).join("\n") +
      "\nصافي الربح الشهري المتوقع: " + f0(t.profit) + " ر.س، الهامش " + pc(t.margin);
    var ty = document.getElementById("f-type"), msg = document.getElementById("f-msg");
    if (ty) ty.value = "تحليل بيانات ولوحة معلومات"; if (msg) msg.value = txt.slice(0, 2000);
    var c = document.getElementById("contact"); if (c) c.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(function () { var nm = document.getElementById("f-name"); if (nm) nm.focus({ preventScroll: true }); }, 500);
  }
  window.__daCosting = { metrics: metrics, unitCost: unitCost, totals: totals, state: function () { return st; },
    /* أداة الإيجار تحط إيجار الحي في المصاريف الثابتة */
    setFixed: function (name, monthly) { var f = st.settings.fixed.find(function (x) { return x[0] === name; }); if (f) f[1] = monthly; else st.settings.fixed.unshift([name, monthly]); save(); tab = "fixed"; render(); return true; } };
  render();
})();

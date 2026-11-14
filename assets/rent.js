/* أداة أسعار الإيجار: المنطقة ← المدينة أو المحافظة ← الحي، على خريطة بصور الأقمار الصناعية وحدود الأحياء.
   حدود المناطق والأحياء من بيانات العنوان الوطني (data/geo)، والأسعار من data/rents.json وتعديلات المالك. */
(function () {
  var root = document.getElementById("rent-app"); if (!root || !window.DA) return;
  var T = DA.RENT_TYPES, E = UI.esc, R = [], META = {}, GEO = null, KEY = "da_rent_v2";
  var BASE = (document.currentScript && document.currentScript.src || "").replace(/assets\/rent\.js.*$/, "");
  var st = { region: 1, city: null, district: "", type: "shop", area: 120, units: 1, mine: "", sat: true };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}") || {}); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var f0 = function (v) { return v == null || !isFinite(v) ? "—" : Math.round(v).toLocaleString("en-US"); };
  var f2 = function (v) { return v == null || !isFinite(v) ? "—" : (Math.round(v * 100) / 100).toLocaleString("en-US"); };
  var norm = function (s) { return String(s || "").trim().replace(/^(محافظة|مدينة|حي)\s+/, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " "); };
  function isUnit(t) { return (T[t] || [])[1] === "unit"; }
  function region(id) { return GEO.regions.find(function (r) { return r.id === +id; }); }
  function city(id) { return GEO.cities.find(function (c) { return String(c.id) === String(id); }); }
  function citiesOf(rid) { return GEO.cities.filter(function (c) { return c.r === +rid; }); }
  /* صفوف الأسعار لمدينة: نطابق الاسم بعد التطبيع (الرياض = الرياض، الاحساء = الأحساء…) */
  function rowsOf(c, type) { if (!c) return []; var n = norm(c.n); return R.filter(function (r) { return norm(r.city) === n && (!type || r.type === type); }); }
  function rowsOfRegion(rid, type) { var ns = citiesOf(rid).map(function (c) { return norm(c.n); }); return R.filter(function (r) { return ns.indexOf(norm(r.city)) >= 0 && r.type === type; }); }
  function avg(list) { return list.length ? list.reduce(function (a, r) { return a + r.avg; }, 0) / list.length : null; }

  /* ---------- الحالة الحالية والسعر المرجعي ---------- */
  function pick() {
    var c = city(st.city), list = rowsOf(c, st.type), d = norm(st.district);
    var exact = d ? list.find(function (r) { return norm(r.district) === d; }) : null;
    if (exact) return { row: exact, level: "district" };
    if (list.length) return { row: { avg: avg(list), min: Math.min.apply(null, list.map(function (r) { return r.min == null ? r.avg : r.min; })), max: Math.max.apply(null, list.map(function (r) { return r.max == null ? r.avg : r.max; })), sample: list.some(function (r) { return r.sample; }), source: "متوسط " + list.length + " حي في " + c.n, n: list.length }, level: "city" };
    var rl = rowsOfRegion(st.region, st.type);
    if (rl.length) return { row: { avg: avg(rl), min: null, max: null, sample: true, source: "متوسط " + rl.length + " سعر في " + region(st.region).name, n: rl.length }, level: "region" };
    return null;
  }

  /* ---------- الواجهة ---------- */
  function render() {
    var regs = GEO.regions.slice().sort(function (a, b) { return a.name.localeCompare(b.name, "ar"); });
    if (!region(st.region)) st.region = 1;
    var cs = citiesOf(st.region);
    if (!city(st.city) || city(st.city).r !== +st.region) st.city = (cs.find(function (c) { return c.k === "cap"; }) || cs[0] || {}).id;
    var grp = function (k, label) { var g = cs.filter(function (c) { return c.k === k; }).sort(function (a, b) { return k === "city" ? a.n.localeCompare(b.n, "ar") : 0; });
      return g.length ? '<optgroup label="' + label + '">' + g.map(function (c) { return '<option value="' + E(c.id) + '"' + (String(c.id) === String(st.city) ? " selected" : "") + ">" + E(c.n) + "</option>"; }).join("") + "</optgroup>" : ""; };
    var unit = isUnit(st.type);
    root.innerHTML =
      '<div class="cgrid rent-f">' +
      fld("rt-reg", "المنطقة", '<select id="rt-reg">' + regs.map(function (r) { return '<option value="' + r.id + '"' + (r.id === +st.region ? " selected" : "") + ">" + E(r.name) + "</option>"; }).join("") + "</select>") +
      fld("rt-city", "المدينة أو المحافظة", '<select id="rt-city">' + grp("cap", "مقر الإمارة") + grp("gov", "المحافظات") + grp("city", "مدن ومراكز أخرى") + "</select>") +
      fld("rt-dist", "الحي", '<select id="rt-dist"><option value="">كل الأحياء</option></select>') +
      fld("rt-type", "نوع العقار", '<select id="rt-type">' + Object.keys(T).map(function (k) { return '<option value="' + k + '"' + (k === st.type ? " selected" : "") + ">" + E(T[k][0]) + "</option>"; }).join("") + "</select>") +
      fld("rt-area", unit ? "عدد الوحدات" : "المساحة (م²)", '<input id="rt-area" type="number" min="1" step="' + (unit ? 1 : "any") + '" value="' + E(unit ? st.units : st.area) + '">') +
      "</div>" +
      '<div class="rent-map-wrap"><div id="rt-map" class="rent-map" dir="ltr" role="region" aria-label="خريطة الأحياء"></div>' +
      '<div class="rent-map-bar"><button type="button" class="btn btn-ghost btn-sm" id="rt-sat" aria-pressed="' + !!st.sat + '">' + (st.sat ? "خريطة الشوارع" : "صور الأقمار الصناعية") + '</button><span class="fmt" id="rt-legend"></span></div></div>' +
      '<div class="rent-links" id="rt-links"></div>' +
      '<div id="rt-out"></div>' +
      '<details class="rent-na"><summary>عندك عنوان وطني مختصر؟</summary><div class="cs-row" style="margin-top:8px"><input id="rt-na" maxlength="8" placeholder="مثال RRRD2929" dir="ltr" style="max-width:160px;text-transform:uppercase"><button type="button" class="btn btn-ghost btn-sm" id="rt-na-go">حدده على الخريطة</button></div><p class="fmt" id="rt-na-st"></p></details>';
    districts();
  }
  function fld(id, l, inner) { return '<div class="field"><label for="' + id + '">' + l + "</label>" + inner + "</div>"; }

  /* قائمة الأحياء: من حدود العنوان الوطني + أي حي له سعر */
  var DCACHE = {}, dLayer = null;
  function loadDistricts(c) {
    if (!c || !c.d) return Promise.resolve(null);
    if (DCACHE[c.id]) return Promise.resolve(DCACHE[c.id]);
    return fetch(BASE + "data/geo/d/" + c.id + ".json").then(function (r) { return r.ok ? r.json() : null; }).then(function (g) { DCACHE[c.id] = g; return g; }).catch(function () { return null; });
  }
  function districts() {
    var c = city(st.city);
    loadDistricts(c).then(function (g) {
      var names = {}, list = rowsOf(c, null);
      (g ? g.features : []).forEach(function (f) { names[norm(f.properties.n)] = f.properties.n; });
      list.forEach(function (r) { if (!names[norm(r.district)]) names[norm(r.district)] = r.district; });
      var priced = {}; rowsOf(c, st.type).forEach(function (r) { priced[norm(r.district)] = 1; });
      var arr = Object.keys(names).map(function (k) { return names[k]; }).sort(function (a, b) { return (priced[norm(b)] || 0) - (priced[norm(a)] || 0) || a.localeCompare(b, "ar"); });
      if (st.district && !names[norm(st.district)]) st.district = "";
      var sel = document.getElementById("rt-dist"); if (!sel) return;
      sel.innerHTML = '<option value="">كل الأحياء</option>' + arr.map(function (n) { return "<option" + (norm(n) === norm(st.district) ? " selected" : "") + ' value="' + E(n) + '">' + E(n) + (priced[norm(n)] ? " ●" : "") + "</option>"; }).join("");
      drawMap(c, g); out(); links();
    });
  }

  /* ---------- الخريطة ---------- */
  var map = null, base = {}, regLayer = null, nat = null;
  function color(v, lo, hi) { if (v == null) return null; var t = hi > lo ? (v - lo) / (hi - lo) : 0.5; var s = ["#D6EEEC", "#9CD3CF", "#5FB3AD", "#2D928B", "#0B7A75", "#075652"]; return s[Math.min(s.length - 1, Math.floor(t * s.length))]; }
  function drawMap(c, g) {
    if (!window.L) return;
    var el = document.getElementById("rt-map"); if (!el) return;
    if (map && map.getContainer() !== el) { map.remove(); map = null; regLayer = null; dLayer = null; nat = null; }
    if (!map) {
      map = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([24, 45], 5);
      base.sat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "صور الأقمار الصناعية © Esri, Maxar, Earthstar Geographics" });
      base.road = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" });
      base.lbl = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "" });
      (st.sat ? base.sat : base.road).addTo(map); if (st.sat) base.lbl.addTo(map);
      map.attributionControl.addAttribution("حدود الأحياء: العنوان الوطني");
      map.on("focus", function () { map.scrollWheelZoom.enable(); }); map.on("blur", function () { map.scrollWheelZoom.disable(); });
      fetch(BASE + "data/geo/regions.json").then(function (r) { return r.json(); }).then(function (gj) {
        regLayer = L.geoJSON(gj, { style: function (f) { return { color: "#fff", weight: f.properties.id === +st.region ? 2.5 : 1, fillOpacity: f.properties.id === +st.region ? 0 : 0.12, fillColor: "#0B7A75" }; },
          onEachFeature: function (f, l) { l.bindTooltip(f.properties.n, { sticky: true, direction: "top" }); l.on("click", function () { if (f.properties.id !== +st.region) { st.region = f.properties.id; st.city = null; st.district = ""; save(); render(); } }); } }).addTo(map);
        regLayer.bringToBack();
      }).catch(function () {});
    } else if (regLayer) regLayer.setStyle(function (f) { return { color: "#fff", weight: f.properties.id === +st.region ? 2.5 : 1, fillOpacity: f.properties.id === +st.region ? 0 : 0.12, fillColor: "#0B7A75" }; });
    if (dLayer) { map.removeLayer(dLayer); dLayer = null; }
    var priced = {}; rowsOf(c, st.type).forEach(function (r) { priced[norm(r.district)] = r; });
    var vals = Object.keys(priced).map(function (k) { return priced[k].avg; }), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (g && g.features.length) {
      dLayer = L.geoJSON(g, {
        filter: function (f) { return !!f.geometry; },
        style: function (f) { var r = priced[norm(f.properties.n)], sel = st.district && norm(f.properties.n) === norm(st.district), fc = r ? color(r.avg, lo, hi) : null;
          return { color: sel ? "#C9822A" : "#ffffff", weight: sel ? 3 : 1, fillColor: fc || "#9AA5A4", fillOpacity: fc ? 0.55 : 0.12, dashArray: fc ? null : "3" }; },
        onEachFeature: function (f, l) { var r = priced[norm(f.properties.n)];
          l.bindTooltip("<b>" + E(f.properties.n) + "</b><br>" + (r ? f0(r.avg) + " " + (isUnit(st.type) ? "ر.س/سنة" : "ر.س/م²/سنة") + (r.sample ? " · تقديري" : "") : "ما فيه سعر " + E(T[st.type][0])), { sticky: true, direction: "top" });
          l.on("click", function () { st.district = f.properties.n; save(); var s = document.getElementById("rt-dist"); if (s) s.value = f.properties.n; drawMap(c, g); out(); links(); }); }
      }).addTo(map);
      var target = st.district && dLayer.getLayers().find(function (l) { return norm(l.feature.properties.n) === norm(st.district); });
      map.flyToBounds((target || dLayer).getBounds(), { padding: [20, 20], duration: 0.6, maxZoom: target ? 15 : 12 });
    } else if (c && c.c) map.flyTo(c.c, 11, { duration: 0.6 });
    else { var r = region(st.region); if (r) map.flyTo(r.c, 7, { duration: 0.6 }); }
    document.getElementById("rt-legend").textContent = vals.length ? "الألوان: سعر " + T[st.type][0] + " من " + f0(lo) + " (فاتح) إلى " + f0(hi) + " (غامق). المنقط ما له سعر." : (g ? "ما فيه أسعار " + T[st.type][0] + " لأحياء " + (c ? c.n : "") + " للحين." : "حدود الأحياء غير متوفرة لهذي المدينة.");
    setTimeout(function () { map.invalidateSize(); }, 50);
  }
  function center() {
    var c = city(st.city);
    if (dLayer && st.district) { var l = dLayer.getLayers().find(function (x) { return norm(x.feature.properties.n) === norm(st.district); }); if (l) { var p = l.getBounds().getCenter(); return [p.lat, p.lng]; } }
    if (nat) return nat;
    return c && c.c ? c.c : region(st.region).c;
  }
  function links() {
    var p = center(), ll = p[0].toFixed(5) + "," + p[1].toFixed(5), el = document.getElementById("rt-links"); if (!el) return;
    el.innerHTML = '<span class="fmt">افتح الموقع في:</span> ' +
      '<a href="https://www.google.com/maps/@' + ll + ',16z/data=!3m1!1e3" target="_blank" rel="noopener noreferrer">قوقل ستالايت</a> · ' +
      '<a href="https://maps.address.gov.sa/" target="_blank" rel="noopener noreferrer">خرائط العنوان الوطني</a> · ' +
      '<a href="https://balady.gov.sa/ar/services/%D8%A7%D9%84%D8%AE%D8%B1%D9%8A%D8%B7%D8%A9-%D8%A7%D9%84%D8%AA%D9%81%D8%A7%D8%B9%D9%84%D9%8A%D8%A9" target="_blank" rel="noopener noreferrer">الخريطة التفاعلية في بلدي</a>' +
      ' <span class="fmt num">(' + ll + ")</span>";
  }

  /* ---------- النتيجة ---------- */
  function out() {
    var o = document.getElementById("rt-out"); if (!o) return;
    var c = city(st.city), p = pick(), unit = isUnit(st.type), lbl = unit ? "ر.س سنويًا للوحدة" : "ر.س للمتر سنويًا";
    if (!p) { o.innerHTML = '<p class="verdict">ما عندنا أسعار ' + E(T[st.type][0]) + " في " + E(region(st.region).name) + ' للحين. اكتب إيجارك الفعلي تحت عشان تستخدمه في حاسبة التكلفة، أو <a href="index.html#contact">اطلب دراسة موقع</a>.</p>' + mineBox(null, unit); return; }
    var cur = p.row, q = unit ? Math.max(1, +st.units || 1) : Math.max(1, +st.area || 1), yr = function (v) { return v == null || !isFinite(v) ? null : v * q; };
    var scope = p.level === "district" ? "حي " + st.district : p.level === "city" ? (st.district ? "ما عندنا سعر لحي " + st.district + "، هذا متوسط " + c.n : "متوسط " + c.n) : "ما عندنا أسعار في " + (c ? c.n : "") + "، هذا متوسط المنطقة";
    var flag = cur.sample ? '<span class="flag">' + (cur.auto ? "تقدير ذكاء اصطناعي" : "تقديري") + "</span>" : '<span class="flag good">' + E(DA.CONF[cur.confidence] || "موثق") + "</span>";
    var list = rowsOf(c, st.type).sort(function (a, b) { return b.avg - a.avg; }), max = list.length ? list[0].avg : 1;
    o.innerHTML =
      '<p class="rent-src">' + flag + " " + E(scope) + " · المصدر: " + (cur.url ? '<a href="' + E(cur.url) + '" target="_blank" rel="noopener noreferrer">' + E(cur.source) + "</a>" : E(cur.source || "—")) + (cur.date ? " · " + E(cur.date) : "") + (META.updated ? " · آخر تحديث آلي " + E(META.updated) : "") + "</p>" +
      '<div class="res-kpis">' + kpi("سعر " + (unit ? "الوحدة" : "المتر") + " (المتوسط)", f2(cur.avg) + " ر.س", lbl) + kpi("المدى", cur.min != null && cur.max != null ? f0(cur.min) + " – " + f0(cur.max) : "—", lbl) +
      kpi("إيجارك المتوقع سنويًا", f0(yr(cur.avg)) + " ر.س", cur.min != null && cur.max != null ? "بين " + f0(yr(cur.min)) + " و " + f0(yr(cur.max)) : "") + kpi("شهريًا", f0(yr(cur.avg) / 12) + " ر.س", unit ? q + " وحدة" : f0(q) + " م²") + "</div>" +
      '<div class="grid2" style="margin-top:14px"><div>' + (list.length ? '<p class="card-t">' + E(T[st.type][0]) + " في " + E(c.n) + " (" + lbl + ')</p><div class="hbars">' +
        list.slice(0, 12).map(function (r) { var on = norm(r.district) === norm(st.district); return '<div class="hb' + (on ? " on" : "") + '"><span class="nm" title="' + E(r.district) + '">' + E(r.district) + (r.sample ? " *" : "") + '</span><span class="track"><span class="fill' + (on ? " warn" : "") + '" style="width:' + Math.max(2, r.avg / max * 100) + '%;display:block"></span></span><span class="num">' + f0(r.avg) + "</span></div>"; }).join("") + "</div>" +
        (list.some(function (r) { return r.sample; }) ? '<p class="fmt" style="margin-top:6px">* تقديري. تأكد من العروض الفعلية قبل أي قرار.</p>' : "") : '<p class="fmt">ما فيه أسعار أحياء لـ ' + E(c ? c.n : "") + " للحين.</p>") + "</div>" +
      "<div>" + mineBox(cur, unit, q) + "</div></div>";
  }
  function mineBox(cur, unit, q) {
    var mine = +st.mine > 0 ? +st.mine : null;
    return '<p class="card-t">قارن إيجارك الفعلي</p><div class="field"><label for="rt-mine">إيجارك السنوي (ر.س)</label><input id="rt-mine" type="number" min="0" step="500" value="' + E(st.mine) + '"' + (cur ? ' placeholder="' + E(f0(cur.avg * q)) + '"' : "") + "></div>" +
      '<p class="verdict" id="rt-v" style="margin-top:10px">' + verdict(mine, cur, q, unit) + "</p>" +
      '<div class="res-actions" style="margin-top:12px"><button type="button" class="btn btn-primary btn-sm" id="rt-use">استخدمه في حاسبة التكلفة</button><span class="status" id="rt-st" aria-live="polite"></span></div>';
  }
  function verdict(mine, cur, q, unit) {
    if (!cur) return mine ? "إيجارك " + f0(mine) + " ر.س سنويًا. نقدر نضيفه لحاسبة التكلفة." : "اكتب إيجارك الحالي أو العرض اللي جاك.";
    if (mine == null) return "اكتب إيجارك الحالي أو العرض اللي جاك، ونقولك هل هو أعلى أو أقل من المتوسط.";
    var diff = mine / (cur.avg * q) - 1, per = mine / q, u = unit ? "للوحدة" : "للمتر";
    if (Math.abs(diff) <= 0.1) return "إيجارك قريب من المتوسط (" + f2(per) + " ر.س " + u + "). سعر عادل.";
    if (diff > 0) return "إيجارك أعلى من المتوسط بـ " + Math.round(diff * 100) + "% (" + f2(per) + " ر.س " + u + "). فاوض، أو تأكد إن الموقع يستاهل الفرق في الحركة والواجهة.";
    return "إيجارك أقل من المتوسط بـ " + Math.round(-diff * 100) + "%. صفقة جيدة، تأكد بس من مدة العقد والزيادة السنوية.";
  }
  function kpi(l, v, sub) { return '<div class="kpi"><span class="label">' + E(l) + '</span><span class="value num">' + v + "</span>" + (sub ? '<span class="fmt">' + E(sub) + "</span>" : "") + "</div>"; }

  /* ---------- الأحداث ---------- */
  root.addEventListener("change", function (e) {
    var id = e.target.id, v = e.target.value;
    if (id === "rt-reg") { st.region = +v; st.city = null; st.district = ""; save(); render(); }
    else if (id === "rt-city") { st.city = v; st.district = ""; nat = null; save(); districts(); }
    else if (id === "rt-dist") { st.district = v; nat = null; save(); drawMap(city(st.city), DCACHE[st.city]); out(); links(); }
    else if (id === "rt-type") { var wasU = isUnit(st.type); st.type = v; save(); if (wasU !== isUnit(v)) render(); else districts(); }
  });
  root.addEventListener("input", function (e) {
    if (e.target.id === "rt-area") { if (isUnit(st.type)) st.units = e.target.value; else st.area = e.target.value; save(); out(); }
    if (e.target.id === "rt-mine") { st.mine = e.target.value; save(); var p = pick(), unit = isUnit(st.type), q = unit ? Math.max(1, +st.units || 1) : Math.max(1, +st.area || 1); document.getElementById("rt-v").textContent = verdict(+st.mine > 0 ? +st.mine : null, p && p.row, q, unit); }
  });
  root.addEventListener("click", function (e) {
    var t = e.target;
    if (t.id === "rt-sat" && map) { st.sat = !st.sat; save(); if (st.sat) { map.removeLayer(base.road); base.sat.addTo(map); base.lbl.addTo(map); } else { map.removeLayer(base.sat); map.removeLayer(base.lbl); base.road.addTo(map); }
      base.sat.bringToBack(); base.road.bringToBack(); t.textContent = st.sat ? "خريطة الشوارع" : "صور الأقمار الصناعية"; t.setAttribute("aria-pressed", String(st.sat)); return; }
    if (t.id === "rt-use") { var p = pick(), unit = isUnit(st.type), q = unit ? Math.max(1, +st.units || 1) : Math.max(1, +st.area || 1);
      var yr = +st.mine > 0 ? +st.mine : p ? p.row.avg * q : 0, s = document.getElementById("rt-st");
      if (!yr) { s.textContent = "اكتب إيجارك أول."; return; }
      var ok = window.__daCosting && window.__daCosting.setFixed("الإيجار", Math.round(yr / 12));
      s.textContent = ok ? "انضاف " + f0(yr / 12) + " ر.س شهريًا كإيجار في حاسبة التكلفة." : "الحاسبة ما تحمّلت.";
      if (ok) setTimeout(function () { var c = document.getElementById("costing"); if (c) c.scrollIntoView({ behavior: "smooth", block: "start" }); }, 700); return; }
    if (t.id === "rt-na-go") {
      var code = String(document.getElementById("rt-na").value || "").toUpperCase().replace(/\s/g, ""), ns = document.getElementById("rt-na-st");
      if (!/^[A-Z]{4}\d{4}$/.test(code)) { ns.textContent = "العنوان المختصر 4 حروف و4 أرقام، مثل RRRD2929."; return; }
      ns.textContent = "جاري البحث…";
      DA.geocodeShort(code).then(function (g) {
        nat = [g.lat, g.lng]; if (map) { map.flyTo(nat, 16, { duration: 0.8 }); L.circleMarker(nat, { radius: 9, color: "#C9822A", weight: 3, fillOpacity: 0.3 }).addTo(map).bindTooltip(code).openTooltip(); }
        ns.textContent = "تم تحديد " + code + " على الخريطة."; links();
      }).catch(function (x) { ns.textContent = x.message; });
    }
  });

  /* ---------- التحميل: الخريطة تتحمل لما يوصل الزائر للقسم ---------- */
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    return new Promise(function (res, rej) {
      var css = document.createElement("link"); css.rel = "stylesheet"; css.href = BASE + "assets/vendor/leaflet/leaflet.css"; document.head.appendChild(css);
      var s = document.createElement("script"); s.src = BASE + "assets/vendor/leaflet/leaflet.js"; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  function start() {
    Promise.all([fetch(BASE + "data/geo/index.json").then(function (r) { return r.json(); }), DA.rents(), DA.rentsMeta()]).then(function (x) {
      GEO = x[0]; META = x[2] || {}; R = (x[1] || []).filter(function (r) { return r && r.city && r.district && T[r.type] && r.avg > 0; });
      render();
      loadLeaflet().then(function () { drawMap(city(st.city), DCACHE[st.city]); }).catch(function () { var m = document.getElementById("rt-map"); if (m) m.innerHTML = '<p class="fmt" style="padding:12px">الخريطة ما تحمّلت. الأسعار شغالة تحت.</p>'; });
    }).catch(function () { root.innerHTML = '<p class="msg">ما قدرنا نحمّل البيانات. حدّث الصفحة.</p>'; });
  }
  if ("IntersectionObserver" in window) { var io = new IntersectionObserver(function (en) { if (en.some(function (x) { return x.isIntersecting; })) { io.disconnect(); start(); } }, { rootMargin: "400px" }); io.observe(root); }
  else start();
})();

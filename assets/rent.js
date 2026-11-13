/* أداة أسعار الإيجار: سعر المتر حسب المدينة والحي ونوع العقار، وكم يطلع إيجار مساحتك، ومقارنة إيجارك الفعلي. */
(function () {
  var root = document.getElementById("rent-app"); if (!root || !window.DA) return;
  var T = DA.RENT_TYPES, E = UI.esc, R = [], KEY = "da_rent_v1";
  var st = { city: "الرياض", type: "shop", district: "", area: 120, units: 1, mine: "" };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}") || {}); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var f0 = function (v) { return v == null || !isFinite(v) ? "—" : Math.round(v).toLocaleString("en-US"); };
  var f2 = function (v) { return v == null || !isFinite(v) ? "—" : (Math.round(v * 100) / 100).toLocaleString("en-US"); };
  function isUnit(t) { return (T[t] || [])[1] === "unit"; }
  function cities() { return Array.from(new Set(R.map(function (r) { return r.city; }))).sort(function (a, b) { return a.localeCompare(b, "ar"); }); }
  function rows() { return R.filter(function (r) { return r.city === st.city && r.type === st.type; }).sort(function (a, b) { return b.avg - a.avg; }); }

  function render() {
    var cs = cities(); if (cs.length && cs.indexOf(st.city) < 0) st.city = cs[0];
    var list = rows(), types = Object.keys(T).filter(function (k) { return R.some(function (r) { return r.city === st.city && r.type === k; }); });
    if (list.length && !list.some(function (r) { return r.district === st.district; })) st.district = list[0].district;
    var cur = list.find(function (r) { return r.district === st.district; }), unit = isUnit(st.type);
    root.innerHTML =
      '<div class="cgrid rent-f">' +
      '<div class="field"><label for="rt-city">المدينة</label><select id="rt-city">' + cs.map(function (c) { return "<option" + (c === st.city ? " selected" : "") + ">" + E(c) + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="rt-type">نوع العقار</label><select id="rt-type">' + Object.keys(T).map(function (k) { var has = types.indexOf(k) >= 0; return '<option value="' + k + '"' + (k === st.type ? " selected" : "") + ">" + E(T[k][0]) + (has ? "" : " (ما فيه أسعار هنا)") + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label for="rt-dist">الحي أو المنطقة</label><select id="rt-dist"' + (list.length ? "" : " disabled") + ">" + list.map(function (r) { return "<option" + (r.district === st.district ? " selected" : "") + ">" + E(r.district) + "</option>"; }).join("") + "</select></div>" +
      (unit ? '<div class="field"><label for="rt-area">عدد الوحدات</label><input id="rt-area" type="number" min="1" step="1" value="' + E(st.units) + '"></div>'
            : '<div class="field"><label for="rt-area">المساحة (م²)</label><input id="rt-area" type="number" min="1" step="any" value="' + E(st.area) + '"></div>') +
      "</div>" + '<div id="rt-out"></div>';
    out();
  }
  function out() {
    var o = document.getElementById("rt-out"), list = rows(), cur = list.find(function (r) { return r.district === st.district; }), unit = isUnit(st.type);
    if (!cur) { o.innerHTML = '<p class="verdict" style="margin-top:14px">ما عندنا أسعار ' + E(T[st.type][0]) + " في " + E(st.city) + " للحين. اكتب إيجارك الفعلي في حاسبة التكلفة، أو <a href=\"#contact\">اطلب دراسة موقع</a>.</p>"; return; }
    var q = unit ? Math.max(1, +st.units || 1) : Math.max(1, +st.area || 1);
    var yr = function (v) { return v == null ? null : v * q; };
    var lbl = unit ? "ر.س سنويًا للوحدة" : "ر.س للمتر سنويًا";
    var mine = +st.mine > 0 ? +st.mine : null, diff = mine ? (mine / yr(cur.avg) - 1) : null;
    var max = list[0].avg;
    o.innerHTML =
      '<p class="rent-src">' + (cur.sample ? '<span class="flag">تقديري</span> ' : '<span class="flag good">موثق</span> ') + "المصدر: " + E(cur.source || "—") + (cur.date ? " · " + E(cur.date) : "") + "</p>" +
      '<div class="res-kpis">' +
      kpi("سعر " + (unit ? "الوحدة" : "المتر") + " (المتوسط)", f2(cur.avg) + " ر.س", lbl) +
      kpi("المدى", cur.min != null && cur.max != null ? f0(cur.min) + " – " + f0(cur.max) : "—", lbl) +
      kpi("إيجارك المتوقع سنويًا", f0(yr(cur.avg)) + " ر.س", cur.min != null && cur.max != null ? "بين " + f0(yr(cur.min)) + " و " + f0(yr(cur.max)) : "") +
      kpi("شهريًا", f0(yr(cur.avg) / 12) + " ر.س", unit ? q + " وحدة" : f0(q) + " م²") + "</div>" +
      '<div class="grid2" style="margin-top:14px"><div><p class="card-t">' + E(T[st.type][0]) + " في " + E(st.city) + " (" + lbl + ')</p><div class="hbars">' +
      list.slice(0, 12).map(function (r) { return '<div class="hb' + (r === cur ? " on" : "") + '"><span class="nm" title="' + E(r.district) + '">' + E(r.district) + (r.sample ? " *" : "") + '</span><span class="track"><span class="fill' + (r === cur ? " warn" : "") + '" style="width:' + Math.max(2, r.avg / max * 100) + '%;display:block"></span></span><span class="num">' + f0(r.avg) + "</span></div>"; }).join("") +
      "</div>" + (list.some(function (r) { return r.sample; }) ? '<p class="fmt" style="margin-top:6px">* سعر تقديري للتجربة. تأكد من العروض الفعلية قبل أي قرار.</p>' : "") + "</div>" +
      '<div><p class="card-t">قارن إيجارك الفعلي</p><div class="field"><label for="rt-mine">إيجارك السنوي (ر.س)</label><input id="rt-mine" type="number" min="0" step="500" value="' + E(st.mine) + '" placeholder="' + E(f0(yr(cur.avg))) + '"></div>' +
      '<p class="verdict' + (diff != null && diff > 0.1 ? " bad" : "") + '" id="rt-v" style="margin-top:10px">' + verdict(mine, diff, q, unit, cur) + "</p>" +
      '<div class="res-actions" style="margin-top:12px"><button type="button" class="btn btn-primary btn-sm" id="rt-use">استخدمه في حاسبة التكلفة</button><span class="status" id="rt-st" aria-live="polite"></span></div></div></div>';
  }
  function verdict(mine, diff, q, unit, cur) {
    if (mine == null) return "اكتب إيجارك الحالي أو العرض اللي جاك، ونقولك هل هو أعلى أو أقل من متوسط " + E(cur.district) + ".";
    var per = mine / q;
    if (Math.abs(diff) <= 0.1) return "إيجارك قريب من متوسط الحي (" + f2(per) + " ر.س " + (unit ? "للوحدة" : "للمتر") + "). سعر عادل.";
    if (diff > 0) return "إيجارك أعلى من متوسط الحي بـ " + Math.round(diff * 100) + "% (" + f2(per) + " ر.س " + (unit ? "للوحدة" : "للمتر") + "). فاوض، أو تأكد إن الموقع يستاهل الفرق في الحركة والواجهة.";
    return "إيجارك أقل من متوسط الحي بـ " + Math.round(-diff * 100) + "%. صفقة جيدة، تأكد بس من مدة العقد والزيادة السنوية.";
  }
  function kpi(l, v, sub) { return '<div class="kpi"><span class="label">' + E(l) + '</span><span class="value num">' + v + "</span>" + (sub ? '<span class="fmt">' + E(sub) + "</span>" : "") + "</div>"; }

  root.addEventListener("change", function (e) {
    var id = e.target.id;
    if (id === "rt-city") { st.city = e.target.value; st.district = ""; }
    else if (id === "rt-type") { st.type = e.target.value; st.district = ""; }
    else if (id === "rt-dist") { st.district = e.target.value; save(); out(); return; }
    else return;
    save(); render();
  });
  root.addEventListener("input", function (e) {
    if (e.target.id === "rt-area") { if (isUnit(st.type)) st.units = e.target.value; else st.area = e.target.value; save(); out(); document.getElementById("rt-area").focus(); }
    if (e.target.id === "rt-mine") { st.mine = e.target.value; save(); var list = rows(), cur = list.find(function (r) { return r.district === st.district; }); if (!cur) return;
      var unit = isUnit(st.type), q = unit ? Math.max(1, +st.units || 1) : Math.max(1, +st.area || 1), mine = +st.mine > 0 ? +st.mine : null, diff = mine ? mine / (cur.avg * q) - 1 : null, v = document.getElementById("rt-v");
      v.className = "verdict" + (diff != null && diff > 0.1 ? " bad" : ""); v.innerHTML = verdict(mine, diff, q, unit, cur); }
  });
  root.addEventListener("click", function (e) {
    if (e.target.id !== "rt-use") return;
    var cur = rows().find(function (r) { return r.district === st.district; }); if (!cur) return;
    var q = isUnit(st.type) ? Math.max(1, +st.units || 1) : Math.max(1, +st.area || 1), yr = +st.mine > 0 ? +st.mine : cur.avg * q;
    var ok = window.__daCosting && window.__daCosting.setFixed("الإيجار", Math.round(yr / 12));
    document.getElementById("rt-st").textContent = ok ? "انضاف " + f0(yr / 12) + " ر.س شهريًا كإيجار في حاسبة التكلفة." : "الحاسبة ما تحمّلت.";
    if (ok) setTimeout(function () { var c = document.getElementById("costing"); if (c) c.scrollIntoView({ behavior: "smooth", block: "start" }); }, 700);
  });

  DA.rents().then(function (list) { R = (list || []).filter(function (r) { return r && r.city && r.district && T[r.type] && r.avg > 0; }); render(); })
    .catch(function () { root.innerHTML = '<p class="msg">ما قدرنا نحمّل الأسعار. حدّث الصفحة.</p>'; });
})();

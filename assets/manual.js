/* الإدخال اليدوي لأدوات التحليل: جدول تكتب فيه أو تلصق من Excel، ثم يتحلل بنفس محرك رفع الملفات. */
(function () {
  var COLS = {
    sales: [["التاريخ", "date", "2026-01-15"], ["الفرع", "text", "الفرع الرئيسي"], ["الصنف", "text", "ساندويتش طعمية"], ["المبلغ", "number", "1500"]],
    traffic: [["المصدر", "text", "انستقرام"], ["الزيارات", "number", "3100"], ["الطلبات", "number", "40"]]
  };
  var E = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var KEY = "da_manual_v1", saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} }

  function rowHtml(tool, vals) {
    return "<tr>" + COLS[tool].map(function (c, i) {
      return '<td><input type="text"' + (c[1] === "number" ? ' inputmode="decimal" class="qty"' : "") + ' value="' + E(vals[i] || "") + '" placeholder="' + E(c[2]) + '" aria-label="' + E(c[0]) + '"></td>';
    }).join("") + '<td><button type="button" class="btn btn-ghost btn-sm" data-mrm aria-label="حذف الصف">حذف</button></td></tr>';
  }
  function open(tool) {
    var box = document.getElementById("man-" + tool); if (!box) return;
    if (!box.hidden) { box.hidden = true; return; }
    var rows = (saved[tool] && saved[tool].length) ? saved[tool] : [[], [], []];
    box.innerHTML = '<p class="fmt">اكتب صفوفك أو انسخ الجدول من Excel والصقه في أي خانة. ' + (tool === "sales" ? "كل صف = عملية بيع أو مجموع يوم/شهر لصنف في فرع." : "كل صف = مصدر زيارات واحد.") + "</p>" +
      '<div class="tbl-wrap"><table class="data man-grid"><thead><tr>' + COLS[tool].map(function (c) { return "<th>" + E(c[0]) + "</th>"; }).join("") + "<th></th></tr></thead><tbody>" +
      rows.map(function (r) { return rowHtml(tool, r); }).join("") + "</tbody></table></div>" +
      '<div class="toolbar" style="margin-top:8px"><button type="button" class="btn btn-ghost btn-sm" data-madd>صف جديد</button><button type="button" class="btn btn-ghost btn-sm" data-mclear>امسح الجدول</button><button type="button" class="btn btn-primary btn-sm" data-mgo>حلّل البيانات</button><span class="status" data-mst aria-live="polite"></span></div>';
    box.hidden = false;
    box.querySelector("input").focus();
  }
  function read(tool, box) {
    var out = [];
    box.querySelectorAll("tbody tr").forEach(function (tr) {
      var v = [].map.call(tr.querySelectorAll("input"), function (i) { return i.value.trim(); });
      if (v.some(Boolean)) out.push(v);
    });
    return out;
  }
  function store(tool, box) { saved[tool] = read(tool, box).slice(0, 500); persist(); }

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-manual]"); if (b) { open(b.dataset.manual); return; }
    var box = e.target.closest(".manual"); if (!box) return;
    var tool = box.id.slice(4), st = box.querySelector("[data-mst]");
    if (e.target.closest("[data-madd]")) { box.querySelector("tbody").insertAdjacentHTML("beforeend", rowHtml(tool, [])); var ins = box.querySelectorAll("tbody tr:last-child input"); if (ins[0]) ins[0].focus(); return; }
    if (e.target.closest("[data-mrm]")) { e.target.closest("tr").remove(); store(tool, box); return; }
    if (e.target.closest("[data-mclear]")) { box.querySelector("tbody").innerHTML = rowHtml(tool, []) + rowHtml(tool, []) + rowHtml(tool, []); store(tool, box); return; }
    if (e.target.closest("[data-mgo]")) {
      var data = read(tool, box), cols = COLS[tool], numIdx = cols.map(function (c, i) { return c[1] === "number" ? i : -1; }).filter(function (i) { return i >= 0; });
      var good = data.filter(function (r) { return numIdx.some(function (i) { return isFinite(parseFloat(String(r[i] || "").replace(/[,٬]/g, "").replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); }))); }); });
      if (!good.length) { st.textContent = tool === "sales" ? "اكتب المبلغ في صف واحد على الأقل." : "اكتب الزيارات في صف واحد على الأقل."; return; }
      var rows = good.map(function (r) { var o = {}; cols.forEach(function (c, i) { o[c[0]] = r[i] || ""; }); return o; });
      store(tool, box);
      if (!window.__daManual) { st.textContent = "الأداة ما تحمّلت، حدّث الصفحة."; return; }
      if (window.__daManual(tool, rows)) { st.textContent = "تم التحليل (" + rows.length + " صف)."; var out = document.getElementById("out-" + tool); if (out) out.scrollIntoView({ behavior: "smooth", block: "start" }); }
      else st.textContent = "خلص رصيدك. اطلب باقة عشان تكمل.";
    }
  });
  document.addEventListener("input", function (e) { var box = e.target.closest(".manual"); if (box) { clearTimeout(box._t); box._t = setTimeout(function () { store(box.id.slice(4), box); }, 400); } });
  /* سحب وإفلات ملف Excel أو CSV على لوحة الأداة: يمر على نفس مسار زر الرفع (نفس الفحص والرصيد) */
  ["sales", "traffic"].forEach(function (tool) {
    var inp = document.getElementById("f-" + tool), zone = inp && inp.closest(".tool"); if (!zone) return;
    ["dragenter", "dragover"].forEach(function (ev) { zone.addEventListener(ev, function (e) { if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], "Files") >= 0) { e.preventDefault(); zone.classList.add("drop-on"); } }); });
    ["dragleave", "drop"].forEach(function (ev) { zone.addEventListener(ev, function () { zone.classList.remove("drop-on"); }); });
    zone.addEventListener("drop", function (e) { var f = e.dataTransfer && e.dataTransfer.files; if (!f || !f.length) return; e.preventDefault();
      if (zone.hidden || zone.offsetParent === null) return;
      try { var dt = new DataTransfer(); dt.items.add(f[0]); inp.files = dt.files; inp.dispatchEvent(new Event("change", { bubbles: true })); } catch (x) {} });
  });
  /* لصق جدول من Excel: يوزّع الأعمدة والصفوف ابتداءً من الخانة الحالية */
  document.addEventListener("paste", function (e) {
    var inp = e.target, box = inp.closest && inp.closest(".manual"); if (!box || inp.tagName !== "INPUT") return;
    var txt = (e.clipboardData || window.clipboardData).getData("text"); if (!/[\t\n]/.test(txt)) return;
    e.preventDefault();
    var tool = box.id.slice(4), lines = txt.replace(/\r/g, "").split("\n").filter(function (l) { return l.trim(); }).slice(0, 500);
    var tr = inp.closest("tr"), tb = tr.parentNode, c0 = [].indexOf.call(tr.querySelectorAll("input"), inp), r0 = [].indexOf.call(tb.children, tr);
    lines.forEach(function (l, k) {
      while (tb.children.length <= r0 + k) tb.insertAdjacentHTML("beforeend", rowHtml(tool, []));
      var ins = tb.children[r0 + k].querySelectorAll("input");
      l.split("\t").forEach(function (v, j) { if (ins[c0 + j]) ins[c0 + j].value = v.trim(); });
    });
    store(tool, box);
    var st = box.querySelector("[data-mst]"); if (st) st.textContent = "انلصق " + lines.length + " صف. إذا أول صف عناوين احذفه.";
  });
})();

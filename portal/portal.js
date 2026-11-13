/* بوابة العملاء: كل عميل يشوف بياناته فقط */
(function () {
  var S = DA.need("client"), E = UI.esc, M = null, view = "home";
  var $ = function (i) { return document.getElementById(i); };
  $("who").textContent = S.name;
  $("out").onclick = function () { DA.logout(); location.href = "../login.html"; };
  var NAV = [["home", "الرئيسية"], ["tools", "الأدوات"], ["projects", "مشروعي"], ["requests", "طلباتي"], ["reports", "تقاريري"], ["invoices", "فواتيري"], ["account", "حسابي"]];
  var WA = "966569184730";

  function head(t, a) { return '<div class="top"><div class="row"><button class="btn ghost sm menu-btn" type="button" data-menu>القائمة</button><h1>' + E(t) + '</h1></div><div class="acts">' + (a || "") + "</div></div>"; }
  function table(h, rows, empty) { return rows.length ? '<div class="scroll"><table><thead><tr>' + h.map(function (x) { return "<th>" + E(x) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div>" : '<p class="empty">' + E(empty) + "</p>"; }
  function invState(i) { return i.status === "مستحقة" && UI.daysTo(i.due) < 0 ? "متأخرة" : i.status; }
  function bind(sel, fn) { $("main").querySelectorAll(sel).forEach(function (el) { el.onclick = function (e) { e.preventDefault(); fn(el); }; }); }

  async function go(v) {
    view = v;
    try { M = await DA.mine(); } catch (x) { DA.logout(); location.href = "../login.html"; return; }
    $("org").textContent = M.client.company;
    var waiting = M.requests.filter(function (r) { return r.status === "بانتظار العميل"; }).length, due = M.invoices.filter(function (i) { return i.status === "مستحقة"; }).length;
    $("nav").innerHTML = NAV.map(function (n) { var c = n[0] === "requests" && waiting ? waiting : n[0] === "invoices" && due ? due : 0; return '<button type="button" data-v="' + n[0] + '"' + (n[0] === v ? ' aria-current="page"' : "") + "><span>" + n[1] + "</span>" + (c ? '<span class="cnt">' + c + "</span>" : "") + "</button>"; }).join("");
    $("side").classList.remove("open");
    if (S.must_change && v !== "account") { V.account($("main"), true); } else V[v]($("main"));
    $("main").querySelectorAll("[data-menu]").forEach(function (b) { b.onclick = function () { $("side").classList.toggle("open"); }; });
    $("main").focus({ preventScroll: true });
  }
  $("nav").onclick = function (e) { var b = e.target.closest("[data-v]"); if (b) go(b.dataset.v); };

  function meter(label, used, max) { var inf = max == null, pct = inf ? 0 : Math.min(100, used / Math.max(1, max) * 100);
    return '<div class="meter"><div class="row" style="justify-content:space-between"><span class="small">' + E(label) + '</span><span class="small num">' + (inf ? used + " · بدون حد" : used + " / " + max) + '</span></div><div class="bar"><i class="' + (pct >= 80 ? "hot" : "") + '" style="width:' + (inf ? 100 : pct) + "%;opacity:" + (inf ? ".35" : "1") + '"></i></div></div>'; }
  function stagesHtml(p) { var firstOpen = p.stages.findIndex(function (s) { return !s.done; });
    return '<ol class="stages">' + p.stages.map(function (s, i) { var cls = s.done ? "done" : i === firstOpen ? "now" : ""; return '<li class="' + cls + '"><span class="dot">' + (s.done ? "✓" : i + 1) + "</span><span><b>" + E(s.name) + "</b>" + (i === firstOpen ? '<br><span class="small muted">نشتغل عليها الحين</span>' : "") + '</span><span class="small muted num">' + (s.done ? UI.date(s.date) : "") + "</span></li>"; }).join("") + "</ol>"; }

  var V = {
    home: function (m) {
      var c = M.client, p = M.package, n = UI.daysTo(c.end), u = M.usage;
      var proj = M.projects.find(function (x) { return x.status === "active"; }) || M.projects[0];
      var due = M.invoices.filter(function (i) { return i.status === "مستحقة"; });
      var last = M.reports.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
      m.innerHTML = head("أهلًا " + S.name.split(" ")[0]) +
        '<div class="kpis"><div class="kpi"><span class="v" style="font-family:var(--f-display);text-align:right">' + E(p.name) + '</span><span class="l">باقتك</span></div>' +
        '<div class="kpi' + (n !== null && n <= 7 ? " alert" : "") + '"><span class="v">' + (n === null ? "—" : n < 0 ? "انتهى" : n) + '</span><span class="l">' + (n !== null && n >= 0 ? "يوم متبقي على الاشتراك" : "حالة الاشتراك") + "</span></div>" +
        '<div class="kpi"><span class="v">' + M.requests.filter(function (r) { return r.status !== "مغلق"; }).length + '</span><span class="l">طلبات مفتوحة</span></div>' +
        '<div class="kpi' + (due.length ? " alert" : "") + '"><span class="v">' + UI.sar(due.reduce(function (a, i) { return a + Number(i.total); }, 0)) + '</span><span class="l">مستحقات (ر.س)</span></div></div>' +
        (n !== null && n <= 7 ? '<p class="demo-bar">' + (n < 0 ? "اشتراكك انتهى" : "اشتراكك ينتهي بعد " + n + " يوم") + '. <a href="https://wa.me/' + WA + "?text=" + encodeURIComponent("السلام عليكم، أبي أجدد اشتراك " + c.company + " في باقة " + p.name + ".") + '" target="_blank" rel="noopener noreferrer">جدّد عبر واتساب</a></p>' : "") +
        '<div class="grid2"><section class="card"><h2>' + (proj ? E(proj.title) : "مشروعك") + "</h2>" + (proj ? stagesHtml(proj) + (proj.due ? '<p class="small muted">التسليم المتوقع: ' + UI.date(proj.due) + "</p>" : "") : '<p class="empty">ما فيه مشروع جاري.</p>') + "</section>" +
        '<section class="card"><h2>استخدامك هذا الشهر</h2><div style="display:flex;flex-direction:column;gap:12px">' + meter("رصيد التحليل", u.credits, p.limits.credits) + meter("طلبات الصيانة", u.maint, p.limits.maint) + meter("طلبات الخدمة", u.requests, p.limits.requests) + '</div><button class="btn" data-tools type="button" style="margin-top:14px">افتح الأدوات</button></section></div>' +
        (last ? '<section class="card"><h2>آخر تقرير</h2><p><b>' + E(last.title) + "</b> · " + UI.date(last.date) + "</p>" + (last.note ? '<p class="muted" style="margin-top:6px">' + E(last.note) + "</p>" : "") + (last.url ? '<a class="btn ghost sm" style="margin-top:10px" href="' + E(last.url) + '" target="_blank" rel="noopener noreferrer">فتح</a>' : "") + "</section>" : "");
      bind("[data-tools]", function () { go("tools"); });
    },
    tools: function (m) {
      var p = M.package, u = M.usage;
      m.innerHTML = head("الأدوات") + '<p class="small muted" style="margin-bottom:14px">الأدوات تفتح في الموقع وأنت داخل بحسابك، فتشتغل بحدود باقة ' + E(p.name) + " بدل الحد المجاني. ملفاتك تتحلل داخل متصفحك وما تنرسل لأي مكان.</p>" +
        '<section class="card"><h2>رصيد التحليل</h2>' + meter("هذا الشهر", u.credits, p.limits.credits) + '<p class="small muted" style="margin-top:8px">كل تحليل يخصم حسب نوعه: ' + Object.keys(DA.COST_N).map(function (k) { return E(DA.COST_N[k]) + " " + DA.costs()[k] + (k === "ai" ? " (قريبًا)" : ""); }).join("، ") + ".</p></section>" +
        '<div class="grid3">' + [["sales", "لوحة المبيعات", "ارفع ملف المبيعات وتطلع لك مقارنة الفروع والأصناف والأشهر."], ["traffic", "مصادر الزيارات", "ارفع تقرير Google Analytics أو الإعلانات وتعرف أي قناة تجيب طلبات."], ["maint", "طلبات الصيانة", "سجّل طلبات الصيانة وتابع المتأخر منها."]].map(function (t) {
          return '<section class="card" style="display:flex;flex-direction:column;gap:10px"><h2>' + t[1] + '</h2><p class="small muted">' + t[2] + "</p>" + (t[0] === "maint" ? meter("هذا الشهر", u.maint, p.limits.maint) : '<p class="small">يخصم من رصيد التحليل: الملف ' + DA.costs().file + " واليدوي " + DA.costs().manual + "</p>") + '<a class="btn" href="../?tool=' + t[0] + '#tools">افتح الأداة</a></section>';
        }).join("") + "</div>" +
        '<section class="card"><h2>تبي تحليل أعمق؟</h2><p class="muted">ارفع طلب ونرتب لك لوحة تتحدث تلقائيًا من ملفاتك أو نظامك.</p><button class="btn ghost sm" data-new type="button" style="margin-top:10px">طلب تحليل</button></section>';
      bind("[data-new]", function () { requestForm("طلب تقرير"); });
    },
    projects: function (m) {
      m.innerHTML = head("مشروعي") + (M.projects.length ? M.projects.map(function (p) { var done = p.stages.filter(function (s) { return s.done; }).length, pct = p.stages.length ? Math.round(done / p.stages.length * 100) : 0;
        return '<section class="card"><div class="top" style="margin:0 0 10px"><h2>' + E(p.title) + "</h2>" + UI.pill(p.status === "done" ? "مكتمل" : "قيد التنفيذ") + '</div><div class="progress" style="margin-bottom:6px"><i style="width:' + pct + '%"></i></div><p class="small muted" style="margin-bottom:14px">أنجزنا ' + done + " من " + p.stages.length + " مراحل · البداية " + UI.date(p.start) + " · التسليم " + UI.date(p.due) + "</p>" + stagesHtml(p) + "</section>"; }).join("") : '<p class="empty">ما فيه مشاريع للحين. لما نبدأ مشروعك تظهر مراحله هنا.</p>');
    },
    requests: function (m) {
      var list = M.requests.slice().sort(function (a, b) { return b.updated - a.updated; }), lim = M.package.limits.requests;
      m.innerHTML = head("طلباتي", '<button class="btn" data-new type="button">طلب جديد</button>') + '<p class="small muted" style="margin-bottom:12px">طلبات هذا الشهر: ' + M.usage.requests + (lim == null ? "" : " من " + lim) + "</p>" +
        '<section class="card">' + table(["الرقم", "الطلب", "النوع", "آخر تحديث", "الحالة"], list.map(function (r) { return '<tr class="rowlink" data-req="' + r.id + '"><td class="num">#' + r.no + "</td><td>" + E(r.title) + (r.status === "بانتظار العميل" ? ' <span class="pill warn">ننتظر ردك</span>' : "") + "</td><td>" + E(r.type) + "</td><td>" + UI.ago(r.updated) + "</td><td>" + UI.pill(r.status) + "</td></tr>"; }), "ما رفعت طلبات. اضغط «طلب جديد» لأي تعديل أو استفسار.") + "</section>";
      bind("[data-new]", function () { requestForm(); });
      bind("[data-req]", function (el) { requestView(el.dataset.req); });
    },
    reports: function (m) {
      var list = M.reports.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
      m.innerHTML = head("تقاريري") + (list.length ? '<div class="grid2">' + list.map(function (r) { return '<section class="card" style="display:flex;flex-direction:column;gap:8px"><span class="pill">' + E(r.kind) + "</span><h2>" + E(r.title) + '</h2><p class="small muted">' + UI.date(r.date) + (r.period ? " · فترة " + E(r.period) : "") + "</p>" + (r.note ? "<p>" + E(r.note) + "</p>" : "") + (r.url ? '<a class="btn sm" style="align-self:flex-start" href="' + E(r.url) + '" target="_blank" rel="noopener noreferrer">فتح ' + E(r.kind) + "</a>" : '<p class="small muted">بدون رابط.</p>') + "</section>"; }).join("") + "</div>" : '<p class="empty">ما نُشرت تقارير للحين. تقاريرك ولوحاتك تظهر هنا أول ما تجهز.</p>');
    },
    invoices: function (m) {
      var list = M.invoices.slice().sort(function (a, b) { return b.no - a.no; });
      m.innerHTML = head("فواتيري") + '<section class="card">' + table(["الرقم", "البيان", "الإصدار", "الاستحقاق", "الإجمالي (ر.س)", "الحالة", ""], list.map(function (i) { var s = invState(i); return '<tr><td class="num">' + i.no + "</td><td>" + E(i.desc) + "</td><td>" + UI.date(i.issued) + "</td><td>" + UI.date(i.due) + '</td><td class="num"><b>' + UI.sar(i.total) + "</b></td><td>" + UI.pill(s) + '</td><td><button class="btn ghost sm" data-print="' + i.id + '" type="button">عرض وطباعة</button></td></tr>'; }), "ما فيه فواتير.") + "</section>" +
        '<p class="small muted">للسداد أو أي استفسار عن فاتورة: <a href="https://wa.me/' + WA + '" target="_blank" rel="noopener noreferrer">واتساب</a></p>';
      bind("[data-print]", function (el) { printInvoice(M.invoices.find(function (x) { return x.id === el.dataset.print; })); });
    },
    account: function (m, forced) {
      var c = M.client, p = M.package;
      m.innerHTML = head("حسابي") + (forced ? '<p class="demo-bar"><b>أول دخول:</b> غيّر كلمة المرور المؤقتة عشان تكمل.</p>' : "") +
        '<div class="grid2"><section class="card"><h2>تغيير كلمة المرور</h2><form id="pw" class="formgrid" novalidate>' + (forced ? "" : '<label class="full">الحالية<input type="password" name="o" autocomplete="current-password" required></label>') + '<label>الجديدة<input type="password" name="n" autocomplete="new-password" required></label><label>تأكيدها<input type="password" name="n2" autocomplete="new-password" required></label><p class="small muted full">8 أحرف على الأقل، وفيها حرف ورقم.</p><p class="err full" id="pwe"></p><div class="full"><button class="btn" type="submit">حفظ</button></div></form></section>' +
        '<section class="card"><h2>بيانات الاشتراك</h2><table><tbody><tr><th>الجهة</th><td>' + E(c.company) + "</td></tr><tr><th>الباقة</th><td>" + E(p.name) + "</td></tr><tr><th>من</th><td>" + UI.date(c.start) + "</td></tr><tr><th>إلى</th><td>" + UI.date(c.end) + '</td></tr><tr><th>اسم المستخدم</th><td class="num">' + E(S.username) + "</td></tr></tbody></table>" +
        (p.features && p.features.length ? '<h3 style="margin-top:14px">تشمل باقتك</h3><ul style="margin:6px 0 0;padding-inline-start:18px">' + p.features.map(function (f) { return "<li>" + E(f) + "</li>"; }).join("") + "</ul>" : "") +
        '<a class="btn ghost sm" style="margin-top:14px" target="_blank" rel="noopener noreferrer" href="https://wa.me/' + WA + "?text=" + encodeURIComponent("السلام عليكم، أبي أستفسر عن ترقية باقة " + c.company + ".") + '">طلب ترقية الباقة</a></section></div>';
      $("pw").onsubmit = async function (e) { e.preventDefault(); var f = new FormData(e.target); if (f.get("n") !== f.get("n2")) { $("pwe").textContent = "كلمتا المرور غير متطابقتين."; return; }
        try { await DA.changePassword(f.get("o"), f.get("n")); S = DA.session(); UI.toast("تغيرت كلمة المرور."); go(forced ? "home" : "account"); } catch (x) { $("pwe").textContent = x.message; } };
    }
  };

  function requestForm(type) {
    UI.dialog("طلب جديد", '<div class="formgrid"><label class="full">العنوان<input name="t" required maxlength="160" placeholder="مثال: إضافة مقارنة بالسنة الماضية"></label><label>النوع<select name="k">' + ["تعديل", "استفسار", "دعم فني", "طلب تقرير"].map(function (k) { return "<option" + (k === type ? " selected" : "") + ">" + k + "</option>"; }).join("") + '</select></label><label>الأولوية<select name="p"><option>منخفضة</option><option selected>متوسطة</option><option>عالية</option></select></label><label class="full">التفاصيل<textarea name="d" required maxlength="3000"></textarea></label></div>', "إرسال الطلب", async function (f) {
      var r = await DA.newRequest(f.get("t"), f.get("k"), f.get("p"), f.get("d")); UI.toast("وصل طلبك برقم #" + r.no + "."); go("requests");
    });
  }
  function requestView(id) {
    var r = M.requests.find(function (x) { return x.id === id; }); if (!r) return;
    UI.dialog("#" + r.no + " · " + r.title, '<p class="small muted">' + E(r.type) + " · " + UI.pill(r.status) + " · فُتح " + UI.ago(r.created) + '</p><div class="thread">' + r.messages.map(function (msg) { return '<div class="msg ' + (msg.from === "client" ? "me" : "them") + '">' + E(msg.text) + "<small>" + (msg.from === "client" ? "أنت" : "المحلل الرقمي") + " · " + UI.ago(msg.at) + "</small></div>"; }).join("") + "</div>" +
      (r.status === "مغلق" ? '<p class="small muted">الطلب مغلق. لو تحتاج شي ثاني ارفع طلب جديد.</p>' : '<label>ردك<textarea name="t" maxlength="3000"></textarea></label>'), r.status === "مغلق" ? "" : "إرسال", async function (f) {
        var t = String(f.get("t") || "").trim(); if (!t) throw new Error("اكتب ردك."); await DA.reply(r.id, t); UI.toast("انرسل ردك."); go("requests");
      });
  }
  function printInvoice(i) {
    var c = M.client, w = window.open("", "_blank"); if (!w) return UI.toast("اسمح بالنوافذ المنبثقة للطباعة.");
    w.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>فاتورة ' + i.no + '</title><style>body{font-family:Tahoma,sans-serif;max-width:720px;margin:30px auto;padding:0 20px;color:#11222B}header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0B7A75;padding-bottom:14px}h1{margin:0;font-size:22px}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border:1px solid #DCE3E4;padding:9px;text-align:right}th{background:#E1F1EF}.tot td{font-weight:bold}.note{font-size:12px;color:#55676F;margin-top:24px}</style></head><body><header><div><h1>المحلل الرقمي</h1><div style="color:#55676F">The Digital Analyst</div></div><div><b>فاتورة رقم ' + i.no + "</b><br>الإصدار: " + UI.date(i.issued) + "<br>الاستحقاق: " + UI.date(i.due) + "</div></header><p style=\"margin-top:18px\"><b>إلى:</b> " + E(c.company) + " · " + E(c.name) + "</p><table><tr><th>البيان</th><th>المبلغ (ر.س)</th></tr><tr><td>" + E(i.desc) + "</td><td>" + UI.sar(i.amount) + "</td></tr><tr><td>ضريبة القيمة المضافة</td><td>" + UI.sar(i.vat) + '</td></tr><tr class="tot"><td>الإجمالي</td><td>' + UI.sar(i.total) + "</td></tr></table><p>الحالة: <b>" + E(invState(i)) + '</b></p><p class="note">هذا كشف متابعة وليس فاتورة ضريبية إلكترونية.</p><script>print()<\/script></body></html>');
    w.document.close();
  }
  go("home");
})();

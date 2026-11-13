/* مركز التحكم: إدارة العملاء والباقات والمشاريع والطلبات والتقارير والفواتير */
(function () {
  var S = DA.need("owner"), E = UI.esc, D = null, view = "home", opt = {};
  var $ = function (i) { return document.getElementById(i); };
  $("who").textContent = S.name;
  $("out").onclick = function () { DA.logout(); location.href = "../login.html?as=owner"; };

  var STATUS_C = { active: "نشط", paused: "موقوف مؤقتًا", ended: "منتهي" };
  var REQ_ST = ["جديد", "قيد التنفيذ", "بانتظار العميل", "مغلق"];
  var NAV = [["home", "الرئيسية"], ["clients", "العملاء"], ["requests", "الطلبات"], ["projects", "المشاريع"], ["reports", "التقارير واللوحات"], ["invoices", "الفواتير"], ["packages", "الباقات"], ["rents", "أسعار الإيجار"], ["log", "سجل النشاط"], ["settings", "الإعدادات"]];

  function cname(id) { var c = D.clients.find(function (x) { return x.id === id; }); return c ? c.company : "—"; }
  function pkg(id) { return D.packages.find(function (p) { return p.id === id; }) || { name: "—", limits: {} }; }
  function invState(i) { return i.status === "مستحقة" && UI.daysTo(i.due) < 0 ? "متأخرة" : i.status; }
  function lim(v) { return v == null ? "بدون حد" : v; }
  function clientOptions(sel) { return D.clients.map(function (c) { return '<option value="' + c.id + '"' + (c.id === sel ? " selected" : "") + ">" + E(c.company) + " · " + E(c.name) + "</option>"; }).join(""); }
  function head(title, actions) { return '<div class="top"><div class="row"><button class="btn ghost sm menu-btn" type="button" data-menu>القائمة</button><h1>' + E(title) + '</h1></div><div class="acts">' + (actions || "") + "</div></div>" + (DA.MODE === "demo" ? '<p class="demo-bar"><b>وضع تجريبي:</b> البيانات محفوظة في هذا المتصفح فقط. لما نربط Hostinger تنتقل لقاعدة بيانات حقيقية بنفس الشاشات.</p>' : ""); }
  function table(heads, rows, empty) { return rows.length ? '<div class="scroll"><table><thead><tr>' + heads.map(function (h) { return "<th>" + E(h) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div>" : '<p class="empty">' + E(empty || "ما فيه بيانات.") + "</p>"; }

  async function go(v, o) {
    view = v; opt = o || {};
    try { D = await DA.all(); } catch (x) { $("main").innerHTML = '<p class="empty">' + E(x.message) + "</p>"; return; }
    var open = D.requests.filter(function (r) { return r.status !== "مغلق"; }).length;
    $("nav").innerHTML = NAV.map(function (n) { var c = n[0] === "requests" && open ? '<span class="cnt">' + open + "</span>" : ""; return '<button type="button" data-v="' + n[0] + '"' + (n[0] === v || (v === "client" && n[0] === "clients") ? ' aria-current="page"' : "") + "><span>" + n[1] + "</span>" + c + "</button>"; }).join("");
    $("side").classList.remove("open");
    await V[v]($("main"));
    $("main").querySelectorAll("[data-menu]").forEach(function (b) { b.onclick = function () { $("side").classList.toggle("open"); }; });
    $("main").focus({ preventScroll: true });
  }
  $("nav").onclick = function (e) { var b = e.target.closest("[data-v]"); if (b) go(b.dataset.v); };
  function bind(sel, fn) { $("main").querySelectorAll(sel).forEach(function (el) { el.onclick = function (e) { e.preventDefault(); fn(el, e); }; }); }

  var V = {
    home: function (m) {
      var act = D.clients.filter(function (c) { return c.status === "active"; });
      var expiring = act.filter(function (c) { var n = UI.daysTo(c.end); return n !== null && n <= 14; });
      var openR = D.requests.filter(function (r) { return r.status !== "مغلق"; }), newR = openR.filter(function (r) { return r.status === "جديد"; });
      var due = D.invoices.filter(function (i) { return i.status === "مستحقة"; }), late = due.filter(function (i) { return invState(i) === "متأخرة"; });
      var mrr = act.reduce(function (a, c) { var p = pkg(c.package_id); return a + (p.period === "monthly" && p.price ? Number(p.price) : 0); }, 0);
      var month = DA.month(), paidMonth = D.invoices.filter(function (i) { return i.status === "مدفوعة" && String(i.paid_at || "").slice(0, 7) === month; }).reduce(function (a, i) { return a + Number(i.total); }, 0);
      var lateP = D.projects.filter(function (p) { return p.status === "active" && p.due && UI.daysTo(p.due) < 0; });
      m.innerHTML = head("الرئيسية", '<button class="btn" data-new-client type="button">عميل جديد</button>') +
        '<div class="kpis">' +
        k(act.length, "عملاء نشطين") + k(newR.length, "طلبات جديدة", newR.length) + k(openR.length, "طلبات مفتوحة") +
        k(UI.sar(due.reduce(function (a, i) { return a + Number(i.total); }, 0)), "مستحقات غير مدفوعة (ر.س)", late.length) +
        k(UI.sar(paidMonth), "محصّل هذا الشهر (ر.س)") + k(mrr ? UI.sar(mrr) : "—", "إيراد شهري متكرر (ر.س)") + "</div>" +
        '<div class="grid2"><section class="card"><h2>يحتاج انتباهك</h2>' + attention(newR, late, expiring, lateP) + "</section>" +
        '<section class="card"><h2>آخر الطلبات</h2>' + table(["الرقم", "العميل", "الطلب", "الحالة"], D.requests.slice().sort(function (a, b) { return b.updated - a.updated; }).slice(0, 6).map(function (r) { return '<tr class="rowlink" data-req="' + r.id + '"><td class="num">#' + r.no + "</td><td>" + E(cname(r.client_id)) + "</td><td>" + E(r.title) + "</td><td>" + UI.pill(r.status) + "</td></tr>"; }), "ما وصلت طلبات.") + "</section></div>" +
        '<section class="card"><h2>العملاء حسب الباقة</h2><div class="grid3">' + D.packages.map(function (p) { var n = act.filter(function (c) { return c.package_id === p.id; }).length; return '<div class="kpi"><span class="v">' + n + '</span><span class="l">' + E(p.name) + "</span></div>"; }).join("") + "</div></section>";
      bind("[data-new-client]", function () { clientForm(); });
      bind("[data-req]", function (el) { requestView(el.dataset.req); });
      bind("[data-client]", function (el) { go("client", { id: el.dataset.client }); });
      bind("[data-inv]", function () { go("invoices", { st: "مستحقة" }); });
      function k(v, l, alert) { return '<div class="kpi' + (alert ? " alert" : "") + '"><span class="v">' + v + '</span><span class="l">' + E(l) + "</span></div>"; }
    },
    clients: function (m) {
      var q = (opt.q || "").trim(), st = opt.st || "";
      var list = D.clients.filter(function (c) { return (!st || c.status === st) && (!q || (c.name + c.company + c.phone + c.city).indexOf(q) >= 0); });
      m.innerHTML = head("العملاء", '<button class="btn" data-new-client type="button">عميل جديد</button>') +
        '<section class="card"><form class="row" id="cf" style="margin-bottom:12px"><input name="q" value="' + E(q) + '" placeholder="ابحث بالاسم أو الجهة أو الجوال" style="flex:1;min-width:200px" aria-label="بحث"><select name="st" style="width:auto" aria-label="الحالة"><option value="">كل الحالات</option>' + Object.keys(STATUS_C).map(function (s) { return '<option value="' + s + '"' + (s === st ? " selected" : "") + ">" + STATUS_C[s] + "</option>"; }).join("") + '</select><button class="btn ghost" type="submit">بحث</button></form>' +
        table(["الجهة", "العميل", "الباقة", "ينتهي", "الدخول", "الحالة"], list.map(function (c) {
          var u = D.users.find(function (x) { return x.client_id === c.id; }), n = UI.daysTo(c.end);
          return '<tr class="rowlink" data-client="' + c.id + '"><td><b>' + E(c.company) + "</b><br><span class=\"small muted\">" + E(c.city || "") + "</span></td><td>" + E(c.name) + "</td><td>" + E(pkg(c.package_id).name) + "</td><td>" + UI.date(c.end) + (n !== null && n <= 14 && c.status === "active" ? ' <span class="pill ' + (n < 0 ? "bad" : "warn") + '">' + (n < 0 ? "انتهى" : "بعد " + n + " يوم") + "</span>" : "") + "</td><td>" + (u ? '<span class="num">' + E(u.username) + "</span>" + (u.active ? "" : ' <span class="pill bad">موقوف</span>') : '<span class="muted small">ما له دخول</span>') + "</td><td>" + UI.pill(STATUS_C[c.status]) + "</td></tr>";
        }), "ما فيه عملاء بهالبحث.") + "</section>";
      $("cf").onsubmit = function (e) { e.preventDefault(); var f = new FormData(e.target); go("clients", { q: f.get("q"), st: f.get("st") }); };
      bind("[data-new-client]", function () { clientForm(); });
      bind("[data-client]", function (el) { go("client", { id: el.dataset.client }); });
    },
    client: function (m) {
      var c = D.clients.find(function (x) { return x.id === opt.id; }); if (!c) return go("clients");
      var p = pkg(c.package_id), u = D.users.find(function (x) { return x.client_id === c.id; }), use = DA.usageOf(D, c.id);
      var reqs = D.requests.filter(function (r) { return r.client_id === c.id; }), invs = D.invoices.filter(function (i) { return i.client_id === c.id; });
      var projs = D.projects.filter(function (x) { return x.client_id === c.id; }), reps = D.reports.filter(function (x) { return x.client_id === c.id; });
      m.innerHTML = head(c.company, '<button class="btn ghost" data-back type="button">كل العملاء</button><button class="btn ghost" data-edit type="button">تعديل البيانات</button>') +
        '<div class="grid2"><section class="card"><h2>البيانات والاشتراك</h2><table><tbody>' +
        row("العميل", E(c.name)) + row("الجوال", '<span class="num">' + E(c.phone || "—") + "</span>" + (c.phone ? ' <a href="https://wa.me/966' + E(String(c.phone).replace(/\D/g, "").replace(/^0/, "")) + '" target="_blank" rel="noopener noreferrer">واتساب</a>' : "")) + row("الإيميل", E(c.email || "—")) + row("المدينة", E(c.city || "—")) +
        row("الباقة", E(p.name)) + row("من", UI.date(c.start)) + row("إلى", UI.date(c.end)) + row("الحالة", UI.pill(STATUS_C[c.status])) + row("ملاحظات", E(c.notes || "—")) + "</tbody></table></section>" +
        '<section class="card"><h2>حساب الدخول لبوابة العملاء</h2>' + (u ? '<p>اسم المستخدم: <b class="num">' + E(u.username) + "</b></p><p class=\"small muted\">آخر دخول: " + (u.last_login ? UI.date(u.last_login) + " (" + UI.ago(u.last_login) + ")" : "ما دخل للحين") + "</p>" + (u.must_change ? '<p class="small"><span class="pill warn">لازم يغير كلمة المرور أول دخول</span></p>' : "") : '<p class="muted">ما له حساب دخول. أصدر له اسم مستخدم وكلمة مرور مؤقتة.</p>') +
        '<div class="row" style="margin-top:12px"><button class="btn" data-login type="button">' + (u ? "كلمة مرور جديدة" : "إصدار بيانات الدخول") + "</button>" + (u ? '<button class="btn ghost" data-toggle type="button">' + (u.active ? "إيقاف الدخول" : "تفعيل الدخول") + "</button>" : "") + "</div>" +
        '<h3 style="margin-top:18px">استخدام هذا الشهر</h3><div class="grid2" style="margin-top:8px">' + meter("رصيد التحليل", use.credits, p.limits.credits) + meter("طلبات الصيانة", use.maint, p.limits.maint) + meter("طلبات الخدمة", use.requests, p.limits.requests) + "</div></section></div>" +
        '<section class="card"><div class="top" style="margin:0 0 10px"><h2>المشاريع</h2><button class="btn sm" data-new-proj type="button">مشروع جديد</button></div>' + table(["المشروع", "الإنجاز", "التسليم", ""], projs.map(projRow), "ما فيه مشاريع.") + "</section>" +
        '<div class="grid2"><section class="card"><div class="top" style="margin:0 0 10px"><h2>الطلبات</h2></div>' + table(["الرقم", "الطلب", "الحالة"], reqs.map(function (r) { return '<tr class="rowlink" data-req="' + r.id + '"><td class="num">#' + r.no + "</td><td>" + E(r.title) + "</td><td>" + UI.pill(r.status) + "</td></tr>"; }), "ما رفع طلبات.") + "</section>" +
        '<section class="card"><div class="top" style="margin:0 0 10px"><h2>الفواتير</h2><button class="btn sm" data-new-inv type="button">فاتورة جديدة</button></div>' + table(["الرقم", "البيان", "الإجمالي", "الحالة"], invs.map(function (i) { return '<tr class="rowlink" data-inv="' + i.id + '"><td class="num">' + i.no + "</td><td>" + E(i.desc) + '</td><td class="num">' + UI.sar(i.total) + "</td><td>" + UI.pill(invState(i)) + "</td></tr>"; }), "ما فيه فواتير.") + "</section></div>" +
        '<section class="card"><div class="top" style="margin:0 0 10px"><h2>التقارير واللوحات</h2><button class="btn sm" data-new-rep type="button">نشر تقرير</button></div>' + table(["العنوان", "النوع", "التاريخ", ""], reps.map(repRow), "ما نُشرت له تقارير.") + "</section>" +
        '<section class="card"><h2>منطقة الخطر</h2><p class="small muted">حذف العميل يحذف حسابه ومشاريعه وطلباته وتقاريره وفواتيره.</p><button class="btn danger sm" data-del type="button" style="margin-top:8px">حذف العميل</button></section>';
      bind("[data-back]", function () { go("clients"); });
      bind("[data-edit]", function () { clientForm(c); });
      bind("[data-login]", function () { loginForm(c, u); });
      bind("[data-toggle]", async function () { await DA.setUserActive(c.id, !u.active); UI.toast(u.active ? "أُوقف الدخول." : "تفعّل الدخول."); go("client", { id: c.id }); });
      bind("[data-new-proj]", function () { projectForm(null, c.id); });
      bind("[data-proj]", function (el) { projectForm(D.projects.find(function (x) { return x.id === el.dataset.proj; })); });
      bind("[data-req]", function (el) { requestView(el.dataset.req); });
      bind("[data-new-inv]", function () { invoiceForm(null, c.id); });
      bind("[data-inv]", function (el) { invoiceForm(D.invoices.find(function (x) { return x.id === el.dataset.inv; })); });
      bind("[data-new-rep]", function () { reportForm(null, c.id); });
      bind("[data-rep]", function (el) { reportForm(D.reports.find(function (x) { return x.id === el.dataset.rep; })); });
      bind("[data-del]", async function (el) { if (!UI.confirm2(el, "اضغط مرة ثانية لحذف " + c.company)) return; await DA.remove("clients", c.id); UI.toast("حُذف العميل."); go("clients"); });
      function row(a, b) { return '<tr><th style="width:110px">' + a + "</th><td>" + b + "</td></tr>"; }
    },
    requests: function (m) {
      var st = opt.st == null ? "open" : opt.st;
      var list = D.requests.filter(function (r) { return st === "open" ? r.status !== "مغلق" : !st || r.status === st; }).sort(function (a, b) { return b.updated - a.updated; });
      m.innerHTML = head("الطلبات") + '<section class="card"><div class="row" style="margin-bottom:12px">' + [["open", "المفتوحة"], ["", "الكل"]].concat(REQ_ST.map(function (s) { return [s, s]; })).map(function (s) { return '<button class="btn ' + (s[0] === st ? "" : "ghost") + ' sm" data-st="' + s[0] + '" type="button">' + s[1] + "</button>"; }).join("") + "</div>" +
        table(["الرقم", "العميل", "الطلب", "النوع", "الأولوية", "آخر تحديث", "الحالة"], list.map(function (r) { var last = r.messages[r.messages.length - 1]; return '<tr class="rowlink" data-req="' + r.id + '"><td class="num">#' + r.no + "</td><td>" + E(cname(r.client_id)) + "</td><td>" + E(r.title) + (last && last.from === "client" && r.status !== "مغلق" ? ' <span class="pill warn">ينتظر ردك</span>' : "") + "</td><td>" + E(r.type) + "</td><td>" + UI.pill(r.priority) + "</td><td>" + UI.ago(r.updated) + "</td><td>" + UI.pill(r.status) + "</td></tr>"; }), "ما فيه طلبات.") + "</section>";
      bind("[data-st]", function (el) { go("requests", { st: el.dataset.st }); });
      bind("[data-req]", function (el) { requestView(el.dataset.req); });
    },
    projects: function (m) {
      m.innerHTML = head("المشاريع", '<button class="btn" data-new-proj type="button">مشروع جديد</button>') + '<section class="card">' + table(["المشروع", "العميل", "الإنجاز", "التسليم", ""], D.projects.map(function (p) { return projRow(p, true); }), "ما فيه مشاريع.") + "</section>";
      bind("[data-new-proj]", function () { projectForm(); });
      bind("[data-proj]", function (el) { projectForm(D.projects.find(function (x) { return x.id === el.dataset.proj; })); });
    },
    reports: function (m) {
      m.innerHTML = head("التقارير واللوحات", '<button class="btn" data-new-rep type="button">نشر تقرير</button>') + '<section class="card"><p class="small muted" style="margin-bottom:10px">التقرير ينشر في بوابة العميل مباشرة. ضع رابط اللوحة (Power BI أو Looker Studio أو صفحة) أو رابط الملف من Google Drive أو OneDrive.</p>' + table(["العنوان", "العميل", "النوع", "التاريخ", ""], D.reports.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).map(function (r) { return repRow(r, true); }), "ما نُشرت تقارير.") + "</section>";
      bind("[data-new-rep]", function () { reportForm(); });
      bind("[data-rep]", function (el) { reportForm(D.reports.find(function (x) { return x.id === el.dataset.rep; })); });
    },
    invoices: function (m) {
      var st = opt.st || "";
      var list = D.invoices.filter(function (i) { return !st || i.status === st; }).sort(function (a, b) { return b.no - a.no; });
      var sum = function (s) { return D.invoices.filter(function (i) { return i.status === s; }).reduce(function (a, i) { return a + Number(i.total); }, 0); };
      m.innerHTML = head("الفواتير", '<button class="btn" data-new-inv type="button">فاتورة جديدة</button>') +
        '<div class="kpis"><div class="kpi alert"><span class="v">' + UI.sar(sum("مستحقة")) + '</span><span class="l">مستحقة (ر.س)</span></div><div class="kpi"><span class="v">' + UI.sar(sum("مدفوعة")) + '</span><span class="l">مدفوعة (ر.س)</span></div></div>' +
        '<section class="card"><div class="row" style="margin-bottom:12px">' + [["", "الكل"], ["مستحقة", "المستحقة"], ["مدفوعة", "المدفوعة"], ["ملغاة", "الملغاة"]].map(function (s) { return '<button class="btn ' + (s[0] === st ? "" : "ghost") + ' sm" data-st="' + s[0] + '" type="button">' + s[1] + "</button>"; }).join("") + "</div>" +
        table(["الرقم", "العميل", "البيان", "المبلغ", "الضريبة", "الإجمالي", "الاستحقاق", "الحالة", ""], list.map(function (i) { var s = invState(i); return "<tr><td class=\"num\">" + i.no + "</td><td>" + E(cname(i.client_id)) + "</td><td>" + E(i.desc) + '</td><td class="num">' + UI.sar(i.amount) + '</td><td class="num">' + UI.sar(i.vat) + '</td><td class="num"><b>' + UI.sar(i.total) + "</b></td><td>" + UI.date(i.due) + "</td><td>" + UI.pill(s) + '</td><td class="row" style="flex-wrap:nowrap">' + (i.status === "مستحقة" ? '<button class="btn sm" data-paid="' + i.id + '" type="button">تسجيل الدفع</button>' : "") + '<button class="btn ghost sm" data-inv="' + i.id + '" type="button">تعديل</button></td></tr>'; }), "ما فيه فواتير.") +
        '<p class="small muted" style="margin-top:10px">الفاتورة هنا للمتابعة. الفاتورة الضريبية الرسمية تصدر من نظام فوترة معتمد من هيئة الزكاة والضريبة والجمارك إذا كنت مسجل في الضريبة.</p></section>';
      bind("[data-st]", function (el) { go("invoices", { st: el.dataset.st }); });
      bind("[data-new-inv]", function () { invoiceForm(); });
      bind("[data-inv]", function (el) { invoiceForm(D.invoices.find(function (x) { return x.id === el.dataset.inv; })); });
      bind("[data-paid]", async function (el) { var i = D.invoices.find(function (x) { return x.id === el.dataset.paid; }); i.status = "مدفوعة"; i.paid_at = DA.day(0); await DA.save("invoices", i); UI.toast("سُجّل الدفع."); go("invoices", opt); });
    },
    packages: function (m) {
      m.innerHTML = head("الباقات") + '<p class="small muted" style="margin-bottom:12px">الحدود شهرية لكل عميل. اترك الحد فاضي = بدون حد. السعر فاضي يعني «حسب عرض السعر». رصيد التحليل مشترك بين أدوات التحليل، وكل استخدام يخصم حسب نوعه: ' + costLine() + '. تعدّلها من <a href="#" data-goset>الإعدادات</a>.</p><div class="grid2">' + D.packages.map(function (p) {
        var n = D.clients.filter(function (c) { return c.package_id === p.id && c.status === "active"; }).length;
        return '<section class="card"><div class="top" style="margin:0 0 8px"><h2>' + E(p.name) + '</h2><button class="btn ghost sm" data-pkg="' + p.id + '" type="button">تعديل</button></div><p class="kpi" style="border:0;padding:0"><span class="v" style="text-align:right">' + (p.price ? UI.sar(p.price) + ' <span class="small muted">ر.س ' + (p.period === "monthly" ? "شهريًا" : "مرة وحدة") + "</span>" : '<span class="small muted">حسب عرض السعر</span>') + "</span></p>" +
          '<table style="margin-top:8px"><tbody><tr><th>رصيد التحليل</th><td>' + lim(p.limits.credits) + creditHint(p.limits.credits) + "</td></tr><tr><th>طلبات الصيانة</th><td>" + lim(p.limits.maint) + "</td></tr><tr><th>طلبات الخدمة</th><td>" + lim(p.limits.requests) + '</td></tr></tbody></table><p class="small muted" style="margin-top:8px">' + n + " عميل نشط</p></section>";
      }).join("") + "</div>";
      bind("[data-goset]", function () { go("settings"); });
      bind("[data-pkg]", function (el) { packageForm(D.packages.find(function (x) { return x.id === el.dataset.pkg; })); });
    },
    rents: async function (m) {
      m.innerHTML = head("أسعار الإيجار") + '<p class="empty">جاري التحميل…</p>';
      var all = await DA.rents(), meta = await DA.rentsMeta();
      var T = DA.RENT_TYPES, city = opt.city || "", type = opt.type || "", q = opt.q || "";
      var cities = Array.from(new Set(all.map(function (r) { return r.city; }))).sort();
      var list = all.filter(function (r) { return (!city || r.city === city) && (!type || r.type === type) && (!q || (r.district + r.city).indexOf(q) >= 0); })
        .sort(function (a, b) { return a.city.localeCompare(b.city, "ar") || a.district.localeCompare(b.district, "ar") || a.type.localeCompare(b.type); });
      var cnt = function (c) { return all.filter(function (r) { return r.confidence === c; }).length; };
      function badge(r) { return r.auto ? UI.pill(r.confidence === "estimate" ? "تقديري" : DA.CONF[r.confidence] || "آلي") : '<span class="pill ok">تعديلك</span>'; }
      m.innerHTML = head("أسعار الإيجار", '<button class="btn ghost" data-rx type="button">تصدير CSV</button><button class="btn" data-rnew type="button">سعر جديد</button>') +
        '<section class="card" style="margin-bottom:12px"><h2>التحديث الآلي</h2><p class="small">' + E(meta.method || "") + '</p><p class="small muted" style="margin-top:6px">آخر تحديث: <b class="num">' + E(meta.updated || "—") + "</b> · رسمي " + cnt("official") + " · تقارير " + cnt("report") + " · تقديري " + cnt("estimate") + " · تعديلاتك " + all.filter(function (r) { return !r.auto; }).length + "</p>" +
        (meta.log.length ? '<details style="margin-top:8px"><summary class="small">سجل التحديثات</summary><ul class="small" style="margin:6px 0 0;padding-inline-start:18px">' + meta.log.slice(-8).reverse().map(function (l) { return "<li><span class=\"num\">" + E(l.at) + "</span> " + E(l.note) + "</li>"; }).join("") + "</ul></details>" : "") +
        '<p class="small muted" style="margin-top:6px">تعديلك لأي سعر يتقدم على التحديث الآلي لنفس الحي والنوع. احذف تعديلك يرجع السعر الآلي.</p></section>' +
        '<div style="margin-bottom:12px;display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px"><select id="rf-city" aria-label="المدينة"><option value="">كل المدن</option>' + cities.map(function (c) { return "<option" + (c === city ? " selected" : "") + ">" + E(c) + "</option>"; }).join("") + '</select><select id="rf-type" aria-label="النوع"><option value="">كل الأنواع</option>' + Object.keys(T).map(function (k) { return '<option value="' + k + '"' + (k === type ? " selected" : "") + ">" + E(T[k][0]) + "</option>"; }).join("") + '</select><input id="rf-q" placeholder="ابحث باسم الحي" value="' + E(q) + '"></div>' +
        '<section class="card">' + table(["المدينة", "الحي", "النوع", "الأدنى", "المتوسط", "الأعلى", "الوحدة", "المصدر", ""], list.map(function (r) {
          return '<tr class="rowlink" data-rent="' + E(r.id) + '"><td>' + E(r.city) + "</td><td>" + E(r.district) + "</td><td>" + E((T[r.type] || ["—"])[0]) + '</td><td class="num">' + UI.sar(r.min) + '</td><td class="num"><b>' + UI.sar(r.avg) + '</b></td><td class="num">' + UI.sar(r.max) + '</td><td class="small">' + ((T[r.type] || [])[1] === "unit" ? "ر.س/سنة للوحدة" : "ر.س/م²/سنة") + '</td><td class="small">' + badge(r) + " " + (r.url ? '<a href="' + E(r.url) + '" target="_blank" rel="noopener noreferrer">' + E(r.source) + "</a>" : E(r.source || "—")) + ' <span class="muted num">' + E(r.date || "") + "</span></td><td>" + (r.auto ? "" : '<button class="btn ghost sm" data-rdel="' + E(r.id) + '" type="button">حذف</button>') + "</td></tr>"; }), "ما فيه أسعار بهذا الفلتر.") + "</section>";
      function refilter() { go("rents", { city: $("rf-city").value, type: $("rf-type").value, q: $("rf-q").value.trim() }); }
      $("rf-city").onchange = refilter; $("rf-type").onchange = refilter; $("rf-q").onchange = refilter;
      bind("[data-rnew]", function () { rentForm({ city: city, type: type || "shop" }); });
      m.querySelectorAll("[data-rent]").forEach(function (tr) { tr.onclick = function (e) { if (e.target.closest("[data-rdel],a")) return; var r = all.find(function (x) { return x.id === tr.dataset.rent; });
        rentForm(r.auto ? { city: r.city, district: r.district, type: r.type, min: r.min, avg: r.avg, max: r.max, date: r.date, fromAuto: true } : r); }; });
      bind("[data-rdel]", async function (el) { if (!UI.confirm2(el, "تأكيد")) return; await DA.remove("rents", el.dataset.rdel); UI.toast("انحذف."); go("rents", opt); });
      bind("[data-rx]", function () { var rows = [["المدينة", "الحي", "النوع", "الأدنى", "المتوسط", "الأعلى", "المصدر", "الفترة", "الدرجة"]].concat(list.map(function (r) { return [r.city, r.district, (T[r.type] || [r.type])[0], r.min, r.avg, r.max, r.source, r.date, r.auto ? DA.CONF[r.confidence] || "" : "تعديل المالك"]; }));
        var csv = "\ufeff" + rows.map(function (r) { return r.map(function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); }).join("\n");
        var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "rents-" + DA.day(0) + ".csv"; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); });
    },
    log: function (m) {
      m.innerHTML = head("سجل النشاط") + '<section class="card">' + table(["الوقت", "من", "العملية"], D.log.slice().reverse().slice(0, 200).map(function (l) { return "<tr><td class=\"num small\">" + new Date(l.at).toLocaleString("en-GB") + "</td><td>" + E(l.who) + "</td><td>" + E(l.action) + "</td></tr>"; }), "ما فيه نشاط.") + "</section>";
    },
    settings: function (m) {
      m.innerHTML = head("الإعدادات") + '<div class="grid2"><section class="card"><h2>كلمة المرور</h2><form id="pw" class="formgrid" novalidate><label class="full">الحالية<input type="password" name="o" autocomplete="current-password" required></label><label>الجديدة<input type="password" name="n" autocomplete="new-password" required></label><label>تأكيدها<input type="password" name="n2" autocomplete="new-password" required></label><p class="err full" id="pwe"></p><div class="full"><button class="btn" type="submit">تغيير كلمة المرور</button></div></form></section>' +
        '<section class="card"><h2>أسعار الرصيد</h2><p class="small muted">كم يخصم كل نوع استخدام من رصيد التحليل في الباقة. الإدخال اليدوي أقل جهد فيخصم أقل.</p><form id="costs" class="formgrid" novalidate style="margin-top:10px">' +
          Object.keys(DA.COST_N).map(function (k) { return "<label>" + E(DA.COST_N[k]) + (k === "ai" ? ' <span class="small muted">(قريبًا، يحتاج خادم Hostinger)</span>' : "") + '<input type="number" min="0" step="0.5" name="' + k + '" value="' + E(DA.costs()[k]) + '"></label>'; }).join("") +
          '<div class="full"><button class="btn" type="submit">حفظ الأسعار</button></div></form></section>' +
        '<section class="card"><h2>البيانات</h2><p class="small muted">نسخة احتياطية من كل البيانات بصيغة JSON، تنفع وقت النقل لخادم Hostinger.</p><div class="row" style="margin-top:12px"><button class="btn ghost" data-backup type="button">تنزيل نسخة احتياطية</button>' + (DA.MODE === "demo" ? '<button class="btn danger" data-reset type="button">رجّع البيانات التجريبية</button>' : "") + "</div></section></div>";
      $("pw").onsubmit = async function (e) { e.preventDefault(); var f = new FormData(e.target); if (f.get("n") !== f.get("n2")) { $("pwe").textContent = "كلمتا المرور غير متطابقتين."; return; } try { await DA.changePassword(f.get("o"), f.get("n")); e.target.reset(); $("pwe").textContent = ""; UI.toast("تغيرت كلمة المرور."); } catch (x) { $("pwe").textContent = x.message; } };
      $("costs").onsubmit = async function (e) { e.preventDefault(); var f = new FormData(e.target), o = {}; Object.keys(DA.COST_N).forEach(function (k) { o[k] = f.get(k); }); await DA.setCosts(o); UI.toast("حُفظت أسعار الرصيد."); go("settings"); };
      bind("[data-backup]", function () { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([DA.backup()], { type: "application/json" })); a.download = "digital-analyst-backup-" + DA.day(0) + ".json"; a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); });
      bind("[data-reset]", async function (el) { if (!UI.confirm2(el, "يمسح كل العملاء ويرجع التجريبي، اضغط للتأكيد")) return; await DA.resetDemo(); UI.toast("رجعت البيانات التجريبية."); go("home"); });
    }
  };

  function attention(newR, late, expiring, lateP) {
    var items = [];
    newR.forEach(function (r) { items.push('<li><a href="#" data-req="' + r.id + '">طلب جديد #' + r.no + " من " + E(cname(r.client_id)) + ": " + E(r.title) + "</a></li>"); });
    late.forEach(function (i) { items.push('<li><a href="#" data-inv="' + i.id + '">فاتورة ' + i.no + " على " + E(cname(i.client_id)) + " متأخرة " + Math.abs(UI.daysTo(i.due)) + " يوم (" + UI.sar(i.total) + " ر.س)</a></li>"); });
    expiring.forEach(function (c) { var n = UI.daysTo(c.end); items.push('<li><a href="#" data-client="' + c.id + '">اشتراك ' + E(c.company) + (n < 0 ? " انتهى قبل " + Math.abs(n) + " يوم" : " ينتهي بعد " + n + " يوم") + "</a></li>"); });
    lateP.forEach(function (p) { items.push('<li><a href="#" data-client="' + p.client_id + '">مشروع «' + E(p.title) + "» تعدى موعد التسليم</a></li>"); });
    return items.length ? '<ul style="margin:0;padding-inline-start:18px;display:flex;flex-direction:column;gap:6px">' + items.join("") + "</ul>" : '<p class="empty">كل شي تحت السيطرة.</p>';
  }
  function costLine() { var c = DA.costs(); return Object.keys(DA.COST_N).map(function (k) { return E(DA.COST_N[k]) + " " + c[k]; }).join("، "); }
  function creditHint(v) { if (v == null) return ""; var c = DA.costs(); return ' <span class="small muted">(' + Math.floor(v / c.file) + " ملف أو " + Math.floor(v / c.manual) + " يدوي)</span>"; }
  function meter(label, used, max) { var inf = max == null, pct = inf ? 0 : Math.min(100, used / Math.max(1, max) * 100); return '<div class="meter"><div class="row" style="justify-content:space-between"><span class="small">' + E(label) + '</span><span class="small num">' + used + (inf ? " / بدون حد" : " / " + max) + '</span></div><div class="bar"><i class="' + (pct >= 80 ? "hot" : "") + '" style="width:' + (inf ? 100 : pct) + '%;opacity:' + (inf ? ".35" : "1") + '"></i></div></div>'; }
  function projRow(p, withClient) { var done = p.stages.filter(function (s) { return s.done; }).length, pct = p.stages.length ? Math.round(done / p.stages.length * 100) : 0, n = UI.daysTo(p.due);
    return "<tr><td><b>" + E(p.title) + "</b>" + (p.status === "done" ? ' <span class="pill ok">مكتمل</span>' : "") + "</td>" + (withClient ? "<td>" + E(cname(p.client_id)) + "</td>" : "") + '<td style="min-width:140px"><div class="progress"><i style="width:' + pct + '%"></i></div><span class="small num">' + done + "/" + p.stages.length + "</span></td><td>" + UI.date(p.due) + (p.status !== "done" && n !== null && n < 0 ? ' <span class="pill bad">متأخر</span>' : "") + '</td><td><button class="btn ghost sm" data-proj="' + p.id + '" type="button">فتح</button></td></tr>'; }
  function repRow(r, withClient) { return "<tr><td><b>" + E(r.title) + "</b>" + (r.note ? '<br><span class="small muted">' + E(r.note) + "</span>" : "") + "</td>" + (withClient ? "<td>" + E(cname(r.client_id)) + "</td>" : "") + "<td>" + E(r.kind) + "</td><td>" + UI.date(r.date) + '</td><td><button class="btn ghost sm" data-rep="' + r.id + '" type="button">تعديل</button></td></tr>'; }

  /* ---------- النماذج ---------- */
  function clientForm(c) {
    c = c || { status: "active", package_id: "growth", start: DA.day(0), end: DA.day(30) };
    UI.dialog(c.id ? "تعديل العميل" : "عميل جديد", '<div class="formgrid">' +
      '<label>اسم العميل<input name="name" value="' + E(c.name || "") + '" required maxlength="80"></label><label>الجهة أو النشاط<input name="company" value="' + E(c.company || "") + '" required maxlength="100"></label>' +
      '<label>الجوال<input name="phone" value="' + E(c.phone || "") + '" dir="ltr" style="text-align:right" maxlength="20"></label><label>الإيميل<input name="email" type="email" value="' + E(c.email || "") + '" dir="ltr" style="text-align:right" maxlength="120"></label>' +
      '<label>المدينة<input name="city" value="' + E(c.city || "") + '" maxlength="40"></label><label>الباقة<select name="package_id">' + D.packages.map(function (p) { return '<option value="' + p.id + '"' + (p.id === c.package_id ? " selected" : "") + ">" + E(p.name) + "</option>"; }).join("") + "</select></label>" +
      '<label>بداية الاشتراك<input type="date" name="start" value="' + E(c.start || "") + '"></label><label>نهايته<input type="date" name="end" value="' + E(c.end || "") + '"></label>' +
      '<label>الحالة<select name="status">' + Object.keys(STATUS_C).map(function (s) { return '<option value="' + s + '"' + (s === c.status ? " selected" : "") + ">" + STATUS_C[s] + "</option>"; }).join("") + "</select></label>" +
      '<label class="full">ملاحظات داخلية<textarea name="notes" maxlength="1000">' + E(c.notes || "") + "</textarea></label></div>", "حفظ", async function (f) {
        if (!f.get("name").trim() || !f.get("company").trim()) throw new Error("اكتب اسم العميل والجهة.");
        var o = Object.assign({}, c); ["name", "company", "phone", "email", "city", "package_id", "start", "end", "status", "notes"].forEach(function (k) { o[k] = String(f.get(k) || "").trim(); });
        var saved = await DA.save("clients", o); UI.toast("حُفظ العميل."); go("client", { id: saved.id });
      });
  }
  function loginForm(c, u) {
    var sug = u ? u.username : (c.company || "").toLowerCase().replace(/[^a-z0-9]/g, "") || "client" + Math.floor(Math.random() * 900 + 100);
    UI.dialog(u ? "كلمة مرور جديدة لـ " + c.company : "بيانات دخول " + c.company, '<label>اسم المستخدم (إنجليزي صغير وأرقام)<input name="u" value="' + E(sug) + '" dir="ltr" style="text-align:right" required></label><p class="small muted">نولّد كلمة مرور مؤقتة تطلع لك مرة وحدة، والعميل يغيرها أول ما يدخل.</p><div id="cred"></div>', "إصدار", async function (f, form) {
      var r = await DA.issueLogin(c.id, f.get("u")), link = location.href.replace(/admin\/.*$/, "login.html");
      var msg = "مرحبًا " + c.name + "،\nحسابك في بوابة عملاء المحلل الرقمي جاهز:\nالرابط: " + link + "\nاسم المستخدم: " + r.username + "\nكلمة المرور المؤقتة: " + r.password + "\nبتطلب منك البوابة تغييرها أول دخول.";
      form.querySelector("#cred").innerHTML = '<p class="ok">جاهز. انسخها الحين، ما تقدر تشوفها مرة ثانية.</p><pre class="secret">' + E(msg) + '</pre><div class="row"><button class="btn sm" type="button" id="cp">نسخ الرسالة</button>' + (c.phone ? '<a class="btn ghost sm" target="_blank" rel="noopener noreferrer" href="https://wa.me/966' + E(String(c.phone).replace(/\D/g, "").replace(/^0/, "")) + "?text=" + encodeURIComponent(msg) + '">إرسال واتساب</a>' : "") + "</div>";
      form.querySelector("[type=submit]").hidden = true; form.querySelector("input[name=u]").disabled = true;
      form.querySelector("#cp").onclick = function () { navigator.clipboard.writeText(msg).then(function () { UI.toast("انتسخت."); }); };
      form.querySelectorAll("[data-x]").forEach(function (b) { b.addEventListener("click", function () { go("client", { id: c.id }); }); });
      return true;
    });
  }
  function projectForm(p, clientId) {
    var isNew = !p; p = p ? JSON.parse(JSON.stringify(p)) : { client_id: clientId || (D.clients[0] || {}).id, status: "active", start: DA.day(0), due: DA.day(30), stages: [{ name: "فهم الاحتياج", done: false }, { name: "المخطط والنموذج", done: false }, { name: "البناء والتحليل", done: false }, { name: "التسليم والمتابعة", done: false }] };
    if (!D.clients.length) return UI.toast("أضف عميل أول.");
    UI.dialog(isNew ? "مشروع جديد" : p.title, '<div class="formgrid"><label class="full">عنوان المشروع<input name="title" value="' + E(p.title || "") + '" required maxlength="120"></label><label>العميل<select name="client_id">' + clientOptions(p.client_id) + '</select></label><label>الحالة<select name="status"><option value="active"' + (p.status === "active" ? " selected" : "") + '>جاري</option><option value="done"' + (p.status === "done" ? " selected" : "") + '>مكتمل</option></select></label><label>البداية<input type="date" name="start" value="' + E(p.start || "") + '"></label><label>التسليم<input type="date" name="due" value="' + E(p.due || "") + '"></label></div>' +
      '<h3>المراحل</h3><p class="small muted">علّم المرحلة المنجزة، والعميل يشوف التقدم في بوابته.</p><div id="stg" style="display:flex;flex-direction:column;gap:6px">' + p.stages.map(stageRow).join("") + '</div><button type="button" class="btn ghost sm" id="add-stg">إضافة مرحلة</button>' + (isNew ? "" : '<button type="button" class="btn danger sm" id="del-p" style="align-self:flex-start">حذف المشروع</button>'), "حفظ", async function (f, form) {
        p.title = String(f.get("title") || "").trim(); if (!p.title) throw new Error("اكتب عنوان المشروع.");
        p.client_id = f.get("client_id"); p.status = f.get("status"); p.start = f.get("start"); p.due = f.get("due");
        p.stages = Array.from(form.querySelectorAll(".stg")).map(function (r) { var name = r.querySelector("input[type=text]").value.trim(), done = r.querySelector("input[type=checkbox]").checked, old = r.dataset.date; return name ? { name: name, done: done, date: done ? old || DA.day(0) : "" } : null; }).filter(Boolean);
        await DA.save("projects", p); UI.toast("حُفظ المشروع."); go(view, opt);
      });
    var d = $("dlg");
    d.querySelector("#add-stg").onclick = function () { d.querySelector("#stg").insertAdjacentHTML("beforeend", stageRow({ name: "", done: false })); };
    d.querySelector("#stg").onclick = function (e) { var b = e.target.closest("[data-rm]"); if (b) b.closest(".stg").remove(); };
    var dp = d.querySelector("#del-p"); if (dp) dp.onclick = async function () { if (!UI.confirm2(dp, "اضغط مرة ثانية للحذف")) return; await DA.remove("projects", p.id); d.close(); go(view, opt); };
    function stageRow(s) { return '<div class="stg row" data-date="' + E(s.date || "") + '" style="flex-wrap:nowrap"><input type="checkbox" ' + (s.done ? "checked" : "") + ' aria-label="منجزة" style="width:20px;min-height:20px"><input type="text" value="' + E(s.name) + '" maxlength="80" aria-label="اسم المرحلة"><button type="button" class="link" data-rm>حذف</button></div>'; }
  }
  function reportForm(r, clientId) {
    var isNew = !r; r = r || { client_id: clientId || (D.clients[0] || {}).id, kind: "تقرير", date: DA.day(0) };
    if (!D.clients.length) return UI.toast("أضف عميل أول.");
    UI.dialog(isNew ? "نشر تقرير للعميل" : "تعديل التقرير", '<div class="formgrid"><label class="full">العنوان<input name="title" value="' + E(r.title || "") + '" required maxlength="140"></label><label>العميل<select name="client_id">' + clientOptions(r.client_id) + '</select></label><label>النوع<select name="kind">' + ["تقرير", "لوحة", "ملف", "دراسة جدوى"].map(function (k) { return "<option" + (k === r.kind ? " selected" : "") + ">" + k + "</option>"; }).join("") + '</select></label><label>الفترة<input type="month" name="period" value="' + E(r.period || "") + '"></label><label>تاريخ النشر<input type="date" name="date" value="' + E(r.date || "") + '"></label><label class="full">الرابط (لوحة أو ملف)<input name="url" type="url" value="' + E(r.url || "") + '" dir="ltr" style="text-align:right" placeholder="https://"></label><label class="full">ملخص يظهر للعميل<textarea name="note" maxlength="1500">' + E(r.note || "") + "</textarea></label></div>" + (isNew ? "" : '<button type="button" class="btn danger sm" id="del-r" style="align-self:flex-start">حذف التقرير</button>'), "نشر", async function (f) {
      var o = Object.assign({}, r); ["title", "client_id", "kind", "period", "date", "url", "note"].forEach(function (k) { o[k] = String(f.get(k) || "").trim(); });
      if (!o.title) throw new Error("اكتب عنوان التقرير."); if (o.url && !/^https:\/\//.test(o.url)) throw new Error("الرابط لازم يبدأ بـ https://");
      await DA.save("reports", o); UI.toast("نُشر التقرير."); go(view, opt);
    });
    var dr = $("dlg").querySelector("#del-r"); if (dr) dr.onclick = async function () { if (!UI.confirm2(dr, "اضغط مرة ثانية للحذف")) return; await DA.remove("reports", r.id); $("dlg").close(); go(view, opt); };
  }
  function invoiceForm(i, clientId) {
    var isNew = !i; i = i || { client_id: clientId || (D.clients[0] || {}).id, issued: DA.day(0), due: DA.day(7), status: "مستحقة", amount: "" };
    if (!D.clients.length) return UI.toast("أضف عميل أول.");
    UI.dialog(isNew ? "فاتورة جديدة" : "فاتورة " + i.no, '<div class="formgrid"><label>العميل<select name="client_id">' + clientOptions(i.client_id) + '</select></label><label>المبلغ قبل الضريبة (ر.س)<input type="number" name="amount" min="0" step="0.01" value="' + E(i.amount) + '" required></label><label class="full">البيان<input name="desc" value="' + E(i.desc || "") + '" required maxlength="160" placeholder="مثال: باقة النمو، شهر ديسمبر"></label><label>الإصدار<input type="date" name="issued" value="' + E(i.issued) + '"></label><label>الاستحقاق<input type="date" name="due" value="' + E(i.due) + '"></label><label>الحالة<select name="status">' + ["مستحقة", "مدفوعة", "ملغاة"].map(function (s) { return "<option" + (s === i.status ? " selected" : "") + ">" + s + "</option>"; }).join("") + '</select></label><label class="row" style="flex-direction:row;align-items:center"><input type="checkbox" name="vat" style="width:20px;min-height:20px" ' + (isNew || Number(i.vat) > 0 ? "checked" : "") + "> تضاف ضريبة 15%</label></div>", "حفظ", async function (f) {
      var a = Number(f.get("amount")); if (!(a > 0)) throw new Error("اكتب المبلغ."); if (!String(f.get("desc")).trim()) throw new Error("اكتب البيان.");
      var o = Object.assign({}, i, { client_id: f.get("client_id"), desc: String(f.get("desc")).trim(), amount: a, vat: f.get("vat") ? Math.round(a * 15) / 100 : 0, issued: f.get("issued"), due: f.get("due"), status: f.get("status") });
      o.total = Math.round((o.amount + o.vat) * 100) / 100; if (o.status === "مدفوعة" && !o.paid_at) o.paid_at = DA.day(0);
      await DA.save("invoices", o); UI.toast("حُفظت الفاتورة."); go(view, opt);
    });
  }
  function rentForm(r) {
    var T = DA.RENT_TYPES, isNew = !r.id;
    UI.dialog(r.fromAuto ? "تعديل السعر الآلي لـ " + r.district : isNew ? "سعر إيجار جديد" : "تعديل سعر " + r.district, '<div class="formgrid"><label>المدينة<input name="city" required maxlength="40" value="' + E(r.city || "") + '"></label><label>الحي أو المنطقة<input name="district" required maxlength="80" value="' + E(r.district || "") + '"></label>' +
      '<label class="full">نوع العقار<select name="type">' + Object.keys(T).map(function (k) { return '<option value="' + k + '"' + (k === r.type ? " selected" : "") + ">" + E(T[k][0]) + " (" + (T[k][1] === "unit" ? "ر.س/سنة للوحدة" : "ر.س/م² سنويًا") + ")</option>"; }).join("") + "</select></label>" +
      '<label>الأدنى<input type="number" min="0" step="any" name="min" value="' + E(r.min == null ? "" : r.min) + '"></label><label>المتوسط<input type="number" min="0" step="any" name="avg" required value="' + E(r.avg == null ? "" : r.avg) + '"></label><label>الأعلى<input type="number" min="0" step="any" name="max" value="' + E(r.max == null ? "" : r.max) + '"></label><label>الشهر<input type="month" name="date" value="' + E(r.date || DA.day(0).slice(0, 7)) + '"></label>' +
      '<label class="full">المصدر<input name="source" maxlength="120" placeholder="مثال: منصة إيجار، عروض عقار، الهيئة العامة للعقار" value="' + E(r.sample ? "" : r.source || "") + '"></label>' +
      '<label class="full" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" name="sample"' + (r.sample && !isNew ? " checked" : "") + ' style="width:auto;min-height:0"> سعر تقديري (يظهر للزائر بعلامة «تقديري»)</label></div>', "حفظ", async function (f) {
        var num = function (k) { var v = f.get(k); return v === "" ? null : Math.max(0, Number(v)); };
        var o = Object.assign({}, r, { city: String(f.get("city")).trim(), district: String(f.get("district")).trim(), type: f.get("type"), min: num("min"), avg: num("avg"), max: num("max"), date: f.get("date"), sample: !!f.get("sample") });
        o.source = String(f.get("source")).trim() || (o.sample ? "تقدير للتجربة، غير معتمد" : "");
        if (!o.city || !o.district) throw new Error("اكتب المدينة والحي."); if (!(o.avg > 0)) throw new Error("اكتب متوسط السعر.");
        if (o.min != null && o.max != null && o.min > o.max) throw new Error("الأدنى أكبر من الأعلى.");
        if (!o.sample && !o.source) throw new Error("اكتب المصدر، أو علّمه تقديري.");
        delete o.fromAuto; delete o.auto; delete o.confidence; delete o.url;
        await DA.save("rents", o); UI.toast("حُفظ السعر."); go("rents", opt);
      });
  }
  function packageForm(p) {
    UI.dialog("تعديل باقة " + p.name, '<div class="formgrid"><label>الاسم<input name="name" value="' + E(p.name) + '" required maxlength="40"></label><label>السعر (ر.س)<input type="number" name="price" min="0" value="' + E(p.price == null ? "" : p.price) + '"></label><label>الفوترة<select name="period"><option value="monthly"' + (p.period === "monthly" ? " selected" : "") + '>شهريًا</option><option value="once"' + (p.period === "once" ? " selected" : "") + '>مرة وحدة</option></select></label>' +
      [["credits", "رصيد التحليل/شهر"], ["maint", "طلبات الصيانة/شهر"], ["requests", "طلبات الخدمة/شهر"]].map(function (x) { return "<label>" + x[1] + '<input type="number" min="0" name="' + x[0] + '" value="' + E(p.limits[x[0]] == null ? "" : p.limits[x[0]]) + '" placeholder="بدون حد"></label>'; }).join("") +
      '<label class="full">المزايا (سطر لكل ميزة)<textarea name="features">' + E((p.features || []).join("\n")) + "</textarea></label></div>", "حفظ", async function (f) {
        var o = Object.assign({}, p, { name: String(f.get("name")).trim() || p.name, price: f.get("price") === "" ? null : Number(f.get("price")), period: f.get("period"), features: String(f.get("features")).split("\n").map(function (s) { return s.trim(); }).filter(Boolean), limits: {} });
        ["credits", "maint", "requests"].forEach(function (k) { o.limits[k] = f.get(k) === "" ? null : Math.max(0, Math.floor(Number(f.get(k)))); });
        await DA.save("packages", o); UI.toast("حُفظت الباقة."); go("packages");
      });
  }
  function requestView(id) {
    var r = D.requests.find(function (x) { return x.id === id; }); if (!r) return;
    UI.dialog("#" + r.no + " · " + r.title, '<p class="small muted">' + E(cname(r.client_id)) + " · " + E(r.type) + " · " + UI.pill(r.priority) + " · فُتح " + UI.ago(r.created) + '</p><div class="thread">' + r.messages.map(function (msg) { return '<div class="msg ' + (msg.from === "owner" ? "me" : "them") + '">' + E(msg.text) + "<small>" + (msg.from === "owner" ? "أنت" : "العميل") + " · " + UI.ago(msg.at) + "</small></div>"; }).join("") +
      '</div><label>ردك<textarea name="t" maxlength="3000" placeholder="اكتب ردك للعميل"></textarea></label><label>الحالة<select name="s">' + REQ_ST.map(function (s) { return "<option" + (s === r.status ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></label>", "إرسال", async function (f) {
        var t = String(f.get("t") || "").trim(), s = f.get("s"); if (!t && s === r.status) throw new Error("اكتب رد أو غيّر الحالة.");
        await DA.reply(r.id, t, s); UI.toast("وصل ردك للعميل."); go(view, opt);
      });
  }
  go(new URLSearchParams(location.search).get("v") || "home");
})();

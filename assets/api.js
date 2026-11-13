/* المحلل الرقمي: طبقة البيانات
   MODE = "demo"   : كل شي محفوظ في متصفح الجهاز (للتجربة قبل الاستضافة).
   MODE = "server" : نفس الدوال تكلم خادم Hostinger على BASE_URL (انظر server/API.md).
   الصفحات ما تعرف الفرق، فالانتقال للخادم يكون بتغيير السطرين تحت فقط. */
(function () {
  var MODE = "demo";
  var BASE_URL = "/api"; /* مثال للمرحلة الجاية: https://example.com/api */

  var KEY = "da_db_v1", SKEY = "da_session";
  var ENT = ["users", "packages", "clients", "projects", "requests", "reports", "invoices", "usage", "log", "rents"];
  function now() { return Date.now(); }
  function uid(p) { return (p || "") + now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function day(off) { var d = new Date(); d.setDate(d.getDate() + (off || 0)); return d.toISOString().slice(0, 10); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  async function sha(text) {
    var b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("");
  }
  async function hashPw(pw, salt) { return sha(salt + ":" + pw); }
  function strong(pw) { return typeof pw === "string" && pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw); }
  function genPassword() {
    var a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789", r = new Uint32Array(10), s = "";
    crypto.getRandomValues(r); for (var i = 0; i < 10; i++) s += a[r[i] % a.length];
    return s.slice(0, 5) + "-" + s.slice(5);
  }

  /* ---------- الرصيد: كل باقة لها رصيد تحليل شهري، وكل نوع استخدام يخصم بقدر جهده ----------
     الإدخال اليدوي أرخص من رفع الملف، والتحليل بالذكاء الاصطناعي أغلى. المالك يعدّلها من الإعدادات. */
  var COSTS = { manual: 1, file: 2, ai: 5 };
  var COST_N = { manual: "تحليل بيانات مدخلة يدويًا", file: "تحليل ملف Excel أو CSV", ai: "تحليل بالذكاء الاصطناعي" };

  /* ---------- الباقات الافتراضية (الحدود شهرية، null = بدون حد) ---------- */
  var PACKAGES = [
    { id: "free", name: "التجربة المجانية", price: 0, period: "once", limits: { credits: 4, maint: 3, requests: 1 },
      features: ["تجربة الأدوات على بياناتك", "استشارة أولى"] },
    { id: "start", name: "الانطلاقة", price: null, period: "once", limits: { credits: 30, maint: 20, requests: 5 },
      features: ["موقع تعريفي حتى 5 صفحات", "نموذج تواصل وربط واتساب", "إعداد Google Analytics 4"] },
    { id: "growth", name: "النمو", price: null, period: "monthly", limits: { credits: 150, maint: 100, requests: 20 },
      features: ["كل ما في الانطلاقة", "لوحة مؤشرات أداء", "تتبع مصادر العملاء والإعلانات", "تقرير شهري بالتوصيات"] },
    { id: "pro", name: "المتكامل", price: null, period: "monthly", limits: { credits: null, maint: null, requests: null },
      features: ["وثيقة متطلبات النظام", "مخططات سير العمل وقاعدة البيانات", "واجهات وصلاحيات", "لوحة إدارية لمتابعة الأداء"] }
  ];

  /* ---------- أسعار الإيجار ----------
     التقديرية (sample) أرقام تقريبية للتجربة وتظهر بعلامة «تقديري» لين المالك يحدّثها من إيجار أو الهيئة العامة للعقار أو العروض.
     الوحدة: m2 = ريال للمتر المربع سنويًا، unit = ريال للوحدة سنويًا (الشقق والفلل). */
  var RENT_TYPES = { shop: ["محل تجاري", "m2"], office: ["مكتب", "m2"], mall: ["محل في مركز تسوق", "m2"], warehouse: ["مستودع", "m2"], factory: ["مصنع", "m2"], farm: ["مزرعة", "m2"], apartment: ["شقة سكنية", "unit"], villa: ["فيلا", "unit"] };
  /* الأسعار المنشورة في data/rents.json يحدّثها وكيل ذكاء اصطناعي أسبوعيًا (انظر data/README.md).
     تعديلات المالك من مركز التحكم تتقدم عليها لنفس المدينة والحي والنوع. */
  var BASE = (function () { var c = document.currentScript && document.currentScript.src; return c ? c.replace(/assets\/api\.js.*$/, "") : ""; })();
  var CONF = { official: "رسمي", report: "تقرير منشور", estimate: "تقدير ذكاء اصطناعي" };
  var pubP = null;
  function published() {
    if (!pubP) pubP = fetch(BASE + "data/rents.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).catch(function () { return { rows: [], sources: [] }; });
    return pubP;
  }
  function rkey(r) { return [r.city, r.district, r.type].join("|"); }
  function fromPub(doc) {
    var src = {}; (doc.sources || []).forEach(function (x) { src[x.id] = x; });
    return (doc.rows || []).map(function (r) { var ss = (r.sources || []).map(function (id) { return src[id]; }).filter(Boolean);
      return { id: "p:" + rkey(r), city: r.city, district: r.district, type: r.type, min: r.min, avg: r.avg, max: r.max, date: r.period || doc.updated,
        source: ss.length ? ss.map(function (x) { return x.title; }).join("، ") : (CONF[r.confidence] || "تقدير") + (r.note ? " · " + r.note : ""), url: ss[0] && ss[0].url,
        sample: r.confidence === "estimate", confidence: r.confidence, auto: true }; });
  }

  /* ---------- قاعدة البيانات التجريبية ---------- */
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }
  function store(db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { throw new Error("ما قدرنا نحفظ في المتصفح. تأكد إن التخزين مسموح."); } }
  function db() {
    var d = load();
    if (!d || typeof d !== "object") d = {};
    ENT.forEach(function (k) { if (!Array.isArray(d[k])) d[k] = []; });
    if (!d.packages.length) d.packages = clone(PACKAGES);
    if (!d.meta) d.meta = { seq: { request: 100, invoice: 1000 }, created: now() };
    if (!d.meta.costs) d.meta.costs = clone(COSTS);
    /* ترحيل الباقات القديمة (ملفات لكل أداة) إلى رصيد موحد */
    d.packages.forEach(function (p) { var l = p.limits || (p.limits = {});
      if (!("credits" in l)) { l.credits = l.sales == null && "sales" in l ? null : ((l.sales || 0) + (l.traffic || 0)) * COSTS.file; }
      delete l.sales; delete l.traffic; });
    /* الأسعار التقديرية القديمة صارت في data/rents.json، فتنشال من نسخة المتصفح ويبقى تعديل المالك فقط */
    if (d.meta.rentsSeeded && !d.meta.rentsV2) { d.meta.rentsV2 = true; d.rents = d.rents.filter(function (r) { return r.source !== "تقدير للتجربة، غير معتمد" && String(r.source || "").indexOf("نايت فرانك") !== 0; }); try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
    return d;
  }
  function logAct(d, who, action) { d.log.push({ id: uid("l"), at: now(), who: who, action: action }); d.log = d.log.slice(-500); }

  /* عملاء تجريبيون عشان تشوف شكل كل شاشة. كلمات مرورهم تطلع للمالك مرة وحدة وقت الإنشاء. */
  async function seedDemo() {
    var d = db();
    if (d.clients.length) return d;
    var c1 = { id: uid("c"), name: "محمد العتيبي", company: "كافيه سحاب", city: "جدة", phone: "0500000001", email: "", package_id: "growth", start: day(-40), end: day(50), status: "active", notes: "3 فروع، بيانات من نظام نقاط البيع" };
    var c2 = { id: uid("c"), name: "نورة القحطاني", company: "متجر أناقة للعطور", city: "الرياض", phone: "0500000002", email: "", package_id: "start", start: day(-10), end: day(20), status: "active", notes: "" };
    var c3 = { id: uid("c"), name: "خالد الحربي", company: "مؤسسة البناء الحديث", city: "مكة", phone: "0500000003", email: "", package_id: "pro", start: day(-90), end: day(5), status: "active", notes: "نظام طلبات صيانة وموارد بشرية" };
    d.clients.push(c1, c2, c3);
    var users = [["cafe", c1], ["anaqa", c2], ["binaa", c3]];
    for (var i = 0; i < users.length; i++) {
      var salt = uid("s");
      d.users.push({ id: uid("u"), username: users[i][0], name: users[i][1].name, role: "client", client_id: users[i][1].id, salt: salt, pass: await hashPw("Demo-2026", salt), active: true, must_change: false, created: now() });
    }
    d.projects.push({ id: uid("p"), client_id: c1.id, title: "لوحة مبيعات الفروع الثلاثة", status: "active", start: day(-35), due: day(10),
      stages: [{ name: "فهم الاحتياج", done: true, date: day(-35) }, { name: "تجميع البيانات وتنظيفها", done: true, date: day(-25) }, { name: "بناء اللوحة", done: false, date: "" }, { name: "التسليم والتدريب", done: false, date: "" }] });
    d.projects.push({ id: uid("p"), client_id: c3.id, title: "نظام طلبات الصيانة", status: "active", start: day(-80), due: day(-2),
      stages: [{ name: "تحليل المتطلبات", done: true, date: day(-80) }, { name: "مخطط سير العمل وقاعدة البيانات", done: true, date: day(-60) }, { name: "تصميم الواجهات والصلاحيات", done: true, date: day(-30) }, { name: "التجربة مع الفريق", done: false, date: "" }, { name: "الإطلاق", done: false, date: "" }] });
    d.requests.push({ id: uid("r"), no: ++d.meta.seq.request, client_id: c1.id, title: "إضافة مقارنة بالسنة الماضية في اللوحة", type: "تعديل", priority: "متوسطة", status: "قيد التنفيذ", created: now() - 3 * 864e5, updated: now() - 864e5,
      messages: [{ from: "client", text: "نبي نشوف مبيعات كل فرع مقارنة بنفس الشهر السنة الماضية.", at: now() - 3 * 864e5 }, { from: "owner", text: "تمام، نضيفها في صفحة الفروع ونرسل لك نسخة للمراجعة هذا الأسبوع.", at: now() - 864e5 }] });
    d.requests.push({ id: uid("r"), no: ++d.meta.seq.request, client_id: c3.id, title: "الفني ما يقدر يغير حالة الطلب", type: "دعم فني", priority: "عالية", status: "جديد", created: now() - 5 * 36e5, updated: now() - 5 * 36e5,
      messages: [{ from: "client", text: "حساب الفني سامي يظهر له الطلب بس ما يقدر يحوله لقيد التنفيذ.", at: now() - 5 * 36e5 }] });
    d.reports.push({ id: uid("t"), client_id: c1.id, title: "تقرير المبيعات الشهري: أكتوبر", kind: "تقرير", url: "", note: "أفضل فرع العزيزية، وفرع النسيم يحتاج مراجعة القهوة المختصة.", period: "2026-10", date: day(-6) });
    d.reports.push({ id: uid("t"), client_id: c1.id, title: "لوحة المبيعات التفاعلية", kind: "لوحة", url: "https://algilani2008.github.io/Digital-Analyst/#tools", note: "تتحدث أول كل شهر.", period: "", date: day(-20) });
    d.invoices.push({ id: uid("i"), no: ++d.meta.seq.invoice, client_id: c1.id, desc: "باقة النمو: شهر أكتوبر", amount: 3000, vat: 450, total: 3450, issued: day(-35), due: day(-28), status: "مدفوعة", paid_at: day(-30) });
    d.invoices.push({ id: uid("i"), no: ++d.meta.seq.invoice, client_id: c1.id, desc: "باقة النمو: شهر نوفمبر", amount: 3000, vat: 450, total: 3450, issued: day(-5), due: day(2), status: "مستحقة" });
    d.invoices.push({ id: uid("i"), no: ++d.meta.seq.invoice, client_id: c3.id, desc: "الدفعة الثانية: نظام الصيانة", amount: 8000, vat: 1200, total: 9200, issued: day(-20), due: day(-6), status: "مستحقة" });
    logAct(d, "النظام", "أُضيفت بيانات تجريبية");
    store(d); return d;
  }

  /* ---------- الجلسة ---------- */
  function session() { try { var s = JSON.parse(localStorage.getItem(SKEY) || "null"); return s && s.exp > now() ? s : null; } catch (e) { return null; } }
  function setSession(u) { var s = { uid: u.id, role: u.role, name: u.name, username: u.username, client_id: u.client_id || null, exp: now() + 8 * 36e5, must_change: !!u.must_change }; localStorage.setItem(SKEY, JSON.stringify(s)); return s; }
  function logout() { if (MODE === "server") { try { fetch(BASE_URL + "/auth/logout", { method: "POST", credentials: "include" }); } catch (e) {} } localStorage.removeItem(SKEY); }
  function need(role) {
    var s = session();
    if (!s || (role && s.role !== role)) { location.replace((location.pathname.indexOf("/admin") >= 0 || location.pathname.indexOf("/portal") >= 0 ? "../" : "") + "login.html" + (role === "owner" ? "?as=owner" : "")); throw new Error("redirect"); }
    return s;
  }
  function isOwner() { var s = session(); return s && s.role === "owner"; }

  /* محاولات الدخول الخاطئة: 5 محاولات ثم إيقاف 10 دقائق لنفس اسم المستخدم */
  function throttle(username) {
    var k = "da_fail_" + username.toLowerCase(), r; try { r = JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { r = null; }
    return { blocked: r && r.n >= 5 && now() - r.at < 6e5, fail: function () { var n = r && now() - r.at < 6e5 ? r.n + 1 : 1; localStorage.setItem(k, JSON.stringify({ n: n, at: now() })); }, clear: function () { localStorage.removeItem(k); } };
  }

  /* ---------- وضع الخادم ---------- */
  async function http(path, body) {
    var s = session();
    var r = await fetch(BASE_URL + path, { method: body ? "POST" : "GET", headers: Object.assign({ "Content-Type": "application/json" }, s && s.token ? { Authorization: "Bearer " + s.token } : {}), body: body ? JSON.stringify(body) : undefined, credentials: "include" });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(j.error || "تعذر الاتصال بالخادم.");
    return j;
  }

  /* ---------- الواجهة العامة ---------- */
  var DA = {
    MODE: MODE, day: day, uid: uid, strong: strong, genPassword: genPassword, session: session, need: need, logout: logout, isOwner: isOwner,

    hasOwner: async function () { if (MODE === "server") return (await http("/auth/status")).has_owner; return db().users.some(function (u) { return u.role === "owner"; }); },

    /* أول مرة: إنشاء حساب المالك على هذا الجهاز (في وضع الخادم يتم من لوحة الاستضافة) */
    setupOwner: async function (name, username, pw) {
      if (MODE === "server") throw new Error("حساب المالك يتجهز من الخادم.");
      var d = db(); if (d.users.some(function (u) { return u.role === "owner"; })) throw new Error("فيه مالك مسجل من قبل على هذا الجهاز.");
      if (!/^[a-z0-9_.-]{3,30}$/i.test(username)) throw new Error("اسم المستخدم من 3 إلى 30 حرف إنجليزي أو رقم.");
      if (!strong(pw)) throw new Error("كلمة المرور 8 أحرف على الأقل وفيها حرف ورقم.");
      var salt = uid("s"), u = { id: uid("u"), username: username.toLowerCase(), name: name || "مالك الموقع", role: "owner", salt: salt, pass: await hashPw(pw, salt), active: true, created: now() };
      d.users.push(u); logAct(d, u.name, "أُنشئ حساب المالك"); store(d); await seedDemo(); return setSession(u);
    },

    login: async function (username, pw, role) {
      username = String(username || "").trim().toLowerCase();
      if (MODE === "server") { var j = await http("/auth/login", { username: username, password: pw, role: role }); localStorage.setItem(SKEY, JSON.stringify(Object.assign(j.session, { exp: now() + 8 * 36e5 }))); return session(); }
      var t = throttle(username); if (t.blocked) throw new Error("محاولات كثيرة. جرّب بعد 10 دقائق.");
      var d = db(), u = d.users.find(function (x) { return x.username === username && x.role === role; });
      if (!u || u.pass !== await hashPw(pw, u.salt)) { t.fail(); throw new Error("اسم المستخدم أو كلمة المرور غير صحيحة."); }
      if (!u.active) throw new Error("الحساب موقوف. تواصل مع المحلل الرقمي.");
      if (role === "client") { var c = d.clients.find(function (x) { return x.id === u.client_id; }); if (!c || c.status === "ended") throw new Error("انتهى اشتراكك. تواصل معنا لتجديده."); }
      t.clear(); u.last_login = now(); logAct(d, u.name, "تسجيل دخول"); store(d); return setSession(u);
    },

    changePassword: async function (oldPw, newPw) {
      var s = session(); if (!s) throw new Error("سجّل دخول أول.");
      if (!strong(newPw)) throw new Error("كلمة المرور الجديدة 8 أحرف على الأقل وفيها حرف ورقم.");
      if (MODE === "server") return http("/auth/password", { old: oldPw, new: newPw });
      var d = db(), u = d.users.find(function (x) { return x.id === s.uid; });
      if (!u || (!s.must_change && u.pass !== await hashPw(oldPw, u.salt))) throw new Error("كلمة المرور الحالية غير صحيحة.");
      u.salt = uid("s"); u.pass = await hashPw(newPw, u.salt); u.must_change = false; logAct(d, u.name, "غيّر كلمة المرور"); store(d);
      s.must_change = false; localStorage.setItem(SKEY, JSON.stringify(s));
    },

    /* ---------- للمالك ---------- */
    all: async function () { if (!isOwner()) throw new Error("للمالك فقط."); if (MODE === "server") return http("/admin/all"); return clone(db()); },
    save: async function (ent, obj) {
      if (!isOwner()) throw new Error("للمالك فقط."); if (ENT.indexOf(ent) < 0) throw new Error("نوع غير معروف.");
      if (MODE === "server") return http("/admin/save", { entity: ent, data: obj });
      var d = db(), list = d[ent], i = list.findIndex(function (x) { return x.id === obj.id; });
      if (!obj.id) obj.id = uid(ent[0]);
      if (ent === "requests" && !obj.no) obj.no = ++d.meta.seq.request;
      if (ent === "invoices" && !obj.no) obj.no = ++d.meta.seq.invoice;
      if (i >= 0) list[i] = obj; else list.push(obj);
      logAct(d, session().name, (i >= 0 ? "عدّل " : "أضاف ") + ({ clients: "عميل", projects: "مشروع", requests: "طلب", reports: "تقرير", invoices: "فاتورة", packages: "باقة", rents: "سعر إيجار" }[ent] || ent) + (obj.title || obj.name || obj.desc || obj.district ? ": " + (obj.title || obj.name || obj.desc || (obj.city + " · " + obj.district)) : ""));
      store(d); return clone(obj);
    },
    remove: async function (ent, id) {
      if (!isOwner()) throw new Error("للمالك فقط.");
      if (MODE === "server") return http("/admin/remove", { entity: ent, id: id });
      var d = db(); d[ent] = d[ent].filter(function (x) { return x.id !== id; });
      if (ent === "clients") ["users", "projects", "requests", "reports", "invoices", "usage"].forEach(function (k) { d[k] = d[k].filter(function (x) { return x.client_id !== id; }); });
      logAct(d, session().name, "حذف من " + ent); store(d);
    },
    /* حساب دخول لعميل: يرجع كلمة مرور مؤقتة تظهر مرة وحدة */
    issueLogin: async function (clientId, username) {
      if (!isOwner()) throw new Error("للمالك فقط.");
      if (MODE === "server") return http("/admin/issue-login", { client_id: clientId, username: username });
      username = String(username || "").trim().toLowerCase();
      if (!/^[a-z0-9_.-]{3,30}$/.test(username)) throw new Error("اسم المستخدم من 3 إلى 30 حرف إنجليزي صغير أو رقم.");
      var d = db(), c = d.clients.find(function (x) { return x.id === clientId; }); if (!c) throw new Error("العميل غير موجود.");
      var other = d.users.find(function (u) { return u.username === username && u.client_id !== clientId; }); if (other) throw new Error("اسم المستخدم مستخدم لحساب ثاني.");
      var u = d.users.find(function (x) { return x.client_id === clientId; }), pw = genPassword(), salt = uid("s");
      if (!u) { u = { id: uid("u"), role: "client", client_id: clientId, created: now() }; d.users.push(u); }
      Object.assign(u, { username: username, name: c.name, salt: salt, pass: await hashPw(pw, salt), active: true, must_change: true });
      logAct(d, session().name, "أصدر بيانات دخول للعميل: " + c.company); store(d);
      return { username: username, password: pw };
    },
    setUserActive: async function (clientId, active) {
      if (!isOwner()) throw new Error("للمالك فقط.");
      if (MODE === "server") return http("/admin/user-active", { client_id: clientId, active: active });
      var d = db(), u = d.users.find(function (x) { return x.client_id === clientId; }); if (u) { u.active = !!active; store(d); }
    },
    reply: async function (requestId, text, status) {
      var s = session(); if (!s) throw new Error("سجّل دخول أول.");
      if (MODE === "server") return http("/requests/reply", { id: requestId, text: text, status: status });
      var d = db(), r = d.requests.find(function (x) { return x.id === requestId; });
      if (!r || (s.role === "client" && r.client_id !== s.client_id)) throw new Error("الطلب غير موجود.");
      if (text) r.messages.push({ from: s.role === "owner" ? "owner" : "client", text: String(text).slice(0, 3000), at: now() });
      if (status && s.role === "owner") r.status = status;
      if (s.role === "client" && r.status === "بانتظار العميل") r.status = "قيد التنفيذ";
      r.updated = now(); store(d); return clone(r);
    },
    backup: function () { return JSON.stringify(db(), null, 1); },
    resetDemo: async function () { if (!isOwner()) throw new Error("للمالك فقط."); var d = db(), owner = d.users.filter(function (u) { return u.role === "owner"; }); localStorage.removeItem(KEY); var n = db(); n.users = owner; store(n); await seedDemo(); },

    /* ---------- للعميل: بياناته فقط ---------- */
    mine: async function () {
      var s = session(); if (!s || s.role !== "client") throw new Error("سجّل دخول كعميل.");
      if (MODE === "server") return http("/client/mine");
      var d = db(), id = s.client_id, c = d.clients.find(function (x) { return x.id === id; });
      if (!c) throw new Error("ما لقينا حسابك.");
      return clone({ client: c, package: d.packages.find(function (p) { return p.id === c.package_id; }) || d.packages[0],
        projects: d.projects.filter(function (x) { return x.client_id === id; }), requests: d.requests.filter(function (x) { return x.client_id === id; }),
        reports: d.reports.filter(function (x) { return x.client_id === id; }), invoices: d.invoices.filter(function (x) { return x.client_id === id; }),
        usage: DA.usageOf(d, id) });
    },
    newRequest: async function (title, type, priority, text) {
      var s = session(); if (!s || s.role !== "client") throw new Error("سجّل دخول كعميل.");
      title = String(title || "").trim().slice(0, 160); text = String(text || "").trim().slice(0, 3000);
      if (!title || !text) throw new Error("اكتب عنوان الطلب وتفاصيله.");
      if (MODE === "server") return http("/client/request", { title: title, type: type, priority: priority, text: text });
      var d = db(), c = d.clients.find(function (x) { return x.id === s.client_id; }), p = d.packages.find(function (x) { return x.id === c.package_id; });
      var used = DA.usageOf(d, c.id).requests, lim = p && p.limits.requests;
      if (lim != null && used >= lim) throw new Error("وصلت حد الطلبات في باقتك لهذا الشهر (" + lim + "). تواصل معنا للترقية.");
      var r = { id: uid("r"), no: ++d.meta.seq.request, client_id: c.id, title: title, type: type || "استفسار", priority: priority || "متوسطة", status: "جديد", created: now(), updated: now(), messages: [{ from: "client", text: text, at: now() }] };
      d.requests.push(r); DA.bump(d, c.id, "requests"); logAct(d, c.company, "رفع طلب: " + title); store(d); return clone(r);
    },
    month: function () { return new Date().toISOString().slice(0, 7); },
    usageOf: function (d, clientId) {
      var m = DA.month(), o = { credits: 0, maint: 0, requests: 0 };
      d.usage.forEach(function (u) { if (u.client_id !== clientId || u.month !== m) return;
        if (u.tool === "sales" || u.tool === "traffic") o.credits += u.count * COSTS.file; else o[u.tool] = (o[u.tool] || 0) + u.count; });
      o.credits = Math.round(o.credits * 100) / 100; return o;
    },
    bump: function (d, clientId, tool, n) {
      var m = DA.month(), u = d.usage.find(function (x) { return x.client_id === clientId && x.tool === tool && x.month === m; });
      if (!u) { u = { id: uid("g"), client_id: clientId, tool: tool, month: m, count: 0 }; d.usage.push(u); }
      u.count = n != null ? Math.max(u.count, n) : u.count + 1;
    },
    /* ---------- عامة (بدون دخول): أسعار الرصيد وأسعار الإيجار ---------- */
    COST_N: COST_N, RENT_TYPES: RENT_TYPES,
    costs: function () { var d = load(), c = d && d.meta && d.meta.costs; return Object.assign({}, COSTS, c || {}); },
    freeCredits: function () { var d = load(), p = d && Array.isArray(d.packages) && d.packages.find(function (x) { return x.id === "free"; }); var v = p && p.limits && p.limits.credits; return typeof v === "number" ? v : PACKAGES[0].limits.credits; },
    setCosts: async function (c) { if (!isOwner()) throw new Error("للمالك فقط."); if (MODE === "server") return http("/admin/costs", c);
      var d = db(); Object.keys(COSTS).forEach(function (k) { var v = Number(c[k]); if (isFinite(v) && v >= 0) d.meta.costs[k] = Math.round(v * 100) / 100; });
      logAct(d, session().name, "عدّل أسعار الرصيد"); store(d); return clone(d.meta.costs); },
    rents: async function () {
      if (MODE === "server") return http("/public/rents");
      var doc = await published(), mine = db().rents, keys = {};
      mine.forEach(function (r) { keys[rkey(r)] = 1; });
      return clone(mine.map(function (r) { return Object.assign({ confidence: r.sample ? "estimate" : "owner" }, r); }).concat(fromPub(doc).filter(function (r) { return !keys[rkey(r)]; })));
    },
    /* العنوان الوطني المختصر ← إحداثيات. مفتاح سبل (SPL) سري، فالطلب يمر من الخادم فقط */
    geocodeShort: async function (code) {
      if (MODE === "server") { var g = await http("/public/geocode?code=" + encodeURIComponent(code)); return { lat: +g.lat, lng: +g.lng }; }
      throw new Error("تحديد العنوان الوطني يشتغل بعد ربط الموقع بخادم Hostinger (مفتاح العنوان الوطني ما يصير يكون في المتصفح). للحين افتحه من «خرائط العنوان الوطني» فوق.");
    },
    rentsMeta: async function () { var d = await published(); return { updated: d.updated, method: d.method, log: d.log || [], sources: d.sources || [] }; },
    CONF: CONF,

    /* تستخدمها الأدوات في الصفحة الرئيسية لما يكون العميل داخل */
    portalLimits: function () {
      var s = session(); if (!s || s.role !== "client" || MODE !== "demo") return null;
      var d = db(), c = d.clients.find(function (x) { return x.id === s.client_id; }); if (!c || c.status !== "active") return null;
      var p = d.packages.find(function (x) { return x.id === c.package_id; }); if (!p) return null;
      var u = DA.usageOf(d, c.id);
      return { pkg: p.name, company: c.company, limits: { credits: p.limits.credits == null ? Infinity : p.limits.credits, maint: p.limits.maint == null ? Infinity : p.limits.maint },
        used: { credits: u.credits, maint: u.maint },
        sync: function (m) { var dd = db(), had = DA.usageOf(dd, c.id).credits, add = m.used.credits - had;
          if (add > 0) { var mo = DA.month(), g = dd.usage.find(function (x) { return x.client_id === c.id && x.tool === "credits" && x.month === mo; });
            if (!g) { g = { id: uid("g"), client_id: c.id, tool: "credits", month: mo, count: 0 }; dd.usage.push(g); } g.count = Math.round((g.count + add) * 100) / 100; }
          DA.bump(dd, c.id, "maint", m.made); store(dd); } };
    }
  };
  window.DA = DA;
})();

/* أدوات عرض مشتركة */
window.UI = {
  esc: function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); },
  sar: function (n) { return n == null || n === "" ? "—" : Math.round(Number(n)).toLocaleString("en-US"); },
  date: function (v) { if (!v) return "—"; var d = typeof v === "number" ? new Date(v) : new Date(v + (String(v).length === 10 ? "T12:00:00" : "")); return isNaN(d) ? "—" : d.toISOString().slice(0, 10); },
  ago: function (t) { var h = Math.floor((Date.now() - t) / 36e5); return h < 1 ? "الحين" : h < 24 ? "قبل " + h + " ساعة" : "قبل " + Math.floor(h / 24) + " يوم"; },
  daysTo: function (d) { if (!d) return null; return Math.round((new Date(d + "T12:00:00") - new Date(new Date().toISOString().slice(0, 10) + "T12:00:00")) / 864e5); },
  toast: function (t) { var e = document.createElement("div"); e.className = "toast"; e.setAttribute("role", "status"); e.textContent = t; document.body.append(e); setTimeout(function () { e.remove(); }, 2800); },
  pill: function (t) { var cls = { "مدفوعة": "ok", "نشط": "ok", "active": "ok", "مكتمل": "ok", "مغلق": "", "جديد": "warn", "قيد التنفيذ": "ok", "بانتظار العميل": "warn", "مستحقة": "warn", "متأخرة": "bad", "ملغاة": "", "عالية": "bad", "متوسطة": "warn", "منخفضة": "" }[t]; return '<span class="pill ' + (cls || "") + '">' + UI.esc(t) + "</span>"; },
  dialog: function (title, body, submit, onSubmit) {
    var d = document.getElementById("dlg"); if (!d) { d = document.createElement("dialog"); d.id = "dlg"; document.body.append(d); }
    d.innerHTML = '<form method="dialog" novalidate><div class="dh"><h2>' + UI.esc(title) + '</h2><button type="button" class="link" data-x>إغلاق</button></div>' + body + '<p class="err" data-e role="alert"></p><div class="da">' + (submit ? '<button class="btn" type="submit">' + UI.esc(submit) + "</button>" : "") + '<button type="button" class="btn ghost" data-x>إلغاء</button></div></form>';
    d.querySelectorAll("[data-x]").forEach(function (b) { b.onclick = function () { d.close(); }; });
    var f = d.querySelector("form");
    f.onsubmit = async function (e) { e.preventDefault(); var b = f.querySelector("[type=submit]"); if (b) b.disabled = true;
      try { var keep = await onSubmit(new FormData(f), f); if (keep !== true) d.close(); } catch (x) { f.querySelector("[data-e]").textContent = x.message; } if (b) b.disabled = false; };
    d.showModal(); var first = f.querySelector("input,select,textarea"); if (first) first.focus(); return d;
  },
  confirm2: function (btn, label) { if (btn.dataset.armed === "1") return true; var old = btn.textContent; btn.dataset.armed = "1"; btn.textContent = label || "اضغط مرة ثانية للتأكيد"; setTimeout(function () { if (btn.isConnected) { btn.dataset.armed = ""; btn.textContent = old; } }, 4000); return false; }
};

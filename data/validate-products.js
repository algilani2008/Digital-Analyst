/* يتحقق من data/products.json قبل أي نشر. يشغله وكيل التحديث الآلي: node data/validate-products.js */
const fs = require("fs"), path = require("path");
const doc = JSON.parse(fs.readFileSync(path.join(__dirname, "products.json"), "utf8"));
const CONF = ["official", "report", "estimate"], err = [], src = new Set();
if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.updated || "")) err.push("updated لازم يكون تاريخ YYYY-MM-DD");
(doc.sources || []).forEach((s, i) => { if (!s.id || !s.title) err.push("sources[" + i + "] ناقص id أو title"); if (s.url && !/^https:\/\//.test(s.url)) err.push("sources[" + i + "] الرابط لازم https"); src.add(s.id); });
if (!Array.isArray(doc.activities) || doc.activities.length < 3) err.push("activities قليلة أو مفقودة");
(doc.activities || []).forEach((a, ai) => {
  if (!a.id || !a.name) err.push("activities[" + ai + "] ناقص id أو name");
  if (!Array.isArray(a.products) || a.products.length < 3 || a.products.length > 8) err.push(a.name + ": عدد المنتجات لازم بين 3 و8");
  const seen = new Set();
  (a.products || []).forEach((p, i) => {
    const at = a.name + "/" + (p.name || i);
    if (!p.name || !p.unit) err.push(at + ": الاسم والوحدة مطلوبة");
    if (seen.has(p.name)) err.push(at + ": مكرر"); seen.add(p.name);
    if (!(p.demand >= 0 && p.demand <= 100)) err.push(at + ": مؤشر الطلب لازم بين 0 و100");
    const pr = p.price || {};
    if (!(pr.avg > 0 && pr.avg < 100000)) err.push(at + ": متوسط السعر " + pr.avg + " غير معقول");
    if (pr.min != null && pr.min > pr.avg) err.push(at + ": الأدنى أكبر من المتوسط");
    if (pr.max != null && pr.max < pr.avg) err.push(at + ": الأعلى أقل من المتوسط");
    if (p.rating != null && !(p.rating.score > 0 && p.rating.score <= 5 && String(p.rating.source || "").trim())) err.push(at + ": التقييم لازم من 5 وله مصدر");
    if (!CONF.includes(p.confidence)) err.push(at + ": confidence لازم official أو report أو estimate");
    if (p.confidence !== "estimate" && !(p.sources || []).length) err.push(at + ": الرسمي والتقرير لازم لهم مصدر");
    (p.sources || []).forEach(id => { if (!src.has(id)) err.push(at + ": مصدر غير معرّف " + id); });
  });
});
if (err.length) { console.error("فشل التحقق:\n- " + err.join("\n- ")); process.exit(1); }
const all = doc.activities.flatMap(a => a.products), by = {};
all.forEach(p => by[p.confidence] = (by[p.confidence] || 0) + 1);
console.log("سليم: " + doc.activities.length + " نشاط، " + all.length + " منتج", by);

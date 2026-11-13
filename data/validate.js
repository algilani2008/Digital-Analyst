/* يتحقق من data/rents.json قبل أي نشر. يشغله وكيل التحديث الآلي: node data/validate.js */
const fs = require("fs"), path = require("path");
const doc = JSON.parse(fs.readFileSync(path.join(__dirname, "rents.json"), "utf8"));
const TYPES = { shop: [50, 15000], office: [50, 10000], mall: [100, 20000], warehouse: [10, 1500], factory: [5, 1500], farm: [0.1, 200], apartment: [3000, 1000000], villa: [10000, 3000000] };
const CONF = ["official", "report", "estimate"], err = [], seen = new Set(), src = new Set();
if (!/^\d{4}-\d{2}-\d{2}$/.test(doc.updated || "")) err.push("updated لازم يكون تاريخ YYYY-MM-DD");
(doc.sources || []).forEach((s, i) => { if (!s.id || !s.title) err.push("sources[" + i + "] ناقص id أو title"); if (s.url && !/^https:\/\//.test(s.url)) err.push("sources[" + i + "] الرابط لازم https"); src.add(s.id); });
if (!Array.isArray(doc.rows) || doc.rows.length < 10) err.push("rows قليلة أو مفقودة (أقل من 10)، غالبًا التحديث خرّب الملف");
(doc.rows || []).forEach((r, i) => {
  const at = "rows[" + i + "] " + (r.city || "") + "/" + (r.district || "") + "/" + (r.type || "");
  if (!r.city || !r.district) err.push(at + ": المدينة والحي مطلوبة");
  if (!TYPES[r.type]) { err.push(at + ": نوع غير معروف"); return; }
  const [lo, hi] = TYPES[r.type];
  if (!(r.avg >= lo && r.avg <= hi)) err.push(at + ": المتوسط " + r.avg + " خارج المدى المعقول " + lo + "–" + hi);
  if (r.min != null && r.min > r.avg) err.push(at + ": الأدنى أكبر من المتوسط");
  if (r.max != null && r.max < r.avg) err.push(at + ": الأعلى أقل من المتوسط");
  if (!CONF.includes(r.confidence)) err.push(at + ": confidence لازم official أو report أو estimate");
  if (r.confidence !== "estimate" && !(r.sources || []).length) err.push(at + ": الرسمي والتقرير لازم لهم مصدر");
  (r.sources || []).forEach(id => { if (!src.has(id)) err.push(at + ": مصدر غير معرّف " + id); });
  const k = [r.city, r.district, r.type].join("|"); if (seen.has(k)) err.push(at + ": مكرر"); seen.add(k);
});
if (err.length) { console.error("فشل التحقق:\n- " + err.join("\n- ")); process.exit(1); }
const by = {}; doc.rows.forEach(r => by[r.confidence] = (by[r.confidence] || 0) + 1);
console.log("سليم: " + doc.rows.length + " سعر", by);

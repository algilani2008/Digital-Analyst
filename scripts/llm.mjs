/* طبقة مشتركة لنماذج الذكاء الاصطناعي مع البحث في الويب، تستخدمها سكربتات التحديث الأسبوعي.
   المفاتيح أسرار في المستودع: GEMINI_API_KEY و ANTHROPIC_API_KEY و OPENAI_API_KEY. ما تنكتب في الكود أبدًا.
   لو فيه أكثر من مفتاح، كل نموذج يبحث لحاله ونجمع نتائجهم (MODE=all)، أو نستخدم أول واحد شغال (MODE=fallback). */
const ENV = process.env;

export const PROV = {
  gemini: { name: "Gemini", key: ENV.GEMINI_API_KEY, model: ENV.GEMINI_MODEL || "gemini-3.5-flash" },
  claude: { name: "Claude", key: ENV.ANTHROPIC_API_KEY, model: ENV.CLAUDE_MODEL || "claude-sonnet-5-5" },
  openai: { name: "ChatGPT", key: ENV.OPENAI_API_KEY, model: ENV.OPENAI_MODEL || "gpt-6-astra" }
};
export const ORDER = (ENV.RENTS_PROVIDERS || "gemini,claude,openai").split(",").map(s => s.trim()).filter(k => PROV[k] && PROV[k].key);
export const MODE = ENV.RENTS_MODE === "fallback" ? "fallback" : "all";
export const RANKN = ["estimate", "report", "official"];
export const RANK = { estimate: 0, report: 1, official: 2 };
export const today = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10); // توقيت الرياض

export function requireKeys() {
  if (ORDER.length) { console.log("النماذج: " + ORDER.map(k => PROV[k].name + " (" + PROV[k].model + ")").join("، ") + " · الطريقة: " + (MODE === "all" ? "كلها وتتأكد من بعض" : "أول واحد شغال")); return; }
  console.error("ما فيه أي مفتاح. أضف GEMINI_API_KEY أو ANTHROPIC_API_KEY أو OPENAI_API_KEY في Settings > Secrets and variables > Actions.");
  process.exit(1);
}

export const host = u => { try { return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); } catch (e) { return ""; } };
export function parse(text) {
  const m = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!m) throw new Error("ما رجع JSON");
  return JSON.parse(m[1]);
}
/* نقبل رابط المصدر فقط لو موقعه ظهر في نتائج البحث الفعلية لنفس الطلب، عشان ما ينخترع رابط */
function keepReal(data, hosts, block) {
  data.sources = (data.sources || []).filter(s => { const h = host(s.url); return h && !block.some(b => h === b || h.endsWith("." + b)) && [...hosts].some(x => h === x || h.endsWith("." + x) || x.endsWith("." + h)); });
  return data;
}
async function post(url, headers, body, who) {
  const res = await fetch(url, { method: "POST", headers: Object.assign({ "content-type": "application/json" }, headers), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(who + " " + res.status + ": " + (await res.text()).slice(0, 200));
  return res.json();
}

const ASK = {
  async gemini(system, prompt, block) {
    const P = PROV.gemini, out = await post("https://generativelanguage.googleapis.com/v1beta/models/" + P.model + ":generateContent", { "x-goog-api-key": P.key },
      { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], tools: [{ google_search: {} }] }, "Gemini");
    const cand = (out.candidates || [])[0] || {}, gm = cand.groundingMetadata || {}, hosts = new Set();
    (gm.groundingChunks || []).forEach(c => { const t = String((c.web || {}).title || "").toLowerCase().replace(/^www\./, ""); if (t) hosts.add(t); });
    return { data: keepReal(parse(((cand.content || {}).parts || []).map(p => p.text || "").join("\n")), hosts, block), searches: (gm.webSearchQueries || []).length };
  },
  async claude(system, prompt, block) {
    const P = PROV.claude, out = await post("https://api.anthropic.com/v1/messages", { "x-api-key": P.key, "anthropic-version": "2023-06-01" }, {
      model: P.model, max_tokens: 8000, system: system, messages: [{ role: "user", content: prompt }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8, user_location: { type: "approximate", country: "SA", timezone: "Asia/Riyadh" }, blocked_domains: block }] }, "Claude");
    const hosts = new Set();
    (out.content || []).forEach(b => { if (b.type === "web_search_tool_result" && Array.isArray(b.content)) b.content.forEach(r => { const h = host(r.url); if (h) hosts.add(h); }); });
    const text = (out.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
    return { data: keepReal(parse(text), hosts, block), searches: out.usage?.server_tool_use?.web_search_requests || 0 };
  },
  async openai(system, prompt, block) {
    const P = PROV.openai, out = await post("https://api.openai.com/v1/responses", { authorization: "Bearer " + P.key }, {
      model: P.model, instructions: system, input: prompt, include: ["web_search_call.action.sources"],
      tools: [{ type: "web_search", user_location: { type: "approximate", country: "SA", timezone: "Asia/Riyadh" }, filters: { blocked_domains: block } }] }, "ChatGPT");
    const hosts = new Set(); let text = "", n = 0;
    (out.output || []).forEach(it => {
      if (it.type === "web_search_call") { n++; ((it.action || {}).sources || []).forEach(s => { const h = host(s.url); if (h) hosts.add(h); }); }
      if (it.type === "message") (it.content || []).forEach(c => { if (c.type === "output_text") { text += c.text + "\n"; (c.annotations || []).forEach(a => { const h = host(a.url); if (h) hosts.add(h); }); } });
    });
    return { data: keepReal(parse(text), hosts, block), searches: n };
  }
};

/* يسأل كل النماذج المتاحة ويرجّع [{who, data}] مع عدد عمليات البحث */
export async function askAll(system, prompt, block, label) {
  const got = []; let searches = 0;
  for (const who of ORDER) {
    try { const r = await ASK[who](system, prompt, block || []); searches += r.searches; got.push({ who, data: r.data }); if (MODE === "fallback") break; }
    catch (e) { console.error(label + " / " + PROV[who].name + ": " + ((e && e.message) || String(e))); }
  }
  if (!got.length) throw new Error("كل النماذج فشلت");
  return { got, searches };
}

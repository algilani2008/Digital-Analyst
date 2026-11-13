"""يبني ملفات الخريطة في data/geo من بيانات المناطق والمدن والأحياء (مصدرها العنوان الوطني):
https://github.com/homaily/Saudi-Arabia-Regions-Cities-and-Districts  (رخصة GPL-2.0)

الاستخدام:
  git clone --depth 1 https://github.com/homaily/Saudi-Arabia-Regions-Cities-and-Districts.git /tmp/ksa
  pip install shapely
  python3 scripts/build-geo.py /tmp/ksa/json
"""
import json, os, re, sys
from shapely.geometry import Polygon, MultiPolygon, mapping
from shapely.validation import make_valid

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "geo")
os.makedirs(os.path.join(OUT, "d"), exist_ok=True)

# المحافظات حسب المنطقة (أمانة المنطقة تنضاف تلقائيًا من capital_city_id)
GOV = {
    1: "الدرعية الخرج الدوادمي المجمعة القويعية وادي_الدواسر الأفلاج الزلفي شقراء حوطة_بني_تميم عفيف السليل ضرما المزاحمية رماح ثادق حريملاء الحريق الغاط مرات الدلم الرين",
    2: "جدة الطائف القنفذة الليث رابغ خليص الخرمة رنية تربة الجموم الكامل المويه ميسان أضم العرضيات بحرة",
    3: "ينبع العلا المهد الحناكية بدر خيبر العيص وادي_الفرع",
    4: "عنيزة الرس المذنب البكيرية البدائع الأسياح النبهانية الشماسية عيون_الجواء رياض_الخبراء عقلة_الصقور ضرية",
    5: "الأحساء حفر_الباطن الجبيل القطيف الخبر الخفجي رأس_تنورة بقيق النعيرية قرية_العليا العديد",
    6: "خميس_مشيط بيشة النماص محايل سراة_عبيدة تثليث رجال_ألمع أحد_رفيدة ظهران_الجنوب بلقرن المجاردة البرك بارق تنومة طريب الحرجة الأمواه",
    7: "الوجه ضباء تيماء أملج حقل البدع",
    8: "بقعاء الغزالة الشنان الحائط السليمي الشملي موقق سميراء",
    9: "رفحاء طريف العويقيلة",
    10: "صبيا أبو_عريش صامطة الحرث ضمد الريث بيش فرسان الدائر أحد_المسارحة العيدابي العارضة الدرب هروب فيفاء",
    11: "شرورة حبونا بدر_الجنوب يدمة ثار خباش الخرخير",
    12: "بلجرشي المندق المخواة قلوة العقيق القرى بني_حسن غامد_الزناد الحجرة",
    13: "القريات دومة_الجندل طبرجل",
}
# أسماء المحافظات في بيانات العنوان الوطني أحيانًا تختلف
ALIAS = {"الأحساء": ["الهفوف"], "رجال ألمع": ["رجال المع"], "أحد رفيدة": ["احد رفيعة", "احد رفيده"], "محايل": ["محايل عسير"], "بقيق": ["ابقيق"], "أبو عريش": ["ابو عريش"], "أحد المسارحة": ["احد المسارحة"], "عيون الجواء": ["عيون الجواء", "عيون الجوى"], "سراة عبيدة": ["سراة عبيدة", "سراة عبيده"], "فيفاء": ["فيفا"], "العرضيات": ["العرضية الشمالية", "ثريبان"], "قرية العليا": ["قرية"], "أضم": ["اضم"], "المويه": ["المويه الجديد"], "بحرة": ["البحرة", "بحرة المجاهدين"], "المهد": ["مهد الذهب"], "وادي الفرع": ["الفرع"], "ضباء": ["ضبا"], "العويقيلة": ["العويقلية"], "خباش": ["بئر خباش"], "الحرث": ["الخوبة"], "الأفلاج": ["ليلى"]}

def norm(s):
    s = re.sub(r"^(محافظة|مدينة|حي)\s+", "", s.strip())
    s = re.sub("[أإآ]", "ا", s).replace("ى", "ي").replace("ة", "ه").replace("ـ", "")
    return re.sub(r"\s+", " ", s)

def poly(b, tol):
    """boundaries بصيغة [lat,lng] → GeoJSON مبسط بإحداثيات [lng,lat] ودقة 5 خانات"""
    parts = []
    for ring in b:
        if len(ring) < 4: continue
        p = make_valid(Polygon([(x[1], x[0]) for x in ring])).simplify(tol, preserve_topology=True)
        if p.is_empty: continue
        parts.extend(list(p.geoms) if hasattr(p, "geoms") else [p])
    parts = [p for p in parts if isinstance(p, Polygon) and not p.is_empty]
    if not parts: return None
    g = mapping(parts[0] if len(parts) == 1 else MultiPolygon(parts))
    def rnd(c): return [round(c[0], 5), round(c[1], 5)] if isinstance(c[0], (int, float)) else [rnd(x) for x in c]
    return {"type": g["type"], "coordinates": rnd(json.loads(json.dumps(g["coordinates"])))}

regions = json.load(open(os.path.join(SRC, "regions.json")))
cities = json.load(open(os.path.join(SRC, "cities.json")))
districts = json.load(open(os.path.join(SRC, "districts.json")))
dcount = {}
for d in districts: dcount[d["city_id"]] = dcount.get(d["city_id"], 0) + 1
byreg = {}
for c in cities: byreg.setdefault(c["region_id"], []).append(c)

out_r, out_c, miss = [], [], []
for r in regions:
    rid = r["region_id"]
    name = r["name_ar"].replace("منطقة ", "").replace("المنطقة ", "")
    name = {"الشرقية": "المنطقة الشرقية"}.get(name, name)
    out_r.append({"id": rid, "name": name, "c": [round(r["center"][0], 4), round(r["center"][1], 4)], "cap": r["capital_city_id"], "b": poly(r["boundaries"], 0.02)})
    pool = byreg.get(rid, [])
    idx = {}
    for c in pool: idx.setdefault(norm(c["name_ar"]), []).append(c)
    chosen = {}
    cap = next((c for c in pool if c["city_id"] == r["capital_city_id"]), None)
    if cap: chosen[cap["city_id"]] = (cap, "cap", cap["name_ar"])
    for g in GOV[rid].split():
        g = g.replace("_", " ")
        cand = []
        for nm in [g] + ALIAS.get(g, []):
            cand += idx.get(norm(nm), [])
        if not cand: miss.append(name + "/" + g); out_c.append({"id": "g" + str(rid) + "-" + g, "r": rid, "n": g, "k": "gov", "c": None, "d": 0}); continue
        best = max(cand, key=lambda c: dcount.get(c["city_id"], 0))
        if best["city_id"] not in chosen: chosen[best["city_id"]] = (best, "gov", g)
    for c in pool:  # مدن ثانية فيها أحياء
        if dcount.get(c["city_id"]) and c["city_id"] not in chosen: chosen[c["city_id"]] = (c, "city", c["name_ar"])
    for cid, (c, kind, label) in chosen.items():
        out_c.append({"id": cid, "r": rid, "n": label, "k": kind, "c": [round(c["center"][0], 4), round(c["center"][1], 4)], "d": dcount.get(cid, 0)})

# أحياء كل مدينة: ملف لكل مدينة يتحمل وقت الحاجة
by_city = {}
for d in districts: by_city.setdefault(d["city_id"], []).append(d)
total = 0
for cid, ds in by_city.items():
    feats = []
    for d in ds:
        g = poly(d.get("boundaries") or [], 0.0004)
        nm = re.sub(r"^حي\s+", "", d["name_ar"].strip())
        feats.append({"type": "Feature", "properties": {"id": d["district_id"], "n": nm}, "geometry": g})
    s = json.dumps({"type": "FeatureCollection", "features": feats}, ensure_ascii=False, separators=(",", ":"))
    open(os.path.join(OUT, "d", str(cid) + ".json"), "w").write(s); total += len(s)

json.dump({"source": "العنوان الوطني عبر github.com/homaily/Saudi-Arabia-Regions-Cities-and-Districts (GPL-2.0)", "regions": [{k: v for k, v in r.items() if k != "b"} for r in out_r], "cities": out_c},
          open(os.path.join(OUT, "index.json"), "w"), ensure_ascii=False, separators=(",", ":"))
json.dump({"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"id": r["id"], "n": r["name"]}, "geometry": r["b"]} for r in out_r if r["b"]]},
          open(os.path.join(OUT, "regions.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print("مناطق", len(out_r), "مدن/محافظات", len(out_c), "ملفات أحياء", len(by_city), "حجم الأحياء KB", total // 1024)
print("محافظات ما لقيت لها إحداثيات:", miss)

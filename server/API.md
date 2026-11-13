# واجهة الخادم للمرحلة الجاية (Hostinger)

الواجهات الحالية (`login.html` و`admin/` و`portal/`) تشتغل الحين بوضع تجريبي يحفظ في المتصفح. لما يجهز خادم Hostinger:

1. أنشئ قاعدة بيانات MySQL من لوحة Hostinger، وشغّل `server/schema.sql`.
2. ارفع ملفات PHP للمسار `/api` (تُكتب في المرحلة الجاية وفق العقد تحت).
3. في `assets/api.js` غيّر سطرين فقط:
   ```js
   var MODE = "server";
   var BASE_URL = "https://YOUR-DOMAIN/api";
   ```
   وكل الشاشات تشتغل على الخادم بدون أي تعديل ثاني.

## قواعد الأمان على الخادم

- كلمات المرور: `password_hash()` و`password_verify()`، وما تنحفظ ولا تنرجع كنص أبدًا. كلمة المرور المؤقتة للعميل تنرجع مرة وحدة وقت الإصدار.
- الجلسة: توكن عشوائي 32 بايت في كوكي `HttpOnly; Secure; SameSite=Strict`، وفي قاعدة البيانات نحفظ `sha256` له فقط. تنتهي بعد 8 ساعات.
- كل طلب للعميل يتقيد بـ `client_id` من الجلسة، وما يُقبل `client_id` من المتصفح أبدًا.
- محاولات الدخول: 5 محاولات خاطئة لنفس اسم المستخدم أو IP خلال 10 دقائق توقف الدخول 10 دقائق.
- الاستعلامات كلها `PDO` مع `prepare` (بدون دمج نصوص).
- حدود الباقة تنحسب على الخادم من `usage_counts`، وما يُعتمد على المتصفح.
- إنشاء المالك: سكربت `setup.php` يُشغَّل مرة وحدة ثم يُحذف.
- CORS: يسمح فقط لدومين الموقع.

## نقاط الواجهة

كل الردود JSON. الخطأ: `{ "error": "رسالة عربية" }` مع رمز HTTP مناسب.

| الطريقة | المسار | من | المدخلات | المخرجات |
|---|---|---|---|---|
| GET | `/auth/status` | الكل | — | `{ has_owner }` |
| POST | `/auth/login` | الكل | `{ username, password, role }` | `{ session: { uid, role, name, username, client_id, must_change } }` + كوكي الجلسة |
| POST | `/auth/logout` | مسجل | — | `{ ok: true }` |
| POST | `/auth/password` | مسجل | `{ old, new }` (old اختياري لما `must_change`) | `{ ok: true }` |
| GET | `/admin/all` | المالك | — | `{ users, packages, clients, projects, requests, reports, invoices, usage, log }` بدون `pass_hash` |
| POST | `/admin/save` | المالك | `{ entity, data }` | السجل بعد الحفظ |
| POST | `/admin/remove` | المالك | `{ entity, id }` | `{ ok: true }` |
| POST | `/admin/issue-login` | المالك | `{ client_id, username }` | `{ username, password }` مرة وحدة |
| POST | `/admin/user-active` | المالك | `{ client_id, active }` | `{ ok: true }` |
| POST | `/requests/reply` | المالك أو العميل صاحب الطلب | `{ id, text, status? }` | الطلب مع رسائله |
| GET | `/client/mine` | العميل | — | `{ client, package, projects, requests, reports, invoices, usage }` |
| POST | `/client/request` | العميل | `{ title, type, priority, text }` | الطلب الجديد (يرفض لو تعدى حد الباقة) |
| GET | `/client/limits` | العميل | — | `{ pkg, company, limits, used }` للأدوات في الصفحة الرئيسية |
| POST | `/client/usage` | العميل | `{ tool }` | `{ used, limit }` (يرفض لو تعدى الحد) |

`entity` واحد من: `clients`، `packages`، `projects`، `requests`، `reports`، `invoices`.

## شكل البيانات

نفس الحقول المستخدمة في `assets/api.js` (الوضع التجريبي)، ويطابقها `schema.sql`:
- `requests.messages` = صفوف `request_messages` مرتبة بالوقت.
- `projects.stages` = JSON: `[{ name, done, date }]`.
- `packages.limits` = `{ sales, traffic, maint, requests }` و`null` يعني بدون حد.

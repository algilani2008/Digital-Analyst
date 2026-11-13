-- المحلل الرقمي: قاعدة بيانات MySQL للمرحلة الجاية على Hostinger
-- تُنشأ من phpMyAdmin في لوحة Hostinger: افتح قاعدة البيانات ثم Import أو SQL والصق هذا الملف.
-- كلمات المرور تُحفظ بـ password_hash في PHP (bcrypt)، وما تُحفظ كنص أبدًا.

SET NAMES utf8mb4;
SET time_zone = '+03:00';

CREATE TABLE packages (
  id          VARCHAR(20)  PRIMARY KEY,
  name        VARCHAR(40)  NOT NULL,
  price       DECIMAL(12,2) NULL,                 -- NULL = حسب عرض السعر
  period      ENUM('monthly','once') NOT NULL DEFAULT 'monthly',
  lim_sales   INT NULL,                           -- NULL = بدون حد
  lim_traffic INT NULL,
  lim_maint   INT NULL,
  lim_requests INT NULL,
  features    JSON NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE clients (
  id          CHAR(36)     PRIMARY KEY,
  name        VARCHAR(80)  NOT NULL,
  company     VARCHAR(100) NOT NULL,
  phone       VARCHAR(20)  NULL,
  email       VARCHAR(120) NULL,
  city        VARCHAR(40)  NULL,
  package_id  VARCHAR(20)  NOT NULL,
  start_date  DATE NULL,
  end_date    DATE NULL,
  status      ENUM('active','paused','ended') NOT NULL DEFAULT 'active',
  notes       TEXT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_client_pkg FOREIGN KEY (package_id) REFERENCES packages(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id          CHAR(36)     PRIMARY KEY,
  username    VARCHAR(30)  NOT NULL UNIQUE,
  name        VARCHAR(80)  NOT NULL,
  role        ENUM('owner','client') NOT NULL,
  client_id   CHAR(36)     NULL UNIQUE,           -- حساب واحد لكل عميل
  pass_hash   VARCHAR(255) NOT NULL,              -- password_hash()
  must_change TINYINT(1)   NOT NULL DEFAULT 1,
  active      TINYINT(1)   NOT NULL DEFAULT 1,
  last_login  TIMESTAMP NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessions (
  token_hash  CHAR(64)     PRIMARY KEY,           -- sha256 للتوكن، والتوكن نفسه في كوكي HttpOnly
  user_id     CHAR(36)     NOT NULL,
  expires_at  TIMESTAMP    NOT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sess_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE login_attempts (
  username    VARCHAR(30) NOT NULL,
  ip          VARCHAR(45) NOT NULL,
  at          TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (username, at), INDEX (ip, at)
) ENGINE=InnoDB;

CREATE TABLE projects (
  id          CHAR(36)     PRIMARY KEY,
  client_id   CHAR(36)     NOT NULL,
  title       VARCHAR(120) NOT NULL,
  status      ENUM('active','done') NOT NULL DEFAULT 'active',
  start_date  DATE NULL,
  due_date    DATE NULL,
  stages      JSON NOT NULL,                      -- [{name, done, date}]
  CONSTRAINT fk_proj_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE requests (
  id          CHAR(36)     PRIMARY KEY,
  no          INT          NOT NULL AUTO_INCREMENT UNIQUE,
  client_id   CHAR(36)     NOT NULL,
  title       VARCHAR(160) NOT NULL,
  type        VARCHAR(20)  NOT NULL,
  priority    VARCHAR(10)  NOT NULL,
  status      ENUM('جديد','قيد التنفيذ','بانتظار العميل','مغلق') NOT NULL DEFAULT 'جديد',
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_req_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=100 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE request_messages (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  request_id  CHAR(36)  NOT NULL,
  sender      ENUM('client','owner') NOT NULL,
  body        TEXT      NOT NULL,
  at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_req FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reports (
  id          CHAR(36)     PRIMARY KEY,
  client_id   CHAR(36)     NOT NULL,
  title       VARCHAR(140) NOT NULL,
  kind        VARCHAR(20)  NOT NULL,
  url         VARCHAR(500) NULL,                  -- https فقط
  note        TEXT NULL,
  period      CHAR(7) NULL,
  published   DATE NOT NULL,
  CONSTRAINT fk_rep_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE invoices (
  id          CHAR(36)     PRIMARY KEY,
  no          INT          NOT NULL AUTO_INCREMENT UNIQUE,
  client_id   CHAR(36)     NOT NULL,
  description VARCHAR(160) NOT NULL,
  amount      DECIMAL(12,2) NOT NULL,
  vat         DECIMAL(12,2) NOT NULL DEFAULT 0,
  total       DECIMAL(12,2) NOT NULL,
  issued      DATE NOT NULL,
  due         DATE NOT NULL,
  status      ENUM('مستحقة','مدفوعة','ملغاة') NOT NULL DEFAULT 'مستحقة',
  paid_at     DATE NULL,
  CONSTRAINT fk_inv_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1000 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usage_counts (
  client_id   CHAR(36)    NOT NULL,
  tool        ENUM('sales','traffic','maint','requests') NOT NULL,
  month       CHAR(7)     NOT NULL,               -- 2026-11
  count       INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (client_id, tool, month),
  CONSTRAINT fk_use_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE activity_log (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  who         VARCHAR(100) NOT NULL,
  action      VARCHAR(300) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO packages (id, name, price, period, lim_sales, lim_traffic, lim_maint, lim_requests, features) VALUES
 ('free',   'التجربة المجانية', 0,    'once',    1,    1,    3,    1,    JSON_ARRAY('تجربة الأدوات على بياناتك','استشارة أولى')),
 ('start',  'الانطلاقة',        NULL, 'once',    5,    5,    20,   5,    JSON_ARRAY('موقع تعريفي حتى 5 صفحات','نموذج تواصل وربط واتساب','إعداد Google Analytics 4')),
 ('growth', 'النمو',            NULL, 'monthly', 30,   30,   100,  20,   JSON_ARRAY('كل ما في الانطلاقة','لوحة مؤشرات أداء','تتبع مصادر العملاء والإعلانات','تقرير شهري بالتوصيات')),
 ('pro',    'المتكامل',         NULL, 'monthly', NULL, NULL, NULL, NULL, JSON_ARRAY('وثيقة متطلبات النظام','مخططات سير العمل وقاعدة البيانات','واجهات وصلاحيات','لوحة إدارية لمتابعة الأداء'));
-- حساب المالك يُنشأ مرة وحدة بسكربت setup.php يحذف نفسه بعد التشغيل (انظر API.md).

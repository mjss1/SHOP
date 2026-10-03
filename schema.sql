-- ==========================================
-- Cloudflare D1 边缘数据库建表结构
-- ==========================================

-- 1. 商品分类表
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  badge TEXT,
  description TEXT,
  features TEXT,
  icon TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. 邮箱卡密库存池
CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  account TEXT NOT NULL,
  password TEXT NOT NULL,
  recovery_email TEXT,
  notes TEXT,
  status TEXT DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'SOLD', 'FROZEN'
  order_id TEXT,
  sold_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 3. 订单交易记录表
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_amount REAL NOT NULL,
  contact_email TEXT,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'PAID',
  fp_hash TEXT,
  client_ip TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. 客户设备指纹审计表
CREATE TABLE IF NOT EXISTS fingerprints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT,
  fp_hash TEXT NOT NULL,
  client_ip TEXT,
  user_agent TEXT,
  screen TEXT,
  timezone TEXT,
  platform TEXT,
  language TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(product_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_fp ON orders(fp_hash);
CREATE INDEX IF NOT EXISTS idx_fingerprints_hash ON fingerprints(fp_hash);

-- ==========================================
-- 初始种子商品数据预填充
-- ==========================================
INSERT OR IGNORE INTO products (id, name, category, price, badge, icon, description, features) VALUES
('prod-gmail-aged', 'Gmail 纯手工精养高权重老号 (2021-2023)', 'Google 全家桶', 18.50, '热销爆款', '📬', '独立原生干净住宅 IP 注册，带辅助邮箱，已开启 POP3/IMAP 支持，稳定抗封，适合海外业务与各类社媒绑定。', '["2-3 年真实老号权重", "含辅助邮箱与二次验证密钥", "支持绑定自己手机号", "自动发货秒到手"]'),
('prod-outlook-clean', 'Microsoft Outlook / Hotmail 纯净个人号', '微软系列', 3.80, '超高性价比', '📨', '全协议支持(SMTP/IMAP/POP)，适合接收各类注册验证码，不限调用，随时可改绑密码。', '["永久有效不过期", "支持一键批量提取", "可用于注册各大主流网站", "24H 售后保障"]'),
('prod-proton-privacy', 'ProtonMail 瑞士端到端隐私加密邮箱', '隐私加密', 26.00, '极客推荐', '🛡️', '瑞士零知识加密架构，免绑定手机号，端到端高强度防追踪，极客与隐私敏感者的首选。', '["瑞士最高隐私法保护", "默认 PGP 零知识加密", "无日志零留痕", "匿名收发信件"]'),
('prod-edu-student', 'EDU 全球知名高校教育身份邮箱 (.edu)', '教育认证', 45.00, '限量特供', '🎓', '尊享学生特权认证资格，可申请 GitHub Student Pack、Notion AI、JetBrains、Apple Music 学生优惠等。', '["包含完整 Webmail 网页入口", "支持各大开发者学生权益包", "附带专属激活教程", "一号一密独立独享"]');

-- 初始模拟库存卡密
INSERT OR IGNORE INTO cards (product_id, account, password, recovery_email, notes) VALUES
('prod-gmail-aged', 'alex.stone.work2021@gmail.com', 'Gm#89xa!2026', 'rec_alex@outlook.com', '2022年老号/纯手工'),
('prod-gmail-aged', 'elena.rostova.work2022@gmail.com', 'Gm#k81z!2026', 'rec_elena@outlook.com', '2022年老号/纯手工'),
('prod-gmail-aged', 'kevin.tech.work2023@gmail.com', 'Gm#m92p!2026', 'rec_kevin@outlook.com', '2023年老号/已开POP3'),
('prod-gmail-aged', 'sophia.chen.work2021@gmail.com', 'Gm#q17x!2026', 'rec_sophia@outlook.com', '2021年老号/纯手工'),
('prod-gmail-aged', 'marcus.vance.work2022@gmail.com', 'Gm#c48w!2026', 'rec_marcus@outlook.com', '2022年老号/纯手工'),
('prod-outlook-clean', 'alex.stone.cloud100@outlook.com', 'Ms*92fa@9', 'rec_ms_alex@gmail.com', '微软官方纯净号'),
('prod-outlook-clean', 'elena.cloud101@outlook.com', 'Ms*41kx@9', 'rec_ms_elena@gmail.com', '微软官方纯净号'),
('prod-outlook-clean', 'kevin.cloud102@outlook.com', 'Ms*88pz@9', 'rec_ms_kevin@gmail.com', '微软官方纯净号'),
('prod-outlook-clean', 'sophia.cloud103@outlook.com', 'Ms*13qw@9', 'rec_ms_sophia@gmail.com', '微软官方纯净号'),
('prod-outlook-clean', 'chloe.cloud104@outlook.com', 'Ms*76ba@9', 'rec_ms_chloe@gmail.com', '微软官方纯净号'),
('prod-proton-privacy', 'alex.vault0@proton.me', 'Pr!9128#ch', NULL, '瑞士高防/免手机绑定'),
('prod-proton-privacy', 'elena.vault1@proton.me', 'Pr!4821#ch', NULL, '瑞士高防/免手机绑定'),
('prod-proton-privacy', 'kevin.vault2@proton.me', 'Pr!6639#ch', NULL, '瑞士高防/免手机绑定'),
('prod-proton-privacy', 'sophia.vault3@proton.me', 'Pr!1290#ch', NULL, '瑞士高防/免手机绑定'),
('prod-edu-student', 'alex.stu0@stanford.alumni.edu', 'Edu*8891!St', 'rec_edu_alex@yahoo.com', '斯坦福校友/学生权益包'),
('prod-edu-student', 'elena.stu1@stanford.alumni.edu', 'Edu*4472!St', 'rec_edu_elena@yahoo.com', '斯坦福校友/学生权益包'),
('prod-edu-student', 'kevin.stu2@stanford.alumni.edu', 'Edu*5183!St', 'rec_edu_kevin@yahoo.com', '斯坦福校友/学生权益包');

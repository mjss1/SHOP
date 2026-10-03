const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 确保数据目录存在
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 初始化 SQLite 数据库
const DB_PATH = path.join(DATA_DIR, 'shop.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL'); // 开启 WAL 模式提升并发读写吞吐

// 创建数据库表结构
db.exec(`
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
`);

// 种子数据预填充 (如果产品表为空)
function seedDatabase() {
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (productCount > 0) return;

  console.log('📦 正在初始化默认商品与模拟邮箱库存数据...');

  const initialProducts = [
    {
      id: 'prod-gmail-aged',
      name: 'Gmail 纯手工精养高权重老号 (2021-2023)',
      category: 'Google 全家桶',
      price: 18.50,
      badge: '热销爆款',
      icon: '📬',
      description: '独立原生干净住宅 IP 注册，带辅助邮箱，已开启 POP3/IMAP 支持，稳定抗封，适合海外业务与各类社媒绑定。',
      features: JSON.stringify(['2-3 年真实老号权重', '含辅助邮箱与二次验证密钥', '支持绑定自己手机号', '自动发货秒到手'])
    },
    {
      id: 'prod-outlook-clean',
      name: 'Microsoft Outlook / Hotmail 纯净个人号',
      category: '微软系列',
      price: 3.80,
      badge: '超高性价比',
      icon: '📨',
      description: '全协议支持(SMTP/IMAP/POP)，适合接收各类注册验证码，不限调用，随时可改绑密码。',
      features: JSON.stringify(['永久有效不过期', '支持一键批量提取', '可用于注册各大主流网站', '24H 售后保障'])
    },
    {
      id: 'prod-proton-privacy',
      name: 'ProtonMail 瑞士端到端隐私加密邮箱',
      category: '隐私加密',
      price: 26.00,
      badge: '极客推荐',
      icon: '🛡️',
      description: '瑞士零知识加密架构，免绑定手机号，端到端高强度防追踪，极客与隐私敏感者的首选。',
      features: JSON.stringify(['瑞士最高隐私法保护', '默认 PGP 零知识加密', '无日志零留痕', '匿名收发信件'])
    },
    {
      id: 'prod-edu-student',
      name: 'EDU 全球知名高校教育身份邮箱 (.edu)',
      category: '教育认证',
      price: 45.00,
      badge: '限量特供',
      icon: '🎓',
      description: '尊享学生特权认证资格，可申请 GitHub Student Pack、Notion AI、JetBrains、Apple Music 学生优惠等。',
      features: JSON.stringify(['包含完整 Webmail 网页入口', '支持各大开发者学生权益包', '附带专属激活教程', '一号一密独立独享'])
    }
  ];

  const insertProdStmt = db.prepare(`
    INSERT INTO products (id, name, category, price, badge, icon, description, features)
    VALUES (@id, @name, @category, @price, @badge, @icon, @description, @features)
  `);

  for (const prod of initialProducts) {
    insertProdStmt.run(prod);
  }

  // 批量生成初始模拟库存卡密 (每个商品生成 15-20 个)
  const insertCardStmt = db.prepare(`
    INSERT INTO cards (product_id, account, password, recovery_email, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  const mockUsers = ['alex.stone', 'elena.rostova', 'kevin.tech', 'sophia.chen', 'marcus.vance', 'chloe.dev', 'daniel.kim', 'rachel.adams', 'lucas.wright', 'olivia.miller', 'hannah.scott', 'felix.novak', 'zoe.carter', 'julian.brooks', 'nathan.drake'];

  // Gmail 库存
  mockUsers.forEach((u, i) => {
    insertCardStmt.run(
      'prod-gmail-aged',
      `${u}.work${2021 + (i % 3)}@gmail.com`,
      `Gm#${Math.random().toString(36).substring(2, 8)}!2026`,
      `rec_${u}@outlook.com`,
      '2022年注册 / 纯净手工 / 开启IMAP'
    );
  });

  // Outlook 库存
  mockUsers.forEach((u, i) => {
    insertCardStmt.run(
      'prod-outlook-clean',
      `${u}.cloud${100 + i}@outlook.com`,
      `Ms*${Math.random().toString(36).substring(2, 8)}@9`,
      `rec_ms_${u}@gmail.com`,
      '微软官方纯净号 / 随时改绑'
    );
  });

  // ProtonMail 库存
  mockUsers.slice(0, 12).forEach((u, i) => {
    insertCardStmt.run(
      'prod-proton-privacy',
      `${u}.vault${i}@proton.me`,
      `Pr!${Math.random().toString(36).substring(2, 8)}#ch`,
      null,
      '瑞士高防 / 零手机绑定'
    );
  });

  // EDU 库存
  mockUsers.slice(0, 10).forEach((u, i) => {
    insertCardStmt.run(
      'prod-edu-student',
      `${u}.stu${i}@stanford.alumni.edu`,
      `Edu*${Math.random().toString(36).substring(2, 8)}!St`,
      `rec_edu_${u}@yahoo.com`,
      '斯坦福校友邮箱 / 开发者学生包认证'
    );
  });

  console.log('✅ 默认商品与 50+ 条邮箱库存卡密初始化完毕！');
}

seedDatabase();

// 辅助函数：从请求中提取客户端真实 IP
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['cf-connecting-ip'] || req.socket.remoteAddress || '127.0.0.1';
}

// ==========================================
// API 路由
// ==========================================

// 1. 获取商品列表与实时库存
app.get('/api/products', (req, res) => {
  try {
    const products = db.prepare(`
      SELECT p.*,
        COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) as stock,
        COUNT(CASE WHEN c.status = 'SOLD' THEN 1 END) as sold_count
      FROM products p
      LEFT JOIN cards c ON p.id = c.product_id
      GROUP BY p.id
      ORDER BY p.price ASC
    `).all();

    const formatted = products.map(p => ({
      ...p,
      features: JSON.parse(p.features || '[]')
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. 下单购买 & 自动发卡 (事务性扣减库存 + 记录用户指纹)
app.post('/api/orders/create', (req, res) => {
  try {
    const { productId, quantity = 1, contactEmail = '', paymentMethod = 'sandbox', fingerprint = {} } = req.body;
    const qty = parseInt(quantity, 10);

    if (!productId || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ success: false, message: '请提供正确的商品 ID 与购买数量' });
    }

    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    // 使用 better-sqlite3 独占事务保证高并发下防超卖
    const purchaseTx = db.transaction(() => {
      // 1. 查询商品是否存在
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      if (!product) {
        throw new Error('未找到对应商品');
      }

      // 2. 检查可用库存
      const availableCards = db.prepare(`
        SELECT id, account, password, recovery_email, notes
        FROM cards
        WHERE product_id = ? AND status = 'AVAILABLE'
        ORDER BY id ASC
        LIMIT ?
      `).all(productId, qty);

      if (availableCards.length < qty) {
        throw new Error(`库存不足！当前仅剩 ${availableCards.length} 件`);
      }

      // 3. 生成全局唯一订单号
      const orderId = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
      const totalAmount = Number((product.price * qty).toFixed(2));
      const cardIds = availableCards.map(c => c.id);

      // 4. 原子性变更卡密状态为已售
      const updateCard = db.prepare(`
        UPDATE cards
        SET status = 'SOLD', order_id = ?, sold_at = datetime('now')
        WHERE id = ?
      `);
      for (const card of availableCards) {
        updateCard.run(orderId, card.id);
      }

      // 5. 写入订单主表
      const fpHash = fingerprint.fpHash || 'FP_ANONYMOUS';
      db.prepare(`
        INSERT INTO orders (
          id, product_id, product_name, quantity, unit_price, total_amount,
          contact_email, payment_method, payment_status, fp_hash, client_ip, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?)
      `).run(
        orderId, product.id, product.name, qty, product.price, totalAmount,
        contactEmail, paymentMethod, fpHash, clientIp, userAgent
      );

      // 6. 沉淀用户设备环境指纹 (用于售后追溯与一键找回)
      if (fingerprint && fingerprint.fpHash) {
        db.prepare(`
          INSERT INTO fingerprints (
            order_id, fp_hash, client_ip, user_agent, screen, timezone, platform, language
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          orderId,
          fingerprint.fpHash,
          clientIp,
          userAgent,
          fingerprint.screen || '',
          fingerprint.timezone || '',
          fingerprint.platform || '',
          fingerprint.language || ''
        );
      }

      return {
        orderId,
        productName: product.name,
        quantity: qty,
        unitPrice: product.price,
        totalAmount,
        contactEmail,
        createdAt: new Date().toISOString(),
        cards: availableCards.map(c => ({
          account: c.account,
          password: c.password,
          recoveryEmail: c.recovery_email,
          notes: c.notes
        }))
      };
    });

    const result = purchaseTx();
    res.json({ success: true, data: result, message: '支付成功，商品已自动派发！' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// 3. 售后查询订单 (支持通过订单号、联系邮箱 或 浏览器设备指纹智能找回)
app.post('/api/orders/query', (req, res) => {
  try {
    const { orderId, contactEmail, fpHash } = req.body;

    let orders = [];

    if (orderId && orderId.trim()) {
      orders = db.prepare('SELECT * FROM orders WHERE id = ? ORDER BY created_at DESC').all(orderId.trim());
    } else if (contactEmail && contactEmail.trim()) {
      orders = db.prepare('SELECT * FROM orders WHERE contact_email = ? ORDER BY created_at DESC LIMIT 20').all(contactEmail.trim());
    } else if (fpHash && fpHash.trim()) {
      // 智能指纹识别查询：直接提取当前设备购买过的全部历史记录
      orders = db.prepare('SELECT * FROM orders WHERE fp_hash = ? ORDER BY created_at DESC LIMIT 30').all(fpHash.trim());
    } else {
      return res.status(400).json({ success: false, message: '请提供订单号、联系邮箱或设备指纹以检索订单' });
    }

    if (orders.length === 0) {
      return res.json({ success: true, data: [], message: '未查找到任何匹配的订单记录' });
    }

    // 查询每个订单关联的已售卡密
    const getCardsForOrder = db.prepare(`
      SELECT account, password, recovery_email, notes, sold_at
      FROM cards
      WHERE order_id = ?
    `);

    const result = orders.map(order => ({
      ...order,
      cards: getCardsForOrder.all(order.id)
    }));

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. 管理后台：获取总体营业概况与统计看板
app.get('/api/admin/overview', (req, res) => {
  try {
    const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = 'PAID'").get().total;
    const totalOrders = db.prepare('SELECT COUNT(*) as total FROM orders').get().total;
    const availableStock = db.prepare("SELECT COUNT(*) as total FROM cards WHERE status = 'AVAILABLE'").get().total;
    const soldStock = db.prepare("SELECT COUNT(*) as total FROM cards WHERE status = 'SOLD'").get().total;

    const recentOrders = db.prepare(`
      SELECT o.*, 
        (SELECT COUNT(*) FROM cards c WHERE c.order_id = o.id) as card_count
      FROM orders o
      ORDER BY o.created_at DESC
      LIMIT 10
    `).all();

    res.json({
      success: true,
      data: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders,
        availableStock,
        soldStock,
        recentOrders
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. 管理后台：按条件筛选卡密列表 (库存 / 已售)
app.get('/api/admin/cards', (req, res) => {
  try {
    const { productId, status = 'ALL', limit = 50 } = req.query;
    let query = 'SELECT c.*, p.name as product_name FROM cards c LEFT JOIN products p ON c.product_id = p.id WHERE 1=1';
    const params = [];

    if (productId && productId !== 'ALL') {
      query += ' AND c.product_id = ?';
      params.push(productId);
    }
    if (status && status !== 'ALL') {
      query += ' AND c.status = ?';
      params.push(status);
    }

    query += ' ORDER BY c.id DESC LIMIT ?';
    params.push(parseInt(limit, 10) || 50);

    const cards = db.prepare(query).all(...params);
    res.json({ success: true, data: cards });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. 管理后台：批量导入邮箱卡密库存
app.post('/api/admin/cards/import', (req, res) => {
  try {
    const { productId, rawCardsText } = req.body;

    if (!productId || !rawCardsText || !rawCardsText.trim()) {
      return res.status(400).json({ success: false, message: '请选择对应商品并输入卡密内容' });
    }

    const lines = rawCardsText.trim().split('\n');
    let importedCount = 0;

    const insertStmt = db.prepare(`
      INSERT INTO cards (product_id, account, password, recovery_email, notes)
      VALUES (?, ?, ?, ?, ?)
    `);

    const importTx = db.transaction(() => {
      for (const line of lines) {
        const clean = line.trim();
        if (!clean) continue;

        // 支持常见的分隔符：---- 或 ---- 或制表符或逗号或空格
        let parts = [];
        if (clean.includes('----')) {
          parts = clean.split('----');
        } else if (clean.includes('|')) {
          parts = clean.split('|');
        } else if (clean.includes(':')) {
          parts = clean.split(':');
        } else if (clean.includes(' ')) {
          parts = clean.split(/\s+/);
        } else {
          parts = [clean];
        }

        const account = (parts[0] || '').trim();
        const password = (parts[1] || 'DefaultPass123!').trim();
        const recovery = (parts[2] || '').trim() || null;
        const notes = (parts[3] || '后台批量导入').trim();

        if (account) {
          insertStmt.run(productId, account, password, recovery, notes);
          importedCount++;
        }
      }
    });

    importTx();
    res.json({ success: true, message: `成功导入 ${importedCount} 条邮箱卡密！`, count: importedCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. 管理后台：用户设备指纹记录追踪审计
app.get('/api/admin/fingerprints', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT f.*, o.product_name, o.total_amount
      FROM fingerprints f
      LEFT JOIN orders o ON f.order_id = o.id
      ORDER BY f.created_at DESC
      LIMIT 30
    `).all();

    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 启动监听
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 个人自动化交易商城 (发卡系统) 已启动`);
  console.log(`📡 监听地址: http://localhost:${PORT}`);
  console.log(`💾 数据库位置: ${DB_PATH}`);
  console.log(`=========================================`);
});

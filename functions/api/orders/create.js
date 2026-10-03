export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB || env.shop_db;

  try {
    const body = await request.json();
    const { productId, quantity = 1, contactEmail = '', paymentMethod = 'sandbox', fingerprint = {} } = body;
    const qty = parseInt(quantity, 10);

    if (!productId || isNaN(qty) || qty <= 0) {
      return Response.json({ success: false, message: '请提供正确的商品 ID 与购买数量' }, { status: 400 });
    }

    // 提取 Cloudflare 原生注入的客户端出口真实 IP
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || '';

    // 1. 查询商品是否存在
    const product = await db.prepare('SELECT * FROM products WHERE id = ?').bind(productId).first();
    if (!product) {
      return Response.json({ success: false, message: '未找到对应商品' }, { status: 404 });
    }

    // 2. 检查可用库存
    const { results: availableCards } = await db.prepare(`
      SELECT id, account, password, recovery_email, notes
      FROM cards
      WHERE product_id = ? AND status = 'AVAILABLE'
      ORDER BY id ASC
      LIMIT ?
    `).bind(productId, qty).all();

    if (!availableCards || availableCards.length < qty) {
      const remaining = availableCards ? availableCards.length : 0;
      return Response.json({ success: false, message: `库存不足！当前仅剩 ${remaining} 件` }, { status: 400 });
    }

    // 3. 生成订单号与金额
    const orderId = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const totalAmount = Number((product.price * qty).toFixed(2));
    const fpHash = fingerprint?.fpHash || 'FP_ANONYMOUS';

    // 4. 构建 D1 Batch 原子事务执行队列
    const batchStatements = [];

    // 卡密出库语句
    for (const card of availableCards) {
      batchStatements.push(
        db.prepare(`
          UPDATE cards
          SET status = 'SOLD', order_id = ?, sold_at = datetime('now')
          WHERE id = ? AND status = 'AVAILABLE'
        `).bind(orderId, card.id)
      );
    }

    // 订单入库语句
    batchStatements.push(
      db.prepare(`
        INSERT INTO orders (
          id, product_id, product_name, quantity, unit_price, total_amount,
          contact_email, payment_method, payment_status, fp_hash, client_ip, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?)
      `).bind(
        orderId, product.id, product.name, qty, product.price, totalAmount,
        contactEmail, paymentMethod, fpHash, clientIp, userAgent
      )
    );

    // 用户设备指纹沉淀语句
    if (fingerprint && fingerprint.fpHash) {
      batchStatements.push(
        db.prepare(`
          INSERT INTO fingerprints (
            order_id, fp_hash, client_ip, user_agent, screen, timezone, platform, language
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          orderId,
          fingerprint.fpHash,
          clientIp,
          userAgent,
          fingerprint.screen || '',
          fingerprint.timezone || '',
          fingerprint.platform || '',
          fingerprint.language || ''
        )
      );
    }

    // 原子性提交执行
    await db.batch(batchStatements);

    return Response.json({
      success: true,
      message: '支付成功，商品已自动派发！',
      data: {
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
      }
    });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

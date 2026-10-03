export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB || env.shop_db;

  try {
    const body = await request.json();
    const { orderId, contactEmail, fpHash } = body;

    let orders = [];

    if (orderId && orderId.trim()) {
      const res = await db.prepare('SELECT * FROM orders WHERE id = ? ORDER BY created_at DESC').bind(orderId.trim()).all();
      orders = res.results || [];
    } else if (contactEmail && contactEmail.trim()) {
      const res = await db.prepare('SELECT * FROM orders WHERE contact_email = ? ORDER BY created_at DESC LIMIT 20').bind(contactEmail.trim()).all();
      orders = res.results || [];
    } else if (fpHash && fpHash.trim()) {
      // 智能指纹检索：调取该设备环境特征所产生的全部订单
      const res = await db.prepare('SELECT * FROM orders WHERE fp_hash = ? ORDER BY created_at DESC LIMIT 30').bind(fpHash.trim()).all();
      orders = res.results || [];
    } else {
      return Response.json({ success: false, message: '请提供订单号、联系邮箱或设备指纹以检索订单' }, { status: 400 });
    }

    if (orders.length === 0) {
      return Response.json({ success: true, data: [], message: '未查找到任何匹配的订单记录' });
    }

    // 批量查询关联已售卡密
    const result = [];
    for (const order of orders) {
      const { results: cards } = await db.prepare(`
        SELECT account, password, recovery_email, notes, sold_at
        FROM cards
        WHERE order_id = ?
      `).bind(order.id).all();

      result.push({
        ...order,
        cards: cards || []
      });
    }

    return Response.json({ success: true, data: result });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

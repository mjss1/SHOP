export async function onRequestPost(context) {
  const { request, env } = context;
  const db = env.DB || env.shop_db;

  try {
    const body = await request.json();
    const { productId, rawCardsText } = body;

    if (!productId || !rawCardsText || !rawCardsText.trim()) {
      return Response.json({ success: false, message: '请选择对应商品并输入卡密内容' }, { status: 400 });
    }

    const lines = rawCardsText.trim().split('\n');
    const statements = [];

    for (const line of lines) {
      const clean = line.trim();
      if (!clean) continue;

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
      const notes = (parts[3] || 'Cloudflare D1 后台批量入库').trim();

      if (account) {
        statements.push(
          db.prepare(`
            INSERT INTO cards (product_id, account, password, recovery_email, notes)
            VALUES (?, ?, ?, ?, ?)
          `).bind(productId, account, password, recovery, notes)
        );
      }
    }

    if (statements.length > 0) {
      await db.batch(statements);
    }

    return Response.json({
      success: true,
      message: `成功通过 Cloudflare D1 事务入库 ${statements.length} 条邮箱卡密！`,
      count: statements.length
    });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

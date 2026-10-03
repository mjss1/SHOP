export async function onRequestGet(context) {
  const { env } = context;
  const db = env.DB || env.shop_db;

  try {
    const revRow = await db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = 'PAID'").first();
    const ordRow = await db.prepare("SELECT COUNT(*) as total FROM orders").first();
    const availRow = await db.prepare("SELECT COUNT(*) as total FROM cards WHERE status = 'AVAILABLE'").first();
    const soldRow = await db.prepare("SELECT COUNT(*) as total FROM cards WHERE status = 'SOLD'").first();

    const { results: recentOrders } = await db.prepare(`
      SELECT o.*, 
        (SELECT COUNT(*) FROM cards c WHERE c.order_id = o.id) as card_count
      FROM orders o
      ORDER BY o.created_at DESC
      LIMIT 10
    `).all();

    return Response.json({
      success: true,
      data: {
        totalRevenue: Number((revRow?.total || 0).toFixed(2)),
        totalOrders: ordRow?.total || 0,
        availableStock: availRow?.total || 0,
        soldStock: soldRow?.total || 0,
        recentOrders: recentOrders || []
      }
    });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

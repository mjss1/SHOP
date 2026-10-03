export async function onRequestGet(context) {
  const { env } = context;
  const db = env.DB || env.shop_db;

  try {
    const { results } = await db.prepare(`
      SELECT f.*, o.product_name, o.total_amount
      FROM fingerprints f
      LEFT JOIN orders o ON f.order_id = o.id
      ORDER BY f.created_at DESC
      LIMIT 30
    `).all();

    return Response.json({ success: true, data: results || [] });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

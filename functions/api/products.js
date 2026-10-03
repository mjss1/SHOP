export async function onRequestGet(context) {
  const { env } = context;
  const db = env.DB || env.shop_db;

  try {
    const query = `
      SELECT p.*,
        COUNT(CASE WHEN c.status = 'AVAILABLE' THEN 1 END) as stock,
        COUNT(CASE WHEN c.status = 'SOLD' THEN 1 END) as sold_count
      FROM products p
      LEFT JOIN cards c ON p.id = c.product_id
      GROUP BY p.id
      ORDER BY p.price ASC
    `;

    const { results } = await db.prepare(query).all();

    const formatted = results.map(p => ({
      ...p,
      features: JSON.parse(p.features || '[]')
    }));

    return Response.json({ success: true, data: formatted });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

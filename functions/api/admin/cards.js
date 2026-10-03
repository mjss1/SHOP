export async function onRequestGet(context) {
  const { request, env } = context;
  const db = env.DB || env.shop_db;

  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId');
    const status = url.searchParams.get('status') || 'ALL';
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

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
    params.push(limit);

    const { results } = await db.prepare(query).bind(...params).all();
    return Response.json({ success: true, data: results || [] });
  } catch (err) {
    return Response.json({ success: false, message: err.message }, { status: 500 });
  }
}

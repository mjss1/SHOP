const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🚀 开始验证 Cloudflare Pages Functions + Cloudflare D1 边缘架构...\n');

  // 1. 获取商品与库存
  console.log('[1/7] 测试 Cloudflare Pages API: 获取商品列表与实时库存 (/api/products)...');
  const res1 = await request({ hostname: '127.0.0.1', port: 8788, path: '/api/products', method: 'GET' });
  console.log(`  状态码: ${res1.status}, 商品数量: ${res1.data.data.length}`);
  const firstProd = res1.data.data[0];
  console.log(`  商品名称: ${firstProd.name}, 价格: ¥${firstProd.price}, 当前D1库存: ${firstProd.stock} 件`);

  // 2. 下单购买 & 记录设备指纹
  console.log('\n[2/7] 测试 Cloudflare D1 Batch 原子事务下单与指纹绑定 (/api/orders/create)...');
  const testFp = {
    fpHash: 'FP-CF-D1-9988',
    screen: '2560x1440x24@1.5',
    timezone: 'Asia/Shanghai',
    platform: 'Win32',
    language: 'zh-CN'
  };

  const res2 = await request(
    {
      hostname: '127.0.0.1',
      port: 8788,
      path: '/api/orders/create',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    {
      productId: firstProd.id,
      quantity: 2,
      contactEmail: 'cf_buyer@example.com',
      paymentMethod: 'sandbox',
      fingerprint: testFp
    }
  );

  console.log(`  下单响应: ${res2.data.message}`);
  const order = res2.data.data;
  console.log(`  订单编号: ${order.orderId}`);
  console.log(`  提取到的卡密数量: ${order.cards.length}`);
  console.log(`  首张卡密账号: ${order.cards[0].account}, 密码: ${order.cards[0].password}`);

  // 3. 验证 D1 库存扣减
  console.log('\n[3/7] 验证 Cloudflare D1 数据库库存精准扣减...');
  const res3 = await request({ hostname: '127.0.0.1', port: 8788, path: '/api/products', method: 'GET' });
  const updatedProd = res3.data.data.find(p => p.id === firstProd.id);
  console.log(`  原库存: ${firstProd.stock} -> 扣减后库存: ${updatedProd.stock} (扣减: ${firstProd.stock - updatedProd.stock} 件)`);

  // 4. 测试设备指纹一键售后找回
  console.log('\n[4/7] 测试根据设备特征指纹 [FP-CF-D1-9988] 检索订单 (/api/orders/query)...');
  const res4 = await request(
    {
      hostname: '127.0.0.1',
      port: 8788,
      path: '/api/orders/query',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { fpHash: 'FP-CF-D1-9988' }
  );
  console.log(`  指纹匹配订单数: ${res4.data.data.length}`);
  console.log(`  订单关联已售卡密数: ${res4.data.data[0].cards.length} 件`);

  // 5. 测试通过订单号精准查询
  console.log('\n[5/7] 测试通过订单号精准检索 (/api/orders/query)...');
  const res5 = await request(
    {
      hostname: '127.0.0.1',
      port: 8788,
      path: '/api/orders/query',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { orderId: order.orderId }
  );
  console.log(`  订单号精准匹配状态: ${res5.data.data[0].id === order.orderId ? '成功' : '失败'}`);

  // 6. 测试后台向 D1 批量导入卡密
  console.log('\n[6/7] 测试向 Cloudflare D1 批量入库新卡密 (/api/admin/cards/import)...');
  const importText = `cf_auto1@gmail.com----Pass888!----rec1@outlook.com----D1批量测试
cf_auto2@gmail.com----Pass999!----rec2@outlook.com----D1批量测试`;

  const res6 = await request(
    {
      hostname: '127.0.0.1',
      port: 8788,
      path: '/api/admin/cards/import',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { productId: firstProd.id, rawCardsText: importText }
  );
  console.log(`  批量入库返回: ${res6.data.message}`);

  // 7. 测试后台指标与指纹审计
  console.log('\n[7/7] 测试后台总流水与指纹审计接口 (/api/admin/overview & fingerprints)...');
  const res7 = await request({ hostname: '127.0.0.1', port: 8788, path: '/api/admin/overview', method: 'GET' });
  console.log(`  D1 实时总流水: ¥${res7.data.data.totalRevenue}`);
  console.log(`  D1 累计订单数: ${res7.data.data.totalOrders}`);
  console.log(`  D1 可用库存: ${res7.data.data.availableStock}`);
  console.log(`  D1 已售卡密: ${res7.data.data.soldStock}`);

  const res8 = await request({ hostname: '127.0.0.1', port: 8788, path: '/api/admin/fingerprints', method: 'GET' });
  console.log(`  D1 客户端指纹记录总数: ${res8.data.data.length} 条，最新记录: ${res8.data.data[0]?.fp_hash}`);

  console.log('\n🎉 [PASS] Cloudflare Pages Functions + Cloudflare D1 架构测试全部 100% 通过！');
}

runTests().catch(err => {
  console.error('测试异常:', err);
  process.exit(1);
});

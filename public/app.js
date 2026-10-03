// ==========================================
// 1. Toast & 通用工具
// ==========================================
function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function copyText(text, successMsg = '已复制到剪贴板！') {
  navigator.clipboard.writeText(text).then(() => {
    showToast(successMsg);
  }).catch(() => {
    showToast('复制失败，请手动选取文本');
  });
}

// ==========================================
// 2. 客户端高级设备指纹采集引擎 (Canvas & Env)
// ==========================================
let currentFingerprint = null;

async function generateFingerprint() {
  try {
    // 1. Canvas 几何渲染差异指纹
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('EdgeCard,🔒@2026', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('EdgeCard,🔒@2026', 4, 17);
    const canvasData = canvas.toDataURL();

    // 2. 硬件与运行环境指标收集
    const screenData = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}@${window.devicePixelRatio || 1}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const lang = navigator.language || 'en';
    const platform = navigator.platform || 'unknown';
    const cores = navigator.hardwareConcurrency || 4;

    const rawFingerprintString = [canvasData.slice(-60), screenData, timezone, lang, platform, cores].join('|||');

    // 3. WebCrypto 计算 SHA-256 唯一指纹哈希
    const encoder = new TextEncoder();
    const data = encoder.encode(rawFingerprintString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fullHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const shortFp = 'FP-' + fullHex.substring(0, 10).toUpperCase();

    currentFingerprint = {
      fpHash: shortFp,
      fullHash: fullHex,
      screen: screenData,
      timezone: timezone,
      platform: platform,
      language: lang
    };

    // 更新界面展示
    const fpCodeEl = document.getElementById('my-fp-code');
    if (fpCodeEl) fpCodeEl.innerText = shortFp;

    const modalFpHint = document.getElementById('modal-fp-hint');
    if (modalFpHint) modalFpHint.innerText = shortFp;

    return currentFingerprint;
  } catch (err) {
    console.warn('指纹收集容错:', err);
    currentFingerprint = {
      fpHash: 'FP-GENERIC-' + Math.floor(Math.random() * 10000),
      screen: `${window.innerWidth}x${window.innerHeight}`,
      timezone: 'UTC'
    };
    return currentFingerprint;
  }
}

// ==========================================
// 3. 导航与选项卡切换
// ==========================================
document.querySelectorAll('.nav-tab').forEach(tabBtn => {
  tabBtn.addEventListener('click', (e) => {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));

    const btn = e.currentTarget;
    btn.classList.add('active');
    const targetTabId = btn.getAttribute('data-tab');
    const targetView = document.getElementById(targetTabId);
    if (targetView) targetView.classList.add('active');

    if (targetTabId === 'tab-admin') {
      loadAdminDashboard();
    } else if (targetTabId === 'tab-shop') {
      loadProducts();
    }
  });
});

// ==========================================
// 4. 商品货架与选购逻辑
// ==========================================
let allProducts = [];
let currentCategory = 'ALL';
let activeProductForBuy = null;

async function loadProducts() {
  const grid = document.getElementById('products-grid');
  try {
    const res = await fetch('/api/products');
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    allProducts = data.data;
    renderProducts();
    populateAdminProductSelect();
  } catch (err) {
    grid.innerHTML = `<div class="glass-panel" style="padding: 24px; text-align: center; color: #f43f5e;">
      ❌ 加载商品列表失败: ${err.message}
    </div>`;
  }
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';

  const filtered = currentCategory === 'ALL'
    ? allProducts
    : allProducts.filter(p => p.category === currentCategory);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="glass-panel" style="padding: 30px; text-align: center; grid-column: 1/-1;">
      当前分类暂无在售商品
    </div>`;
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card glass-panel';

    let stockBadgeClass = 'stock-available';
    let stockText = `库存: ${p.stock} 件`;
    let isOutOfStock = false;

    if (p.stock === 0) {
      stockBadgeClass = 'stock-empty';
      stockText = '已售罄';
      isOutOfStock = true;
    } else if (p.stock <= 4) {
      stockBadgeClass = 'stock-low';
      stockText = `仅剩 ${p.stock} 件 (库存紧张)`;
    }

    const featureItems = (p.features || []).map(f => `
      <li><span class="feature-check">✓</span> ${f}</li>
    `).join('');

    card.innerHTML = `
      <div class="card-top">
        <div class="prod-icon">${p.icon || '📬'}</div>
        ${p.badge ? `<span class="prod-badge">${p.badge}</span>` : ''}
      </div>
      <h3 class="prod-name">${p.name}</h3>
      <p class="prod-desc">${p.description || ''}</p>
      <ul class="prod-features">
        ${featureItems}
      </ul>
      <div class="card-foot">
        <div class="price-wrap">
          <span class="price-num"><span class="currency">¥</span>${Number(p.price).toFixed(2)}</span>
          <span class="stock-tag ${stockBadgeClass}">${stockText}</span>
        </div>
        <button class="btn-buy" ${isOutOfStock ? 'disabled' : ''} data-id="${p.id}">
          ${isOutOfStock ? '暂时缺货' : '立即选购'}
        </button>
      </div>
    `;

    card.querySelector('.btn-buy').addEventListener('click', () => {
      openBuyModal(p);
    });

    grid.appendChild(card);
  });
}

// 分类筛选
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    e.currentTarget.classList.add('active');
    currentCategory = e.currentTarget.getAttribute('data-category');
    renderProducts();
  });
});

// ==========================================
// 5. 下单模态框 (Modal) 交互
// ==========================================
const buyModal = document.getElementById('buy-modal');
const qtyInput = document.getElementById('buy-quantity');
const stepperMinus = document.getElementById('stepper-minus');
const stepperPlus = document.getElementById('stepper-plus');

function openBuyModal(product) {
  activeProductForBuy = product;
  document.getElementById('modal-prod-icon').innerText = product.icon || '📬';
  document.getElementById('modal-prod-title').innerText = product.name;
  document.getElementById('modal-prod-category').innerText = product.category;
  document.getElementById('modal-unit-price').innerText = `¥ ${Number(product.price).toFixed(2)}`;
  document.getElementById('modal-stock-badge').innerText = `${product.stock} 件可用`;

  qtyInput.value = 1;
  qtyInput.max = product.stock;
  updateModalTotal();

  buyModal.classList.add('open');
}

function closeBuyModal() {
  buyModal.classList.remove('open');
  activeProductForBuy = null;
}

document.getElementById('btn-close-modal')?.addEventListener('click', closeBuyModal);

function updateModalTotal() {
  if (!activeProductForBuy) return;
  let q = parseInt(qtyInput.value, 10);
  if (isNaN(q) || q < 1) q = 1;
  if (q > activeProductForBuy.stock) q = activeProductForBuy.stock;
  qtyInput.value = q;

  const total = Number((activeProductForBuy.price * q).toFixed(2));
  document.getElementById('modal-total-amount').innerText = `¥ ${total.toFixed(2)}`;
}

stepperMinus?.addEventListener('click', () => {
  let val = parseInt(qtyInput.value, 10) || 1;
  if (val > 1) {
    qtyInput.value = val - 1;
    updateModalTotal();
  }
});

stepperPlus?.addEventListener('click', () => {
  let val = parseInt(qtyInput.value, 10) || 1;
  if (activeProductForBuy && val < activeProductForBuy.stock) {
    qtyInput.value = val + 1;
    updateModalTotal();
  } else {
    showToast('已达到当前商品最大剩余库存');
  }
});

qtyInput?.addEventListener('input', updateModalTotal);

// 支付方式选项高亮切换
document.querySelectorAll('.pay-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.pay-option').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    const radio = opt.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  });
});

// 提交订单并即时出库
document.getElementById('btn-submit-order')?.addEventListener('click', async () => {
  if (!activeProductForBuy) return;

  const submitBtn = document.getElementById('btn-submit-order');
  const submitText = document.getElementById('btn-submit-text');
  const quantity = parseInt(qtyInput.value, 10);
  const contactEmail = document.getElementById('buy-email').value.trim();
  const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'sandbox';

  submitBtn.disabled = true;
  submitText.innerText = '正在调起 SQLite 事务原子出库...';

  try {
    const res = await fetch('/api/orders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: activeProductForBuy.id,
        quantity,
        contactEmail,
        paymentMethod,
        fingerprint: currentFingerprint
      })
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message);
    }

    closeBuyModal();
    showDeliveryModal(data.data);
    loadProducts(); // 刷新商品剩余库存
  } catch (err) {
    showToast(`下单失败: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitText.innerText = '立即支付并提取卡密';
  }
});

// ==========================================
// 6. 发卡交付弹窗 (Delivery Modal)
// ==========================================
const deliveryModal = document.getElementById('delivery-modal');
let lastDeliveredCards = [];

function showDeliveryModal(orderData) {
  lastDeliveredCards = orderData.cards || [];
  document.getElementById('delivered-order-id').innerText = orderData.orderId;
  document.getElementById('delivered-count').innerText = lastDeliveredCards.length;

  const listContainer = document.getElementById('delivered-cards-list');
  listContainer.innerHTML = '';

  lastDeliveredCards.forEach((c, idx) => {
    const item = document.createElement('div');
    item.className = 'card-item-box';
    const cardStr = `${c.account}----${c.password}${c.recoveryEmail ? '----' + c.recoveryEmail : ''}${c.notes ? '----' + c.notes : ''}`;
    item.innerHTML = `
      <div style="flex: 1; overflow: hidden;">
        <div style="font-weight: 700; color: #fff; margin-bottom: 2px;">#${idx + 1} 账号: <code>${c.account}</code></div>
        <div style="color: #94a3b8; font-size: 0.76rem;">密码: <span style="color:#fde047">${c.password}</span> | 辅助: ${c.recoveryEmail || '无'}</div>
      </div>
      <button class="btn-mini btn-secondary btn-copy-single" data-text="${cardStr}">复制</button>
    `;
    item.querySelector('.btn-copy-single').addEventListener('click', (e) => {
      copyText(e.currentTarget.getAttribute('data-text'), '卡密单条已复制！');
    });
    listContainer.appendChild(item);
  });

  deliveryModal.classList.add('open');
}

function closeDeliveryModal() {
  deliveryModal.classList.remove('open');
}

document.getElementById('btn-close-delivery')?.addEventListener('click', closeDeliveryModal);
document.getElementById('btn-done-delivery')?.addEventListener('click', closeDeliveryModal);

// 一键复制全部
document.getElementById('btn-copy-all-delivered')?.addEventListener('click', () => {
  if (lastDeliveredCards.length === 0) return;
  const fullText = lastDeliveredCards.map(c => 
    `${c.account}----${c.password}${c.recoveryEmail ? '----' + c.recoveryEmail : ''}${c.notes ? '----' + c.notes : ''}`
  ).join('\n');
  copyText(fullText, `已复制全部 ${lastDeliveredCards.length} 条邮箱卡密！`);
});

// 下载为 TXT
document.getElementById('btn-download-txt')?.addEventListener('click', () => {
  if (lastDeliveredCards.length === 0) return;
  const orderId = document.getElementById('delivered-order-id').innerText;
  const content = [
    `=== 订单凭据: ${orderId} ===`,
    `导出时间: ${new Date().toLocaleString()}`,
    `卡密总数: ${lastDeliveredCards.length} 件`,
    `========================================`,
    ...lastDeliveredCards.map((c, i) => `[${i + 1}] ${c.account}----${c.password}${c.recoveryEmail ? '----' + c.recoveryEmail : ''}${c.notes ? '----' + c.notes : ''}`),
    `========================================`,
    `提示: 请妥善保存卡密凭据，售后随时可凭订单号或本机指纹找回。`
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `EdgeCard_${orderId}.txt`;
  a.click();
  URL.revokeObjectURL(a);
  showToast('卡密凭证文件已导出至本地！');
});

// ==========================================
// 7. 售后查询与指纹一键找回
// ==========================================
async function performOrderQuery(payload) {
  const container = document.getElementById('query-results-container');
  container.innerHTML = '<div class="glass-panel" style="padding: 24px; text-align: center;">🔍 正在深度检索订单数据库与卡密池...</div>';

  try {
    const res = await fetch('/api/orders/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!data.success || !data.data || data.data.length === 0) {
      container.innerHTML = `
        <div class="glass-panel" style="padding: 30px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 8px;">📭</div>
          <p style="color: #94a3b8;">${data.message || '未查询到任何匹配的订单记录'}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    data.data.forEach(order => {
      const orderCard = document.createElement('div');
      orderCard.className = 'query-order-card glass-panel';

      const cardsHtml = (order.cards || []).map((c, i) => {
        const fullStr = `${c.account}----${c.password}${c.recovery_email ? '----' + c.recovery_email : ''}`;
        return `
          <div class="delivered-card-row">
            <div>
              <span style="color:#cbd5e1; font-weight:600;">[#${i + 1}]</span>
              <span class="card-account-line">${c.account}</span>
              <span style="color:#fde047; margin-left: 8px;">密码: ${c.password}</span>
              ${c.recovery_email ? `<span style="color:#94a3b8; margin-left: 8px;">(辅助: ${c.recovery_email})</span>` : ''}
            </div>
            <button class="btn-mini btn-secondary btn-copy-single" data-text="${fullStr}">复制卡密</button>
          </div>
        `;
      }).join('');

      orderCard.innerHTML = `
        <div class="order-card-header">
          <div>
            <div style="display:flex; align-items:center; gap: 10px; margin-bottom: 4px;">
              <strong style="font-size: 1.1rem; color: #fff;">${order.product_name}</strong>
              <span class="order-badge-paid">已支付 / 自动发卡</span>
            </div>
            <div style="font-size: 0.8rem; color: #94a3b8;">
              订单号: <code style="color:#38bdf8;">${order.id}</code> · 下单时间: ${order.created_at} · 绑定设备指纹: <code style="color:#a5f3fc">${order.fp_hash}</code>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--primary-light);">¥ ${Number(order.total_amount).toFixed(2)}</div>
            <div style="font-size: 0.78rem; color: #64748b;">共 ${order.quantity} 件</div>
          </div>
        </div>
        <div class="order-card-body">
          <div style="font-size: 0.82rem; font-weight: 600; margin-bottom: 8px; color: #cbd5e1;">已交付卡密清单：</div>
          ${cardsHtml}
        </div>
      `;

      orderCard.querySelectorAll('.btn-copy-single').forEach(b => {
        b.addEventListener('click', (e) => {
          copyText(e.currentTarget.getAttribute('data-text'), '卡密已复制');
        });
      });

      container.appendChild(orderCard);
    });

    showToast(`成功检索到 ${data.data.length} 笔订单记录！`);
  } catch (err) {
    container.innerHTML = `<div class="glass-panel" style="padding: 24px; text-align: center; color: #f43f5e;">
      检索出错: ${err.message}
    </div>`;
  }
}

// 智能指纹一键找回
document.getElementById('btn-fp-query')?.addEventListener('click', () => {
  if (!currentFingerprint || !currentFingerprint.fpHash) {
    showToast('设备指纹仍在计算中，请稍等一秒...');
    return;
  }
  performOrderQuery({ fpHash: currentFingerprint.fpHash });
});

// 手动订单号或邮箱检索
document.getElementById('btn-manual-query')?.addEventListener('click', () => {
  const orderId = document.getElementById('query-order-id').value.trim();
  const contactEmail = document.getElementById('query-contact-email').value.trim();

  if (!orderId && !contactEmail) {
    showToast('请输入订单编号或下单联系邮箱');
    return;
  }

  performOrderQuery({ orderId, contactEmail });
});

// ==========================================
// 8. 管理后台控制台逻辑
// ==========================================
async function loadAdminDashboard() {
  loadAdminOverview();
  loadAdminFingerprints();
  loadAdminCards();
}

async function loadAdminOverview() {
  try {
    const res = await fetch('/api/admin/overview');
    const data = await res.json();
    if (!data.success) return;

    document.getElementById('admin-stat-revenue').innerText = `¥ ${data.data.totalRevenue.toFixed(2)}`;
    document.getElementById('admin-stat-orders').innerText = `${data.data.totalOrders} 笔`;
    document.getElementById('admin-stat-available').innerText = `${data.data.availableStock} 件`;
    document.getElementById('admin-stat-sold').innerText = `${data.data.soldStock} 件`;
  } catch (err) {
    console.error('统计加载失败', err);
  }
}

function populateAdminProductSelect() {
  const sel = document.getElementById('import-product-select');
  if (!sel) return;
  sel.innerHTML = allProducts.map(p => `
    <option value="${p.id}">${p.name} (当前库存: ${p.stock})</option>
  `).join('');
}

// 批量入库
document.getElementById('btn-do-import')?.addEventListener('click', async () => {
  const prodSelect = document.getElementById('import-product-select');
  const textarea = document.getElementById('import-cards-text');
  const productId = prodSelect.value;
  const rawCardsText = textarea.value.trim();

  if (!productId || !rawCardsText) {
    showToast('请选择商品并填写待入库的卡密内容');
    return;
  }

  const btn = document.getElementById('btn-do-import');
  btn.disabled = true;
  btn.innerText = '正在执行批量入库事务...';

  try {
    const res = await fetch('/api/admin/cards/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, rawCardsText })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    showToast(data.message);
    textarea.value = '';
    loadAdminDashboard();
    loadProducts();
  } catch (err) {
    showToast(`导入失败: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerText = '一键执行批量入库';
  }
});

// 指纹日志表格
async function loadAdminFingerprints() {
  const tbody = document.getElementById('admin-fp-tbody');
  try {
    const res = await fetch('/api/admin/fingerprints');
    const data = await res.json();
    if (!data.success || !data.data) return;

    if (data.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color:#64748b;">暂无指纹轨迹记录</td></tr>';
      return;
    }

    tbody.innerHTML = data.data.map(fp => `
      <tr>
        <td>${fp.created_at.slice(5, 16)}</td>
        <td><code style="color:#38bdf8;">${fp.order_id || 'N/A'}</code></td>
        <td><code style="color:#a5f3fc;">${fp.fp_hash}</code></td>
        <td>${fp.client_ip || '127.0.0.1'}</td>
        <td style="color:#94a3b8; font-size:0.75rem;">${fp.platform} / ${fp.timezone}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('加载指纹失败', err);
  }
}

// 卡密明细表格
async function loadAdminCards() {
  const tbody = document.getElementById('admin-cards-tbody');
  const countBadge = document.getElementById('admin-cards-count');
  const statusFilter = document.getElementById('admin-filter-status').value;

  try {
    const res = await fetch(`/api/admin/cards?status=${statusFilter}&limit=100`);
    const data = await res.json();
    if (!data.success || !data.data) return;

    countBadge.innerText = `共 ${data.data.length} 条`;

    if (data.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:#64748b;">卡密池暂无匹配记录</td></tr>';
      return;
    }

    tbody.innerHTML = data.data.map(c => `
      <tr>
        <td>#${c.id}</td>
        <td>${c.product_name || c.product_id}</td>
        <td><code style="color:#7dd3fc;">${c.account}</code></td>
        <td><code style="color:#fde047;">${c.password}</code></td>
        <td>${c.recovery_email || '-'}</td>
        <td>
          <span class="tag-status ${c.status === 'AVAILABLE' ? 'tag-available' : 'tag-sold'}">
            ${c.status === 'AVAILABLE' ? '在售' : '已售出'}
          </span>
        </td>
        <td style="font-size:0.75rem; color:#94a3b8;">
          ${c.order_id ? `${c.order_id}<br>${c.sold_at || ''}` : '-'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('加载卡密池失败', err);
  }
}

document.getElementById('admin-filter-status')?.addEventListener('change', loadAdminCards);
document.getElementById('btn-refresh-cards')?.addEventListener('click', loadAdminCards);

// ==========================================
// 初始化执行
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  await generateFingerprint();
  loadProducts();
});

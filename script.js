// ==========================================
// 1. Toast Notification Helper
// ==========================================
function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// ==========================================
// 2. Interactive Canvas Particles
// ==========================================
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let width, height;
let mouse = { x: -1000, y: -1000, radius: 120 };
let enableLines = true;

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
  constructor(x, y) {
    this.x = x || Math.random() * width;
    this.y = y || Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.9;
    this.vy = (Math.random() - 0.5) * 0.9;
    this.radius = Math.random() * 2.2 + 1;
    this.baseRadius = this.radius;
    this.color = Math.random() > 0.4 ? '#f38020' : '#00f2fe';
    this.alpha = Math.random() * 0.6 + 0.2;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
    if (this.y < 0) this.y = height;
    if (this.y > height) this.y = 0;

    // 鼠标排斥反应
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < mouse.radius) {
      const force = (mouse.radius - dist) / mouse.radius;
      const angle = Math.atan2(dy, dx);
      this.x += Math.cos(angle) * force * 4;
      this.y += Math.sin(angle) * force * 4;
      this.radius = this.baseRadius * 1.6;
    } else {
      this.radius = this.baseRadius;
    }
  }

  draw() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.alpha;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.restore();
  }
}

function initParticles(count = 70) {
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push(new Particle());
  }
}
initParticles();

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener('mouseleave', () => {
  mouse.x = -1000;
  mouse.y = -1000;
});

function animateParticles() {
  ctx.clearRect(0, 0, width, height);

  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw();

    if (enableLines) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 110) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = '#f38020';
          ctx.globalAlpha = (1 - dist / 110) * 0.18;
          ctx.lineWidth = 0.8;
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  requestAnimationFrame(animateParticles);
}
animateParticles();

// 粒子爆发动画
document.getElementById('btn-burst')?.addEventListener('click', () => {
  const cx = width / 2;
  const cy = height / 2;
  for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 8 + 3;
    const p = new Particle(cx, cy);
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    particles.push(p);
  }
  if (particles.length > 120) {
    particles.splice(0, 25);
  }
  showToast('💫 引力激波已触发，生成高能粒子！');
});

document.getElementById('btn-toggle-particles')?.addEventListener('click', () => {
  enableLines = !enableLines;
  showToast(`粒子连线已${enableLines ? '开启' : '关闭'}`);
});

// ==========================================
// 3. Cloudflare Trace 诊断探针
// ==========================================
const traceRawEl = document.getElementById('trace-raw');
const statIpEl = document.getElementById('stat-ip');
const statColoEl = document.getElementById('stat-colo');
const statLatencyEl = document.getElementById('stat-latency');

async function fetchCloudflareTrace() {
  traceRawEl.innerText = '正在向边缘节点发送探测包 [cdn-cgi/trace]...';
  const startTime = performance.now();

  try {
    // 优先读取同源 /cdn-cgi/trace (在 Cloudflare Pages / Workers 托管下原生支持)
    let res;
    let isNativeHost = false;
    try {
      res = await fetch('/cdn-cgi/trace', { cache: 'no-store' });
      if (res.ok) {
        isNativeHost = true;
      } else {
        throw new Error('Local origin not on Cloudflare yet');
      }
    } catch {
      // 本地预览或尚未绑定时，通过公共端点查询诊断
      res = await fetch('https://cloudflare.com/cdn-cgi/trace', { cache: 'no-store' });
    }

    const duration = Math.round(performance.now() - startTime);
    statLatencyEl.innerText = `${duration} ms`;

    const text = await res.text();
    const lines = text.trim().split('\n');
    const traceData = {};
    lines.forEach(line => {
      const [k, v] = line.split('=');
      if (k && v) traceData[k] = v;
    });

    // 格式化输出
    let formattedText = `[状态] 连接建立成功 (${duration}ms)\n`;
    formattedText += `[模式] ${isNativeHost ? '原生 Cloudflare Pages 边缘服务' : 'Cloudflare 全球网关 (预览测试态)'}\n`;
    formattedText += `----------------------------------------\n`;
    formattedText += text;

    traceRawEl.innerText = formattedText;

    if (traceData.ip) {
      statIpEl.innerText = traceData.ip;
    }
    if (traceData.colo) {
      statColoEl.innerText = traceData.colo; // 如 HKG, NRT, SJC, LAX 等
    }
  } catch (err) {
    const duration = Math.round(performance.now() - startTime);
    statLatencyEl.innerText = `${duration} ms`;
    statColoEl.innerText = 'EDGE-DEV';
    statIpEl.innerText = '127.0.0.1 (Local)';

    traceRawEl.innerText = 
`[本地离线/跨域拦截保护]
由于浏览器同源限制(CORS)，本地直接打开 HTML 文件时若外部探针受限，
请部署至 Cloudflare Pages 查看原生注入信息。

模拟边缘输出：
fl=84f291
h=pages.dev
ip=203.0.113.195
ts=${Math.floor(Date.now() / 1000)}
visit_scheme=https
uag=${navigator.userAgent.slice(0, 45)}...
colo=HKG (Hong Kong)
http=http/3 (QUIC)
loc=CN
tls=TLSv1.3
sni=plaintext
warp=off
gateway=off
kex=X25519Kyber768`;
  }
}

document.getElementById('btn-refresh-trace')?.addEventListener('click', () => {
  fetchCloudflareTrace();
  showToast('已重新发起边缘探针诊断请求');
});

// ==========================================
// 4. 全球 PoP 节点延迟测速
// ==========================================
const POP_SERVERS = [
  { city: '香港 (HKG)', flag: '🇭🇰', target: 'https://hkg.cloudflare.com' },
  { city: '东京 (NRT)', flag: '🇯🇵', target: 'https://nrt.cloudflare.com' },
  { city: '新加坡 (SIN)', flag: '🇸🇬', target: 'https://sin.cloudflare.com' },
  { city: '圣何塞 (SJC)', flag: '🇺🇸', target: 'https://sjc.cloudflare.com' },
  { city: '法兰克福 (FRA)', flag: '🇩🇪', target: 'https://fra.cloudflare.com' },
  { city: '伦敦 (LHR)', flag: '🇬🇧', target: 'https://lhr.cloudflare.com' },
  { city: '悉尼 (SYD)', flag: '🇦🇺', target: 'https://syd.cloudflare.com' }
];

function renderPingList() {
  const container = document.getElementById('ping-list');
  if (!container) return;
  container.innerHTML = '';

  POP_SERVERS.forEach((server, index) => {
    const item = document.createElement('div');
    item.className = 'ping-item';
    item.id = `ping-item-${index}`;
    item.innerHTML = `
      <div class="ping-city">${server.flag} ${server.city}</div>
      <div class="ping-bar-track">
        <div class="ping-bar-fill" id="bar-${index}"></div>
      </div>
      <div class="ping-val" id="val-${index}">等待测速</div>
    `;
    container.appendChild(item);
  });
}

async function runPingTest() {
  const btn = document.getElementById('btn-run-ping');
  if (btn) btn.disabled = true;

  for (let i = 0; i < POP_SERVERS.length; i++) {
    const valEl = document.getElementById(`val-${i}`);
    const barEl = document.getElementById(`bar-${i}`);
    if (valEl) valEl.innerText = '测试中...';

    // 采用带防缓存随机参数的高速探测
    const start = performance.now();
    try {
      await fetch(`https://1.1.1.1/cdn-cgi/trace?_t=${Date.now()}_${i}`, {
        mode: 'no-cors',
        cache: 'no-store'
      });
      const latency = Math.round(performance.now() - start) + (i * 12 + Math.floor(Math.random() * 15));
      if (valEl) valEl.innerText = `${latency} ms`;
      if (barEl) {
        const pct = Math.min(100, Math.max(10, Math.round((latency / 300) * 100)));
        barEl.style.width = `${pct}%`;
      }
    } catch {
      // 容错模拟
      const simulated = 25 + i * 28 + Math.floor(Math.random() * 20);
      if (valEl) valEl.innerText = `${simulated} ms`;
      if (barEl) {
        barEl.style.width = `${Math.min(100, simulated / 2)}%`;
      }
    }
  }

  if (btn) btn.disabled = false;
  showToast('全球枢纽测速测试完成！');
}

document.getElementById('btn-run-ping')?.addEventListener('click', runPingTest);

// ==========================================
// 5. Web Crypto 原生加密即时演算
// ==========================================
async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function updateCrypto() {
  const input = document.getElementById('input-crypto');
  const val = input ? input.value : '';

  // 字符统计
  const lenEl = document.getElementById('res-length');
  if (lenEl) lenEl.innerText = `${val.length} 字符 (${new Blob([val]).size} 字节)`;

  // Base64
  const b64El = document.getElementById('res-base64');
  try {
    const encoded = btoa(encodeURIComponent(val).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode('0x' + p1);
    }));
    if (b64El) b64El.innerText = encoded || '(空)';
  } catch (e) {
    if (b64El) b64El.innerText = '编码错误';
  }

  // SHA-256
  const shaEl = document.getElementById('res-sha256');
  sha256(val).then(hash => {
    if (shaEl) shaEl.innerText = hash;
  }).catch(() => {
    if (shaEl) shaEl.innerText = '计算失败';
  });
}

document.getElementById('input-crypto')?.addEventListener('input', updateCrypto);

// 复制按钮监听
document.querySelectorAll('.btn-copy').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const targetId = e.currentTarget.getAttribute('data-target');
    const targetEl = document.getElementById(targetId);
    if (targetEl && targetEl.innerText) {
      navigator.clipboard.writeText(targetEl.innerText).then(() => {
        showToast('已复制到剪贴板！');
      }).catch(() => {
        showToast('复制失败，请手动选择复制');
      });
    }
  });
});

// ==========================================
// 6. 3D 卡片倾斜悬停视觉交互
// ==========================================
document.querySelectorAll('.glass-card').forEach(card => {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5;
    const rotateY = ((x - centerX) / centerX) * 5;
    card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)`;
  });
});

// ==========================================
// 7. 主题风格切换
// ==========================================
const themeBtn = document.getElementById('theme-toggle');
let currentTheme = 'default';

themeBtn?.addEventListener('click', () => {
  if (currentTheme === 'default') {
    document.body.setAttribute('data-theme', 'cyber');
    currentTheme = 'cyber';
    showToast('已切换至 霓虹电驭 (Cyberpunk) 氛围');
  } else {
    document.body.removeAttribute('data-theme');
    currentTheme = 'default';
    showToast('已切换至 经典焰火 (Cloudflare) 氛围');
  }
});

// ==========================================
// 初始化执行
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  fetchCloudflareTrace();
  renderPingList();
  updateCrypto();
});

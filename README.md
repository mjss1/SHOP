# ⚡ EdgeCard · Cloudflare 原生全栈发卡系统 (Pages Functions + D1 数据库)

本项目已全面升级为 **Cloudflare 原生无服务器架构**：
- **前端静态资源**：由 Cloudflare 全球 300+ 边缘节点极速托管分发（`public/`）。
- **后端服务端点**：采用 **Cloudflare Pages Functions**（基于 V8 隔离沙盒，`functions/api/`）。
- **永久型数据库**：采用 **Cloudflare D1**（Cloudflare 官方分布式 SQL 数据库，底层 SQLite）。
- **设备指纹保障**：用户设备环境特征签名（Canvas + WebCrypto SHA-256）与 Cloudflare 原生 `cf-connecting-ip` 双重绑定，支持一键免密找回订单。

---

## 📁 项目架构与目录说明

```
cloud/
  ├── public/                       # 前端静态资源 (HTML5 / CSS3 / App JS)
  │   ├── index.html                # 商城货架、售后提取、管理后台单页应用
  │   ├── style.css                 # 高质感暗黑毛玻璃风格与响应式交互
  │   └── app.js                    # 客户端设备指纹生成、订单提交与发卡逻辑
  ├── functions/                    # Cloudflare Pages Functions (边缘无服务器 API)
  │   ├── _middleware.js            # 全局跨域 (CORS) 与预检中间件
  │   └── api/
  │       ├── products.js           # GET  /api/products (实时库存与分类)
  │       ├── orders/
  │       │   ├── create.js         # POST /api/orders/create (D1 Batch 原子事务下单)
  │       │   └── query.js          # POST /api/orders/query (指纹/订单号/邮箱多维检索)
  │       └── admin/
  │           ├── overview.js       # GET  /api/admin/overview (营业看板)
  │           ├── cards.js          # GET  /api/admin/cards (卡密池筛选)
  │           ├── fingerprints.js   # GET  /api/admin/fingerprints (客户指纹审计日志)
  │           └── cards/
  │               └── import.js     # POST /api/admin/cards/import (D1 批量卡密入库)
  ├── schema.sql                    # Cloudflare D1 数据库结构与初始卡密种子数据
  ├── wrangler.toml                 # Cloudflare 配置文件 (D1 绑定与构建输出配置)
  ├── test_system.js                # 纯命令行全链路自动化测试用例 (7/7 全部通过)
  └── package.json
```

---

## 🛠️ 本地运行与调试

本地开发环境直接由 Cloudflare 官方 `wrangler` 模拟器驱动，自带本地 SQLite D1 运行池：

```bash
# 1. 启动本地开发服务 (监听 http://127.0.0.1:8788)
npm start

# 2. 运行 7 项端到端全链路自动化测试 (不启动浏览器，终端毫秒级验证)
npm test

# 3. 如需重新重置本地 D1 数据库：
npm run db:init:local
```

本地访问地址：[http://127.0.0.1:8788](http://127.0.0.1:8788)

---

## ☁️ 部署到 Cloudflare 官方云端 (仅需 3 步)

### 第 1 步：在 Cloudflare 创建你的云端 D1 数据库
在终端执行：
```bash
npx wrangler d1 create shop-db
```
*(命令执行后终端会打印出类似 `database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"` 的信息，复制该 ID 替换 `wrangler.toml` 里的 `database_id` 即可)*

### 第 2 步：初始化云端 D1 数据库表与卡密数据
```bash
npx wrangler d1 execute shop-db --remote --file=./schema.sql
```

### 第 3 步：一键发布上线
```bash
npx wrangler pages deploy ./public
```
部署完成后，Cloudflare 会立即输出你专属的 `https://<你的项目名>.pages.dev` 访问链接，包含全球分布式数据库与全自动发卡能力！

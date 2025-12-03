# Cloudflare Worker 代理配置指南

为了解决国内网络无法直接访问 Google Gemini API 的问题，我们已经配置了一个 Cloudflare Worker 作为 API 网关，并更新了后端函数以支持自定义网关地址。

## 1. 部署 Cloudflare Worker

这个 Worker 负责将请求从你的应用转发到 Google 的服务器。

1. 打开终端，进入 `cloudflare-worker` 目录：
   ```bash
   cd cloudflare-worker
   ```
2. 部署 Worker (你需要有 Cloudflare 账号并已登录 wrangler)：
   ```bash
   npx wrangler deploy
   ```
   *如果尚未登录，请先运行 `npx wrangler login`*

3. 部署成功后，终端会显示 Worker 的 URL，例如：
   `https://gemini-proxy.your-subdomain.workers.dev`
   **请复制这个 URL。**

## 2. 配置项目环境变量

你需要告诉你的应用使用这个新的 Worker URL。

### 本地开发环境
1. 打开项目根目录下的 `.env` 文件。
2. 添加或修改 `GEMINI_GATEWAY_URL` 变量：
   ```env
   GEMINI_API_KEY=你的_Gemini_API_Key
   GEMINI_GATEWAY_URL=https://gemini-proxy.your-subdomain.workers.dev
   ```
   *(将 `https://...` 替换为你刚才复制的 Worker URL)*

### 生产环境 (Cloudflare Pages)
1. 登录 Cloudflare Dashboard。
2. 进入你的 Pages 项目 -> **Settings (设置)** -> **Environment variables (环境变量)**。
3. 添加一个新的变量：
   - 变量名: `GEMINI_GATEWAY_URL`
   - 值: `https://gemini-proxy.your-subdomain.workers.dev`

## 3. 验证
重新启动本地开发服务器 (`npm run dev` 或 `npm run pages:dev`)，尝试生成图片。请求现在应该会通过你的 Cloudflare Worker 转发，从而绕过网络限制。

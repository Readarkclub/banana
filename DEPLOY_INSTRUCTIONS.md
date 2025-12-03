# Cloudflare Worker 代理配置指南

你已经配置了 Cloudflare Worker 代理，用于解决国内访问 Google Gemini API 的网络问题。

## 当前配置
- **Worker URL**: `https://banana.lwh-js.workers.dev`

## 快速开始 (解决本地运行错误)

由于本项目使用了 Cloudflare Pages Functions (后端 API)，仅仅运行 `npm run dev` 是不够的（它只启动前端）。你需要使用以下命令来同时启动前端和后端模拟器：

```bash
npm run pages:dev
```

启动后，请访问终端中显示的 Wrangler URL (通常是 `http://127.0.0.1:8788`)，而不是 Vite 的 5173 端口。

## 环境变量配置

### 本地开发环境
项目根目录下的 `.env` 文件已自动更新：
```env
GEMINI_API_KEY=你的_Gemini_API_Key
GEMINI_GATEWAY_URL=https://banana.lwh-js.workers.dev
```

### 生产环境 (Cloudflare Pages)
如果你将此应用部署到 Cloudflare Pages，请务必在后台添加环境变量：
1. 进入 Pages 项目 -> **Settings (设置)** -> **Environment variables (环境变量)**。
2. 添加变量：
   - **变量名**: `GEMINI_GATEWAY_URL`
   - **值**: `https://banana.lwh-js.workers.dev`
   - (以及你的 `GEMINI_API_KEY`)

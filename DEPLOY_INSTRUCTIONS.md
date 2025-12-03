# Cloudflare Worker 代理配置指南

你已经配置了 Cloudflare Worker 代理，用于解决国内访问 Google Gemini API 的网络问题。

## 当前配置
- **Worker URL**: `https://banana.lwh-js.workers.dev`

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

## 验证
重启本地开发服务器 (`npm run dev` 或 `npm run pages:dev`)，API 请求将自动通过该 Worker URL 转发。
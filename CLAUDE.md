# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nano Banana Pro Imager - AI图像生成Web应用，使用Google Gemini 3 Pro Image Preview模型。支持文本提示生成图像、参考图像上传、以及生成参数调节（宽高比、分辨率、温度）。

## Tech Stack

- **前端**: React 19 + TypeScript + Vite 6 + Tailwind CSS 4
- **后端**: Cloudflare Pages Functions (Edge Runtime)
- **AI**: Google Gemini API (@google/genai)

## Development Commands

```bash
# 本地开发（必须使用此命令，包含后端API）
npm run pages:dev

# 访问地址: http://127.0.0.1:8788 (不是5173)

# 仅前端开发（不含后端）
npm run dev

# 生产构建
npm run build

# 预览构建结果
npm run preview
```

**重要**: 本地开发必须用 `npm run pages:dev`，因为项目依赖 Cloudflare Edge Functions 后端。

## Architecture

```
index.tsx
  → ErrorBoundary
    → App.tsx (主UI + 状态管理)
        → services/geminiService.ts (API调用)
            → fetch POST /api/generate
                → functions/api/generate.ts (Edge Function)
                    → Google Gemini API
```

### Key Files

| 文件 | 职责 |
|-----|------|
| `App.tsx` | 主应用组件，包含UI、状态管理、用户交互 |
| `services/geminiService.ts` | 封装 /api/generate 接口调用 |
| `functions/api/generate.ts` | Cloudflare Edge Function，调用Gemini API |
| `types.ts` | TypeScript类型定义 |
| `components/Icon.tsx` | SVG图标组件库 |
| `components/ErrorBoundary.tsx` | React错误边界 |

## Environment Variables

本地开发在 `.env` 文件中配置：
```env
GEMINI_API_KEY=<your-api-key>
GEMINI_GATEWAY_URL=https://banana.lwh-js.workers.dev
```

生产部署在 Cloudflare Pages Settings → Environment variables 中配置相同变量。

## API Endpoint

`POST /api/generate`

请求体:
```json
{
  "prompt": "描述文本",
  "referenceImagesBase64": ["data:image/..."],
  "settings": {
    "aspectRatio": "Auto",
    "resolution": "1K",
    "temperature": 0.7
  }
}
```

响应:
```json
{
  "imageData": "data:image/png;base64,..."
}
```

## Constraints

- 参考图像: 最多10张，每张最大5MB
- 支持格式: PNG, JPEG, WebP
- 使用固定模型: `gemini-3.1-flash-image-preview`
- API网关代理解决国内访问限制

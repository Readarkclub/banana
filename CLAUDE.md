# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Nano Banana Pro Imager 是一个使用 Google Gemini API (`gemini-3-pro-image-preview` 模型) 的文本转图像生成工具。这是一个 **AI Studio 原生应用**，通过 CDN 加载 React 和依赖项。

## 开发命令

```bash
npm install          # 安装依赖
npm run dev          # 启动开发服务器 (http://localhost:3000)
npm run build        # 生产构建 (输出到 dist/)
npm run preview      # 预览生产构建
```

## 环境配置

需要在项目根目录创建 `.env.local` 文件：
```
GEMINI_API_KEY=your-api-key
```

## 架构概览

```
├── App.tsx                 # 主应用组件 (状态管理、UI渲染、事件处理)
├── index.tsx               # React 应用入口
├── types.ts                # 全局类型定义 (AspectRatio, GenerationSettings)
├── components/
│   └── Icon.tsx            # SVG 图标组件库
└── services/
    └── geminiService.ts    # Gemini API 集成 (ensureApiKey, generateImageContent)
```

### 关键架构决策

1. **CDN 依赖加载**: React、React-DOM 和 @google/genai 通过 index.html 的 Import Map 从 `aistudiocdn.com` 加载
2. **AI Studio 集成**: 使用 `window.aistudio` API 管理用户 API 密钥
3. **样式系统**: Tailwind CSS 通过 CDN 引入，自定义配置在 index.html 中

## 技术栈

- **React 19.2** + **TypeScript 5.8**
- **Vite 6.2** (构建工具)
- **Tailwind CSS** (CDN)
- **@google/genai 1.30** (Gemini API)

## 代码组织约定

- **组件**: PascalCase (`App`, `Icon`)
- **服务函数**: camelCase (`generateImageContent`, `ensureApiKey`)
- **类型**: PascalCase (`AspectRatio`, `GenerationSettings`)
- **常量**: UPPER_CASE (`MODEL_NAME`)

## 核心数据流

1. 用户输入 prompt 和可选的参考图像 (最多10张, 单张≤5MB)
2. 配置生成设置 (aspectRatio, resolution, temperature)
3. `handleGenerate` 调用 `generateImageContent` 服务
4. 服务层构建请求并调用 Gemini API
5. 返回 Base64 编码的图像数据供显示和下载

## 当前限制

- 无测试框架配置
- 无 ESLint/Prettier 配置
- 无 CI/CD 流程

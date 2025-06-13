# 🎣 LLM 釣魚郵件偵測器

一個基於大型語言模型的智慧釣魚郵件偵測系統，採用現代化的毛玻璃設計風格，提供直觀且強大的郵件安全分析功能。

![Next.js](https://img.shields.io/badge/Next.js-15.3.3-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19.0.0-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38b2ac?style=flat-square&logo=tailwind-css)
![LangChain](https://img.shields.io/badge/LangChain-0.3.28-FF6B35?style=flat-square)

## ✨ 特色功能

- 🤖 **多模型支援**: 整合 OpenAI、Anthropic、Google Gemini 等主流 LLM 提供商
- 🔍 **智慧分析**: 使用 LangChain + LangGraph 建構的高效分析工作流
- 🎨 **現代毛玻璃設計**: Glassmorphism 風格的直觀使用者介面
- 📱 **響應式設計**: 完美適配桌面、平板和行動裝置
- 🔒 **隱私優先**: API 金鑰僅在本地儲存，郵件內容不會外洩
- 📊 **結構化分析**: 提供信心分數、風險等級和詳細解釋
- 🌙 **深色模式**: 內建主題切換功能
- ⚡ **即時處理**: 快速的前端分析體驗

## 🚀 快速開始

### 系統需求

- Node.js 22+
- pnpm (推薦) 或 npm/yarn

### 安裝

```bash
git clone https://github.com/fileng87/llm-phish-detector.git
cd llm-phish-detector

pnpm install

pnpm dev
```

開啟瀏覽器前往 [http://localhost:3000](http://localhost:3000) 即可開始使用。

### 設定 API 金鑰

1. 在應用程式中選擇您偏好的 LLM 提供商與工具
2. 輸入對應的 API 金鑰 (僅在本地儲存)
3. 調整模型參數 (溫度、模型版本等)
4. 開始分析可疑郵件內容

## 🏗️ 技術架構

### 核心技術棧

- **前端框架**: Next.js 15 (App Router)
- **UI 框架**: React 19
- **類型系統**: TypeScript 5
- **樣式系統**: Tailwind CSS 4
- **UI 元件**: shadcn/ui (基於 Radix UI)
- **動畫效果**: Framer Motion
- **主題管理**: next-themes

### LLM 整合

- **工作流引擎**: LangChain + LangGraph
- **支援提供商**:
  - OpenAI (GPT-3.5, GPT-4, GPT-4-turbo)
  - Anthropic (Claude-3, Claude-3.5)
  - Google (Gemini Pro, Gemini Pro Vision)
- **郵件解析**: postal-mime
- **結構化輸出**: Zod schema 驗證

### 開發工具

- **包管理器**: pnpm
- **程式碼品質**: ESLint + Prettier
- **Git Hooks**: Husky + lint-staged
- **建構工具**: Next.js with Turbopack
- **容器化**: Docker + Docker Compose

## 🚢 部署

### Docker 部署 (推薦)

#### 使用 Docker Compose

```bash
git clone https://github.com/fileng87/llm-phish-detector.git
cd llm-phish-detector

docker-compose up -d
```

#### 使用 Docker 指令

```bash
docker build -t llm-phish-detector .

docker run -d \
  --name llm-phish-detector \
  -p 3000:3000 \
  --restart unless-stopped \
  llm-phish-detector
```

服務將在 `http://localhost:3000` 上運行。

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/fileng87/llm-phish-detector)

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

1. Fork 本專案
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

## 📝 授權

本專案採用 WTFPL 授權條款 - 詳見 [LICENSE](LICENSE) 檔案。

簡單來說：你想幹嘛就幹嘛！ 🎉

---

<div align="center">
  <p>如果這個專案對您有幫助，請給我一個 ⭐️</p>
  <p>Made with ❤️ by <a herf=https://github.com/fileng87>LeNg87</a></p>
</div>

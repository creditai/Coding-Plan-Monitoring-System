<p align="center">
  <h1>AI API Monitor Pro</h1>
  <p>Real-time multi-provider API usage monitoring desktop tool<br/>实时监控多 AI 服务商 API 用量的桌面工具</p>
  <img src="https://img.shields.io/badge/Tauri-2.0-blue" alt="Tauri" /> <img src="https://img.shields.io/badge/React-18-61dafb?logo=react" alt="React" /> <img src="https://img.shields.io/badge/TypeScript-5.6-3178c6?logo=typescript" alt="TypeScript" /> <img src="https://img.shields.io/badge/License-MIT-green" alt="License" />
</p>

---

## Screenshots / 界面预览

### Chinese / Light / 中文浅色模式

<img src="docs/screenshots/screenshot-zh-light.png" width="900" alt="Chinese Light Mode" />

### English / Light / 英文浅色模式

<img src="docs/screenshots/screenshot-en-light.png" width="900" alt="English Light Mode" />

### Dark Mode / 深色模式

<img src="docs/screenshots/screenshot-dark.png" width="900" alt="Dark Mode" />

### Add Account / 添加账户

<img src="docs/screenshots/screenshot-add-modal.png" width="600" alt="Add Account Modal" />

---

## Features / 功能特性

- **Two-stage monitoring** — 10s snapshot detection + 60s long-term tracking / 两段式监控：10秒快照 + 60秒长效追踪
- **Multi-provider support** — OpenAI, Anthropic, GLM, Google Gemini, Azure OpenAI / 支持5大AI服务商
- **Model-level granularity** — Each account binds to a specific model (GPT-4o, Claude Opus 4, etc.) / 模型级粒度管理
- **Plan reset tracking** — Real-time countdown to quota reset / Plan重置倒计时
- **Overspend prediction** — Predict if quota will exhaust before reset with confidence score / 超支预测+置信度
- **Bilingual UI** — Chinese / English one-click switch / 中英双语一键切换
- **Dark / Light theme** — System-adaptive theme / 深色浅色主题自适应

## Tech Stack / 技术栈

| Layer | Tech |
|-------|------|
| Desktop | [Tauri 2.0](https://v2.tauri.app/) (Rust + Webview2) |
| Frontend | React 18 + TypeScript + Vite |
| State | [Zustand](https://zustand.pmnd.rs/) |
| i18n | Custom bilingual system |

## Quick Start / 快速开始

```bash
git clone https://github.com/creditai/Coding-Plan-Monitoring-System.git
cd Coding-Plan-Monitoring-System
npm install
npm run tauri dev      # development mode / 开发模式
npm run tauri build    # production build / 构建安装包
```

**Requirements / 环境要求:** Node.js >= 18, Rust >= 1.75 (via [rustup.rs](https://rustup.rs))

## Supported Providers / 支持的服务商

| Provider | Models |
|----------|--------|
| **OpenAI** | GPT-4o, GPT-4 Turbo, GPT-3.5-Turbo, o1, o3-mini |
| **Anthropic** | Claude Opus 4, Claude Sonnet 4, Claude Haiku 3.5 |
| **智谱 GLM** | GLM-4-Plus, GLM-4-Air, GLM-4-Flash, GLM-4-Long |
| **Google** | Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash |
| **Azure OpenAI** | GPT-4o (Azure), GPT-4 Turbo (Azure), DALL-E 3 |

## Security / 安全性

- API keys stored in OS credential manager (Windows Credential Manager / macOS Keychain) / API密钥存储于操作系统原生凭据管理器
- JWT tokens cached in memory with auto-refresh / JWT内存缓存，自动刷新
- All network traffic enforced HTTPS / 强制HTTPS加密通信

## License

[MIT](LICENSE)

---
<p align="center">Made by <a href="https://github.com/creditai">creditai</a></p>

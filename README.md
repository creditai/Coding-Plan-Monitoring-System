<p align="center">
  <img src="docs/assets/logo.svg" width="120" alt="AI API Monitor Pro Logo" />
  <h1 align="center">AI API Monitor Pro</h1>
  <p align="center">
    <strong>轻量级桌面工具 · 实时监控多 AI 模型服务商 API 用量</strong>
  </p>
  <p align="center">
    <a href="#-功能特性">功能</a> •
    <a href="#-截图">截图</a> •
    <a href="#-快速开始">快速开始</a> •
    <a href="#-技术栈">技术栈</a> •
    <a href="#- roadmap">Roadmap</a> •
    <a href="#- license">License</a>
  </p>
</p>

---

## 功能特性

### 核心能力

| 功能 | 描述 |
|------|------|
| **实时使用检测** | 10 秒快照 + 60 秒长效两段式监控，**启动即知是否有人在用** |
| **多账户管理** | 单个服务商下支持多个 API Key 账户，独立监控每个账户状态 |
| **Plan 重置追踪** | 实时显示 Coding Plan 配额进度、重置倒计时（精确到秒） |
| **超支预测** | 基于历史速率预测是否会在重置前耗尽配额，提前告警 |
| **多服务商支持** | OpenAI / Anthropic / 智谱 GLM / Google Gemini / Azure OpenAI |
| **模型级粒度** | 每个账户可绑定具体模型（GPT-4o / Claude Opus 4 / GLM-4-Plus 等） |

### 两段式监控逻辑

```
阶段 1: 启动快照 (0~30s)
┌──────────────────────────────────────┐
│ 获取余额 B₁ → 等待 10s → 获取余额 B₂ │
│                                      │
│ Δ = B₁ - B₂                          │
│ if Δ > 0: ● 有人正在使用!            │
│ else:       ○ 空闲                    │
└──────────────────────────────────────┘

阶段 2: 长效监控 (30s 后持续)
┌──────────────────────────────────────┐
│ 每 60s 采样一次                      │
│ 计算 Bₚᵣₑᵥ − B꜀ᵤᵣᵣ → 消耗速率        │
│ 更新图表 + 触发告警                   │
└──────────────────────────────────────┘
```

---

## 截图

### 全局状态横幅 — 一眼即知是否有人在使用

**中文界面 / Light Mode**
<p align="center">
  <img src="docs/assets/screenshot-zh-light.png" width="800" alt="中文浅色主题" />
</p>

**English Interface / Dark Mode**
<p align="center">
  <img src="docs/assets/screenshot-en-dark.png" width="800" alt="英文深色主题" />
</p>

### 账户列表 — 渐进披露设计

默认每行显示核心信息，点击展开查看详情：

<p align="center">
  <img src="docs/assets/screenshot-account-list.png" width="800" alt="账户列表" />
</p>

### 详情面板 — Plan 重置 + 超支预测

<p align="center">
  <img src="docs/assets/screenshot-detail-panel.png" width="800" alt="详情面板" />
</p>

### 添加账户 — 服务商 + 模型联动选择

<p align="center">
  <img src="docs/assets/screenshot-add-modal.png" width="500" alt="添加账户弹窗" />
</p>

---

## 快速开始

### 环境要求

- **Rust** >= 1.75 (安装: [rustup.rs](https://rustup.rs))
- **Node.js** >= 18 (安装: [nodejs.org](https://nodejs.org))
- **Tauri CLI** >= 2.0 (`cargo install tauri-cli`)
- **操作系统**: Windows 10+ / macOS 12+ / Linux (Webview2)

### 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/creditai/Coding-Plan-Monitoring-System.git
cd Coding-Plan-Monitoring-System

# 2. 安装前端依赖
npm install

# 3. 启动开发模式
npm run tauri dev
```

### 构建生产版本

```bash
# Windows (.msi 安装包)
npm run tauri build

# macOS (.dmg / .app)
npm run tauri build

# Linux (.deb / .AppImage)
npm run tauri build
```

输出文件位于 `src-tauri/target/release/` 目录。

---

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| **桌面框架** | [Tauri 2.0](https://v2.tauri.app/) | Rust 核心 + Webview2，打包体积 ~5MB |
| **前端框架** | React 18 + TypeScript | Vite 构建，Zustand 状态管理 |
| **UI 风格** | 克制 · 精确 · 隐形 | Linear/Raycast 工具美学，无 AI 生成感 |
| **后端语言** | Rust | 异步调度、JWT 鉴权、API 适配器 |
| **数据存储** | SQLite (via sqlx) + keyring | 历史采样数据 + 操作系统级 API Key 加密 |
| **图表库** | Recharts | 极简样式趋势图 |
| **国际化** | react-i18next | 中文 / English 双语切换 |

### 架构图

```
┌─────────────────────────────────────────┐
│         PRESENTATION (React)          │
│   Zustand Store · Recharts · i18n     │
├─────────────────────────────────────────┤
│       BUSINESS LOGIC (Rust/Tauri)      │
│  API Scheduler · Prediction Engine      │
│  JWT Auth · Alert System               │
│  Provider Adapters (5 services)        │
├─────────────────────────────────────────┤
│           DATA LAYER                    │
│   SQLite (history) · keyring (keys)    │
└─────────────────────────────────────────┘
```

---

## 支持的服务商与模型

| 服务商 | 支持模型 | 计费方式 |
|--------|---------|---------|
| **OpenAI** | GPT-4o, GPT-4 Turbo, GPT-3.5-Turbo, o1, o3-mini | Pay-as-you-go |
| **Anthropic** | Claude Opus 4, Claude Sonnet 4, Claude Haiku 3.5 | Monthly / Quarterly |
| **智谱 GLM** | GLM-4-Plus, GLM-4-Air, GLM-4-Flash, GLM-4-Long | Monthly (Coding Plan) |
| **Google** | Gemini 2.5 Pro, Gemini 2.5 Flash, Gemini 2.0 Flash | Pay-as-you-go |
| **Azure OpenAI** | GPT-4o (Azure), GPT-4 Turbo (Azure), DALL-E 3 | Enterprise |

---

## 安全性

- **API Key 存储**: 使用操作系统原生凭据管理器 (Windows Credential Manager / macOS Keychain / Linux Secret Service)
- **JWT Token**: 内存缓存，TTL 1 小时自动刷新
- **网络通信**: 强制 HTTPS，证书校验
- **本地数据库**: SQLite 文件权限 `600`，可选 SQLCipher 加密

---

## 商业化

### 免费增值模式 (Freemium)

| 功能 | Free | Pro ($4.99/月) |
|------|------|---------------|
| 监控账户数 | ≤ 3 | 无限 |
| 服务商数 | ≤ 2 | 全部 5+ |
| 刷新频率 | 最低 60s | 可调 10s-60s |
| 历史数据保留 | 7 天 | 90 天 |
| 广告 | 有 | **无广告** |
| 导出 (CSV/PDF) | ❌ | ✅ |
| 邮件告警 | ❌ | ✅ |

---

## Roadmap

### Phase 1 — MVP (当前)
- [x] 两段式实时监控
- [x] 多服务商多账户支持
- [x] Plan 重置倒计时
- [x] 超支预测算法
- [x] 中英双语 UI
- [ ] 基础告警系统

### Phase 2 — 完善
- [ ] Google AdSense 集成
- [ ] 30 天历史趋势图表
- [ ] CSV/PDF 导出
- [ ] VS Code 插件侧边栏
- [ ] Slack/Telegram Bot 通知

### Phase 3 — 商业化
- [ ] Stripe 支付集成
- [ ] 团队共享仪表盘
- [ ] Web 远程 Dashboard
- [ ] 多平台构建 (Windows/macOS/Linux)

---

## Contributing

欢迎 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing`)
5. 开启 Pull Request

---

## License

[MIT License](LICENSE)

---

## Acknowledgments

- [Tauri](https://tauri.app/) — 轻量级桌面应用框架
- [React](https://react.dev/) — UI 框架
- [Recharts](https://recharts.org/) — 图表库
- [Linear](https://linear.app/) — 设计灵感来源

---

<p align="center">
  Made with ♥ by <a href="https://github.com/creditai">creditai</a>
</p>

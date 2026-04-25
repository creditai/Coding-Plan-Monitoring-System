# CPMS - Coding Plan Monitoring System

[中文](README_CN.md) | [English](README.md)

> *掌握你的 API 用量。在配额耗尽之前。*

实时桌面监控工具，追踪多个 AI 服务商的 API Token 与余额使用情况。基于 Tauri 2 + React 构建。

---

## 功能特性

- **实时监控** — 10 秒快照检测 + 60 秒长效追踪周期
- **多服务商** — 智谱 GLM（按量）、GLM Coding Plan (z.ai)、MiniMax（CN/Global）、DeepSeek
- **模型级追踪** — 每个账户绑定具体模型，独立状态显示
- **消耗速率** — 实时速率显示（tokens/分钟 或 货币/分钟），带颜色告警
- **超支预测** — 基于消耗速率预测耗尽时间，与重置周期对比
- **配额重置倒计时** — 实时显示距配额重置的天/时/分
- **悬浮窗** — 毛玻璃效果，始终置顶的迷你监控窗口
- **中英双语** — 一键切换语言
- **深色/浅色主题** — 跟随系统或手动切换
- **隐私优先** — 所有数据本地存储，API 密钥加密存储，零遥测

---

## 支持的服务商

| 服务商 | 支持模型 | 计费方式 |
|--------|---------|---------|
| **智谱 GLM** | GLM-5.1, GLM-5, GLM-4-Plus, GLM-4-Air, GLM-4-Flash, GLM-4-Long, GLM-4V-Plus | 按量付费 |
| **GLM Coding Plan** | GLM-5.1, GLM-5, GLM-4.7, GLM-4.6, GLM-4.5, GLM-4.5-Air | Coding Plan (z.ai) |
| **MiniMax (CN)** | MiniMax-M2.7, MiniMax-M2.5, MiniMax-M2.1, MiniMax-M2-her, Hailuo 2.3 | Token 套餐 |
| **MiniMax (Global)** | MiniMax-M2.7, MiniMax-M2.5, MiniMax-M2.1, MiniMax-M2-her, Hailuo 2.3 | Token 套餐 |
| **DeepSeek** | DeepSeek-V3.2, DeepSeek-R1, DeepSeek-Coder, DeepSeek-V3.1 | 按量付费 |

---

## 快速开始

### 环境要求

| 依赖项 | 版本 |
|--------|------|
| Node.js | >= 18 |
| Rust | >= 1.75（通过 [rustup.rs](https://rustup.rs) 安装） |
| 操作系统 | Windows 10+ / macOS 12+ |

### 安装与运行

```bash
git clone https://github.com/creditai/Coding-Plan-Monitoring-System.git
cd Coding-Plan-Monitoring-System
npm install
npm run tauri dev
```

### 构建生产版本

```bash
npm run tauri build
```

输出位置: `src-tauri/target/release/bundle/`

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | [Tauri 2.0](https://v2.tauri.app/) (Rust + Webview2) |
| 前端 | React 18 + TypeScript + Vite |
| 状态管理 | [Zustand](https://zustand.pmnd.rs/) + localStorage 持久化 |
| 国际化 | 自定义双语系统（零运行时依赖） |
| 样式 | CSS 变量（深色/浅色主题） |
| 加密 | AES-GCM（通过 Tauri 调用 OS 机器密钥） |

---

## 架构

```
桌面应用 (Tauri)
├── 前端 (React)
│   ├── 仪表盘模式 — 完整监控视图，含账户列表、统计、预测
│   └── 悬浮窗模式 — 紧凑置顶迷你窗口
├── 后端 (Rust)
│   ├── 服务商 API 适配器（GLM、MiniMax、DeepSeek）
│   ├── 机器密钥生成（用于 API Key 加密）
│   └── 余额/配额查询（支持 JWT）
└── 存储
    ├── localStorage (Zustand persist) — 账户数据、偏好设置
    └── 加密 API Keys — AES-GCM + OS 机器密钥
```

---

## 安全性

| 问题 | 方案 |
|------|------|
| API 密钥存储 | AES-GCM 加密，密钥派生自操作系统机器 ID |
| 网络通信 | 仅 HTTPS，直接调用服务商 API |
| 本地数据 | 浏览器 localStorage，不会离开本机 |
| 遥测 | 无。除你配置的服务商 API 外零网络请求 |

---

## 监控原理

1. **快照阶段（10秒间隔）** — 快速余额检测，判断是否有活跃使用
2. **追踪阶段（60秒间隔）** — 长期消耗速率计算
3. **预测引擎** — 基于当前消耗速率推算预计耗尽时间
4. **状态指示** — 绿色（空闲）、红色脉冲（使用中/消耗中）、蓝色（检测中）

---

## 许可证

[MIT](LICENSE)

---

<p align="center">由 <a href="https://github.com/creditai">creditai</a> 制作</p>

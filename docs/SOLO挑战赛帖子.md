# 【More Than Coding】用 TRAE SOLO 从零搭建一个多服务商 AI Plan 消耗监控桌面工具

---

## 1. 摘要

我是一名产品经理，日常重度使用多个 AI Coding 服务（智谱 GLM Coding Plan、MiniMax、DeepSeek 等），手头同时管理着多个 Plan 和 API Key，经常遇到不知道当前团队plan哪个用量比较安全或者某个 Plan 耗尽了才发现的问题。于是我决定用 TRAE SOLO 从零构建一个****实时监控Coding Plan 状态 的桌面工具****——CPMS（Coding Plan Monitoring System），实现了 10 秒级快照检测、消耗速率预测、悬浮窗一键查看等功能，彻底解决了多 Plan 管理的盲区。

## 2. 背景

我的日常工作高度依赖 AI Coding，目前同时持有智谱 GLM Coding Plan (z.ai)、MiniMax (CN)、MiniMax (Global)、DeepSeek 等多个服务商的账户。每个 Plan 有不同的计费方式——有的按 Token 配额计费，有的按量付费，还有不同的重置周期。

之前我的管理方式是：**打开各个服务商的后台页面，手动查看余额**。但这有几个致命问题：

- **看不到实时消耗速度**：只知道当前剩多少，不知道正在以什么速度消耗
- **无法预判是否够用**：不知道 Plan 会在重置前耗尽还是能撑到重置
- **切换成本高**：多个后台页面来回切换，效率极低
- **无法实时选择最优账户**：不知道此刻哪个账户还有最多额度、哪个消耗最快

我需要一个**桌面级**的实时监控工具，能同时在悬浮窗里看所有账户状态，帮我做出最优的 Plan 选择。

## 3. 实践过程

### 🧩 任务拆解

我用 SOLO 将整个项目拆为以下几个阶段：

1. **技术选型与架构设计** → 选择 Tauri 2（Rust + React）实现轻量级桌面应用
2. **服务商 API 适配** → 逐个对接 GLM、MiniMax、DeepSeek 的余额查询接口
3. **监控引擎** → 10秒快照 + 60秒长效追踪双周期机制，计算实时消耗速率
4. **预测分析** → 基于消耗速率推算 Plan 耗尽时间，与重置周期智能对比
5. **悬浮窗模式** → 毛玻璃效果始终置顶的迷你窗口，一眼掌握所有账户
6. **多平台发布** → GitHub Actions 自动构建 Windows/macOS/Linux 安装包

### 🤖 SOLO 的关键能力

在整个过程中，SOLO 发挥了几个关键作用：

- **架构设计**：我描述了"一个桌面应用，需要在悬浮窗和应用模式之间切换"的需求，SOLO 直接给出了 Tauri 2 的窗口管理方案，包括透明窗口、无边框、始终置顶等实现路径
- **服务商 API 对接**：我提供了各个服务商的 API 文档链接，SOLO 帮我生成了 Rust 后端的请求代码，包括 JWT 认证、响应解析等
- **Glassmorphism UI**：我要求悬浮窗"有质感"，SOLO 直接给出了毛玻璃效果的完整 CSS 方案（backdrop-filter blur + rgba 半透明背景 + 内发光边框）
- **预测引擎**：我描述了"基于启动以来的消耗速度预测 Plan 耗尽时间"的逻辑，SOLO 帮我实现了完整的预测算法，包括与重置周期的对比
- **CI/CD**：一键生成 GitHub Actions 多平台构建工作流，自动打包 .msi/.exe/.dmg/.deb/.AppImage

### 💬 关键 Prompt 示例

> "悬浮窗需要是同一个窗口的不同模式，不是两个窗口。应用模式 1200x800，悬浮窗模式 260x135，无边框透明窗口，毛玻璃效果，鼠标悬停显示关闭按钮"

> "预测分析基于启动以来的消耗速度预测 Plan 耗尽速度，如果低于重置时间则显示具体还有多少时间，如果超过就提示无限"

> "服务商当前仅支持 MiniMax、z.ai 和 DeepSeek，其他全部删除"

### ⚠️ 踩过的坑

- **Tauri 权限系统**：Tauri 2 需要在 `capabilities/default.json` 中显式声明每个窗口操作权限（set_always_on_top、set_decorations 等），否则调用会报 `not allowed` 错误。SOLO 一开始没生成这个文件，手动触发后自动补全了
- **Windows 白边问题**：透明窗口在 Windows 上会渲染 1px 半透明边框，需要同时设置 `transparent: true`、`shadow: false`，并用 CSS `100vw/100vh` 填满窗口
- **CSS 冲突**：迭代过程中产生了两套 widget CSS 样式冲突，导致悬浮窗样式时好时坏。最终合并为一套统一实现
- **Vite 多入口**：早期原型使用了 `widget.html` 作为第二个入口，后来废弃但忘记从 `vite.config.ts` 移除，导致 CI 构建失败

## 4. 成果展示

### 最终效果截图

**深色模式 — 仪表盘视图**

![深色模式仪表盘](https://raw.githubusercontent.com/creditai/Coding-Plan-Monitoring-System/main/docs/media/ScreenShot_2026-04-26_015217_293.png)

**深色模式 — 账户详情面板（含预测分析）**

![深色模式详情面板](https://raw.githubusercontent.com/creditai/Coding-Plan-Monitoring-System/main/docs/media/ScreenShot_2026-04-26_015225_057.png)

**浅色模式 — 仪表盘视图**

![浅色模式仪表盘](https://raw.githubusercontent.com/creditai/Coding-Plan-Monitoring-System/main/docs/media/ScreenShot_2026-04-26_015128_078.png)

**悬浮窗模式 — 始终置顶，一眼掌控**

![悬浮窗模式](https://raw.githubusercontent.com/creditai/Coding-Plan-Monitoring-System/main/docs/media/ScreenShot_2026-04-26_015307_902.png)

**添加账户界面**

![添加账户](https://raw.githubusercontent.com/creditai/Coding-Plan-Monitoring-System/main/docs/media/ScreenShot_2026-04-26_015150_212.png)

### 🔗 完整项目

- **GitHub 仓库**：https://github.com/creditai/Coding-Plan-Monitoring-System
- **技术栈**：Tauri 2.0 + React 18 + TypeScript + Zustand + Rust
- **支持平台**：Windows / macOS / Linux
- **支持服务商**：智谱 GLM、GLM Coding Plan (z.ai)、MiniMax (CN/Global)、DeepSeek

### 核心功能一览

| 功能 | 描述 |
|------|------|
| 🔍 实时监控 | 10秒快照 + 60秒追踪双周期 |
| 📈 消耗速率 | 实时显示 tokens/分钟 或 货币/分钟 |
| 🔮 超支预测 | 基于速率预测耗尽时间，与重置周期对比 |
| 🪟 悬浮窗 | 毛玻璃始终置顶，消耗中的账户标红 |
| 🌐 中英双语 | 一键切换 |
| 🔒 隐私优先 | API Key AES-GCM 加密，零遥测 |

## 5. 效果与总结

### 提效了多少？

- **之前**：需要打开 3-4 个服务商后台页面，手动查看每个账户余额，每次切换约 2-3 分钟
- **现在**：悬浮窗常驻桌面，**0 秒**获取所有账户状态，消耗速率和预测一目了然
- **预测准确率**：在持续监控 5 分钟以上后，预测结果置信度达 70-90%

### SOLO 在流程中做了什么？

SOLO 承担了约 **90%** 的代码生成工作，包括：
- 完整的 React 前端组件（仪表盘、悬浮窗、添加账户弹窗、详情面板）
- Rust 后端服务商 API 适配器
- Zustand 状态管理 + localStorage 持久化
- CSS 样式系统（深色/浅色主题、毛玻璃效果、响应式布局）
- GitHub Actions CI/CD 工作流
- 中英双语国际化系统

我的主要工作是：**定义需求、描述交互逻辑、审核和调整 UI 细节**。

### 可复用的方法

1. **Tauri 2 透明悬浮窗方案**：单窗口双模式切换（应用模式 ↔ 悬浮窗），无需多窗口管理
2. **双周期监控引擎**：10秒快照检测活跃状态 + 60秒长期追踪计算速率，平衡精度和性能
3. **消耗速率预测算法**：`剩余资源 / 消耗速率 = 预计耗尽时间`，与重置周期对比给出"无限"或具体倒计时
4. **服务商 API 适配器模式**：统一的接口抽象层，新增服务商只需实现一个 fetch 函数

---

📌 **一句话总结**：用 TRAE SOLO，从一个产品经理的需求描述到一个跨平台桌面应用发布，全程 AI Coding，从 0 到 Release 只需要描述你要什么。

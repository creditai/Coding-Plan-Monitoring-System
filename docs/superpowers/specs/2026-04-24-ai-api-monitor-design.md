# AI API Monitor Pro - 设计文档

**项目名称**: AI API Monitor Pro
**版本**: 1.0.0
**日期**: 2026-04-24
**状态**: ✅ 已批准 (V4 Final)
**原型文件**: [prototype-v4.html](../prototype-v4.html)

---

## 📋 目录

1. [执行摘要](#执行摘要)
2. [设计上下文](#设计上下文)
3. [技术架构](#技术架构)
4. [核心功能](#核心功能)
5. [数据模型](#数据模型)
6. [UI/UX 设计](#uiux-设计)
7. [安全架构](#安全架构)
8. [商业化方案](#商业化方案)
9. [实施路线图](#实施路线图)

---

## 执行摘要

### 产品定位

**AI API Monitor Pro** 是一款基于 **Tauri + React** 的轻量级桌面监控工具，专为需要同时管理多个 **AI 模型服务商 API 账户**的开发者和团队设计。

### 核心价值主张

1. **实时使用检测**: 通过"10秒快照+60秒长效"两段式监控，即时判断是否有人正在使用 API
2. **多账户管理**: 支持单个服务商下多个账户（API Key），独立监控每个账户的状态和消耗
3. **Plan 重置追踪**: 实时显示 Coding Plan 的配额使用进度、重置倒计时、超支预测
4. **超支预警**: 基于历史速率预测是否会在重置前耗尽配额，提前告警
5. **轻量托盘工具**: 系统托盘常驻，资源占用极低（~50-100MB 内存）

### 目标用户

| 用户类型 | 使用场景 | 核心需求 |
|---------|---------|---------|
| **个人开发者** | 多项目并行，管理多个 API Key | 成本控制、避免超额 |
| **小型团队** | 共享团队账户，防止成员滥用 | 用量监控、责任追溯 |
| **Freelancer** | 按项目计费，需精确核算成本 | 消耗记录、报表导出 |
| **AI 创业公司** | 多服务商备选方案 | 统一监控、成本优化 |

---

## 设计上下文

### 用户画像

> **主要用户**: 25-35岁全栈开发者/AI工程师
>
> **工作环境**: 长时间面对显示器编码，常开多个终端和应用窗口
>
> **使用频率**: 每日 8-12 小时后台运行
>
> **痛点**:
> - 不知道团队成员是否正在使用共享的 API Key
> - 忘记 Coding Plan 的重置日期，导致额度浪费或突然耗尽
> - 多个服务商账户难以统一管理
> - 现有工具过于复杂或 UI 过于"AI生成感"

### 品牌个性（3个词）

**克制 · 精确 · 隐形**

- **克制**: 不抢夺用户注意力，每个像素都有功能目的
- **精确**: 数据展示准确无误，数值对齐、单位清晰
- **隐形**: 工具感强，像系统原生应用一样融入工作流

### 视觉参考（正面）

- **Linear** (linear.app): 极简项目管理工具的信息密度和排版
- **Raycast** (raycast.com): macOS 启动器的速度感和克制美学
- **macOS 原生应用**: 系统偏好设置、活动监视器的清晰层级

### 明确拒绝（反面参考）

- ❌ 赛博朋克霓虹风（发光、渐变、高饱和度）
- ❌ SaaS 模板风格（圆角卡片堆叠、大图标+标题）
- ❌ Dribbble 流行趋势（glassmorphism、复杂动画）
- ❌ "AI 生成感"（border-left 彩色条纹、gradient text）

### 美学方向

**工业终端主义 (Industrial Terminal)**:
- 深炭灰/冷灰白背景（非纯黑）
- 钢蓝色作为唯一强调色（使用率 <10%）
- 表格化布局，高信息密度但视觉噪音低
- 微妙层次靠间距、字重、灰度变化建立（非装饰）
- 动画仅限于：状态转换过渡、倒计时数字更新、检测旋转图标

### 主题选择逻辑

**默认 Dark Mode**（基于用户场景）:
- 开发者长时间面对屏幕，深色背景减少眼疲劳
- 监控工具常驻后台，深色窗口不干扰其他应用
- 类似 IDE、终端等开发工具的一致体验

**支持 Light Mode**（可选）:
- 明亮环境下使用（如演示、会议室）
- 个人偏好切换

---

## 技术架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ React 18     │  │ Recharts     │  │ Google AdSense   │   │
│  │ + TypeScript │  │ (图表库)      │  │ (广告变现)       │   │
│  │ + Vite       │  │              │  │                  │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Zustand (状态管理) + TanStack Query (数据获取)          │  │
│  └────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    BUSINESS LOGIC LAYER (Rust)               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Tauri Commands (IPC 接口)                               │  │
│  │ ├─ account_manager.rs    (账户CRUD)                     │  │
│  │ ├─ api_monitor.rs        (调度器+检测引擎)              │  │
│  │ ├─ prediction_engine.rs  (超支预测算法)                  │  │
│  │ ├─ alert_system.rs       (告警规则引擎)                  │  │
│  │ └─ auth.rs               (JWT鉴权+Token管理)            │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Provider Adapters (多服务商适配)                         │  │
│  │ ├─ openai_provider.rs                                 │  │
│  │ ├─ anthropic_provider.rs                              │  │
│  │ ├─ glm_provider.rs         (智谱AI)                    │  │
│  │ ├─ google_provider.rs      (Gemini)                    │  │
│  │ └─ azure_provider.rs       (Azure OpenAI)              │  │
│  └────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                         DATA LAYER                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ SQLite     │  │ keyring    │  │ File System│           │
│  │ (历史数据)  │  │ (API Keys) │  │ (配置/日志) │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈详情

#### 前端 (React Layer)

| 技术 | 版本 | 用途 |
|------|------|------|
| **React** | 18.x | UI 框架 |
| **TypeScript** | 5.x | 类型安全 |
| **Vite** | 5.x | 构建工具 |
| **Zustand** | 4.x | 轻量状态管理 |
| **TanStack Query** | 5.x | 服务端状态+缓存 |
| **Recharts** | 2.x | 图表库（趋势图） |
| **Tailwind CSS** | 3.x | 原子化CSS（可选，或手写CSS变量） |

#### 后端 (Tauri/Rust Layer)

| 技术 | 版本 | 用途 |
|------|------|------|
| **Tauri** | 2.0 | 桌面应用框架 |
| **Rust** | 1.75+ | 系统编程语言 |
| **tokio** | 1.x | 异步运行时 |
| **reqwest** | 0.11 | HTTP 客户端（调用API）|
| **serde_json** | 1.x | JSON 序列化 |
| **sqlx** | 0.7 | SQLite 异步驱动 |
| **jsonwebtoken** | 9.x | JWT 生成（用于GLM等）|
| **keyring** | 2.x | 操作系统凭据管理器 |
| **chrono** | 0.4 | 时间处理 |
| **tauri-plugin-notification** | 2.x | 系统通知 |
| **tauri-plugin-sql** | 2.x | SQLite 插件 |

#### 数据存储

| 存储方式 | 内容 | 安全措施 |
|---------|------|---------|
| **SQLite** (本地文件) | 历史采样数据、配置项 | 可选 SQLCipher 加密 |
| **keyring** (OS集成) | API Keys 加密存储 | 操作系统级别保护 |
| **JSON/TOML 文件 | 应用设置、主题偏好 | 明文（非敏感）|

---

## 核心功能

### 功能清单（优先级排序）

#### P0 - 必须实现 (MVP)

##### 1. 两段式实时监控

**这是产品的灵魂功能**，直接移植自用户的原始 Python 脚本：

```rust
// src-tauri/src/api_monitor.rs

pub struct ApiMonitor {
    accounts: Vec<AccountHandle>,
    snapshot_phase: bool,  // true = 快照阶段, false = 长效阶段
}

impl ApiMonitor {
    /// 阶段1: 10秒快速检测（启动后前30秒）
    async fn run_snapshot_phase(&self, account: &Account) -> DetectionResult {
        let b1 = self.get_balance(account).await?;
        tokio::time::sleep(Duration::from_secs(10)).await;
        let b2 = self.get_balance(account).await?;

        let delta = b1 - b2;

        if delta > 0.0 {
            DetectionResult {
                status: AccountStatus::Active,
                consumption_10s: delta,
                rate_per_min: delta * 6.0,
                confidence: 0.95, // 10秒差值置信度高
            }
        } else {
            DetectionResult {
                status: AccountStatus::Idle,
                consumption_10s: 0.0,
                rate_per_min: 0.0,
                confidence: 0.90,
            }
        }
    }

    /// 阶段2: 60秒长效监控（30秒后持续运行）
    async fn run_continuous_monitoring(&self, account: &Account) -> MonitoringEvent {
        loop {
            tokio::time::sleep(Duration::from_secs(60)).await;

            let current = self.get_balance(account).await;
            let prev = self.get_last_balance(account.id);

            match (current, prev) {
                (Some(curr), Some(prev)) => {
                    let consume = prev - curr;
                    let event = MonitoringEvent {
                        timestamp: Utc::now(),
                        account_id: account.id,
                        balance: curr,
                        consumption_delta: consume,
                        rate_per_min: consume, // 已经是每分钟
                    };

                    // 通过 Tauri Event 推送到前端
                    self.emit_event("monitoring-update", &event).await;

                    // 存储到 SQLite
                    self.store_sampling_point(&event).await;
                }
                _ => {}
            }
        }
    }
}
```

**前端消费事件**:

```typescript
// src/hooks/useApiMonitor.ts
import { listen } from '@tauri-apps/api/event';

export function useApiMonitor() {
  const [accounts, setAccounts] = useMonitorStore(state => [state.accounts, state.setAccounts]);

  useEffect(() => {
    // 监听 Rust 后端推送的监控事件
    const unlisten = listen<MonitoringEvent>('monitoring-update', (event) => {
      const { account_id, balance, consumption_delta, rate_per_min } = event.payload;

      setAccounts(prev => prev.map(acc =>
        acc.id === account_id
          ? {
              ...acc,
              balance,
              consumptionRate: rate_per_min,
              status: consumption_delta > 0 ? 'active' : 'idle',
              lastUpdated: new Date(),
            }
          : acc
      ));
    });

    return () => { unlisten.then(fn => fn()); };
  }, []);

  return accounts;
}
```

##### 2. 多账户树形结构

**数据模型**:

```typescript
// src/types/account.ts

export interface Account {
  id: string;                      // UUID
  name: string;                    // "OpenAI 个人项目"
  provider: ProviderType;          // 'openai' | 'anthropic' | 'glm' | 'google' | 'azure'
  apiKeyEncrypted: string;         // 加密后的 API Key (不存储明文!)
  
  // 余额信息
  balance: number;                 // 当前余额 ($ 或 tokens)
  currency: string;                // 'USD' | 'tokens'
  
  // Plan 信息
  plan: PlanInfo;
  
  // 实时状态
  status: AccountStatus;
  consumptionRate: number;         // 当前速率 ($/min or tokens/min)
  lastUpdated: Date;
  
  // 预测结果 (计算得出)
  prediction?: PredictionResult;
}

export interface PlanInfo {
  name: string;                    // "GLM Pro", "Pay-as-you-go"
  quota: number;                   // 月度配额上限
  quotaUsed: number;               // 已使用量
  resetCycle: ResetCycleType;
  nextResetDate: string;           // ISO 8601 格式
  daysUntilReset: number;          // 计算字段
}

export type ResetCycleType =
  | 'monthly'      // 每月1号重置
  | 'quarterly'    // 按季度
  | 'annual'       // 按年
  | 'custom';      // 自定义日期

export type AccountStatus =
  | 'idle'         // 空闲 (10秒内无变动)
  | 'detecting'    // 检测中 (启动后前30秒)
  | 'active'       // 使用中 (检测到消耗)
  | 'predicting';  // 预测中 (连续多次采样)

export interface PredictionResult {
  willExhaustBeforeReset: boolean; // 是否会在重置前耗尽
  estimatedRemainingAtReset: number; // 重置时预计剩余量
  daysUntilExhaustion: number;     // 预计多少天后耗尽 (如果会)
  confidence: number;              // 置信度 (0-100%)
  basedOnSamples: number;          // 基于最近N次采样
}
```

##### 3. Plan 重置时间追踪

**实时倒计时组件**:

```typescript
// src/components/CountdownTimer.tsx
import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  targetDate: string;              // ISO 8601
  cycleType: ResetCycleType;
}

export function CountdownTimer({ targetDate, cycleType }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000); // 每秒更新

    return () => clearInterval(interval);
  }, [targetDate]);

  if (cycleType === 'pay-as-you-go') {
    return <span className="text-muted">∞ Unlimited</span>;
  }

  return (
    <span className="font-mono text-sm">
      {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
    </span>
  );
}

function calculateTimeLeft(targetDate: string): TimeLeft {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60 * 60)) / 1000),
  };
}
```

##### 4. 超支预测算法

```rust
// src-tauri/src/prediction_engine.rs

pub struct PredictionEngine;

impl PredictionEngine {
    /// 预测账户是否会在重置前耗尽配额
    pub fn predict_exhaustion(
        &self,
        account: &Account,
        recent_samples: &[SamplingPoint], // 最近N次采样
    ) -> PredictionResult {
        if recent_samples.len() < 3 {
            // 采样不足，无法预测
            return PredictionResult {
                will_exhaust_before_reset: false,
                confidence: 0.0,
                ..Default::default()
            };
        }

        // 计算加权平均速率（最近的样本权重更高）
        let weighted_rate = self.calculate_weighted_average_rate(recent_samples);

        // 计算剩余天数
        let days_until_reset = account.plan.days_until_reset as f64;

        // 线性外推：按当前速率，重置时会用掉多少
        let projected_usage = weighted_rate * days_until_reset * 24.0 * 60.0; // 转 total usage

        let remaining_quota = account.plan.quota - account.plan.quota_used;

        let will_exhaust = projected_usage > remaining_quota;

        // 计算置信度（基于样本数量和方差）
        let confidence = self.calculate_confidence(recent_samples);

        let estimated_remaining = if will_exhaust {
            0.0
        } else {
            remaining_quota - projected_usage
        };

        // 如果会耗尽，计算预计几天后耗尽
        let days_until_exhaustion = if will_exhaust && weighted_rate > 0.0 {
            Some(remaining_quota / (weighted_rate * 24.0 * 60.0))
        } else {
            None
        };

        PredictionResult {
            will_exhaust_before_reset: will_exhaust,
            estimated_remaining_at_reset: estimated_remaining,
            days_until_exhaustion,
            confidence,
            based_on_samples: recent_samples.len() as u32,
        }
    }

    /// 加权平均速率（最近样本权重更高）
    fn calculate_weighted_average_rate(&self, samples: &[SamplingPoint]) -> f64 {
        let mut weighted_sum = 0.0;
        let mut weight_total = 0.0;

        for (i, sample) in samples.iter().enumerate() {
            let weight = (i + 1) as f64; // 线性权重：越新越重要
            weighted_sum += sample.consumption_rate * weight;
            weight_total += weight;
        }

        if weight_total == 0.0 { 0.0 } else { weighted_sum / weight_total }
    }

    /// 计算置信度（基于样本数和数据稳定性）
    fn calculate_confidence(&self, samples: &[SamplingPoint]) -> f64 {
        let n = samples.len() as f64;

        // 样本数因子：越多越可信
        let sample_factor = (n / 10.0).min(1.0); // 10个样本达到100%

        // 稳定性因子：方差越小越可信
        let rates: Vec<f64> = samples.iter().map(|s| s.consumption_rate).collect();
        let variance = calculate_variance(&rates);
        let stability_factor = 1.0 / (1.0 + variance); // 方差越大，因子越小

        (sample_factor * stability_factor * 100.0).min(100.0)
    }
}
```

#### P1 - 应该实现 (v1.1)

##### 5. 智能告警系统

**告警规则引擎**:

```rust
// src-tauri/src/alert_system.rs

pub enum AlertSeverity {
    Info,       // 信息提示
    Warning,    // 警告 (<7天将耗尽)
    Critical,   // 严重 (<3天将耗尽)
}

pub struct AlertRule {
    id: String,
    name: String,
    condition: Box<dyn Fn(&Account, &PredictionResult) -> Option<AlertSeverity>>,
    enabled: bool,
}

impl AlertSystem {
    pub fn check_alerts(&self, account: &Account, prediction: &PredictionResult) -> Vec<Alert> {
        let mut alerts = Vec::new();

        // 规则1: 即将超支 (<7天)
        if prediction.will_exhaust_before_reset {
            if let Some(days) = prediction.days_until_exhaustion {
                if days <= 3.0 {
                    alerts.push(Alert {
                        severity: AlertSeverity::Critical,
                        message: format!("{} 将在 {:.1} 天后耗尽!", account.name, days),
                        account_id: account.id.clone(),
                    });
                } else if days <= 7.0 {
                    alerts.push(Alert {
                        severity: AlertSeverity::Warning,
                        message: format!("{} 可能在 {:.1} 天后耗尽", account.name, days),
                        account_id: account.id.clone(),
                    });
                }
            }
        }

        // 规则2: 用量异常 (今日用量 > 3倍日均)
        // ... 实现略

        alerts
    }
}
```

**前端告警通知**:

```typescript
// src/components/AlertToast.tsx
export function AlertToast({ alert }: { alert: Alert }) {
  const severityStyles = {
    critical: 'border-l-red-500 bg-red-50 dark:bg-red-900/20',
    warning: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    info: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
  };

  return (
    <div className={`border-l-4 p-4 rounded ${severityStyles[alert.severity]}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{alert.message}</p>
        <button onClick={dismiss}>✕</button>
      </div>
    </div>
  );
}
```

##### 6. 历史趋势图表

**Recharts 配置** (极简样式):

```typescript
// src/components/TrendChart.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function TrendChart({ data }: { data: SamplingPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data}>
        <XAxis
          dataKey="timestamp"
          tickFormatter={(time) => format(time, 'HH:mm')}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
        />
        <YAxis
          hide
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="balance"
          stroke="var(--accent)"           // 钢蓝色
          strokeWidth={1.5}
          dot={false}                      // 无圆点
          activeDot={{ r: 3, fill: 'var(--accent)' }} // 仅 hover 显示
          isAnimationActive={false}         // 禁用动画 (保持克制)
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

#### P2 - 锦上添花 (v1.2+)

##### 7. Google AdSense 广告集成

**广告位置策略**:

| 位置 | 尺寸 | 展示时机 | 预估 eCPM |
|------|------|---------|-----------|
| 主窗口底部横幅 | 728x90 Leaderboard | 始终可见 | $1-3 |
| 设置页面侧边栏 | 300x250 Medium Rectangle | 浏览设置时 | $2-5 |
| 详情面板间隙 | Native Ad (自定义尺寸) | 展开账户详情时 | $3-8 |

**实现代码**:

```typescript
// src/components/AdBanner.tsx
import { useEffect, useRef } from 'react';

export function AdBanner({ slot }: { slot: string }) {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 仅在生产环境且非 Pro 版加载广告
    if (import.meta.env.PROD && !isProUser()) {
      loadAdSenseScript();
      initAdUnit(adRef.current, slot);
    }
  }, [slot]);

  return (
    <div className="ad-container">
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-YOUR_PUB_ID"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
```

**变现预期**:
- 日活用户 (DAU): 1,000 (目标)
- 人均日展示次数: 15-20 次 (长期挂后台)
- 日总收入: $50-150/天
- 月收入: $1,500-4,500/月

##### 8. 导出与报告

- CSV 导出 (历史消耗记录)
- PDF 月度报告 (配额使用情况)
- API 数据接口 (供第三方集成)

---

## 数据模型

### ER 图 (简化版)

```
┌─────────────┐       ┌──────────────┐       ┌─────────────┐
│  accounts   │       │  providers   │       │  samplings  │
├─────────────┤       ├──────────────┤       ├─────────────┤
│ id (PK)     │──┐    │ id (PK)      │       │ id (PK)     │
│ name        │  │    │ name         │       │ account_id  │
│ provider_id │──┘    │ display_name │──┐    │ timestamp   │
│ api_key_*   │       │ base_url     │  │    │ balance     │
│ plan_info   │       │ auth_type    │  │    │ consumption │
│ created_at  │       └──────────────┘  │    │ rate        │
│ updated_at  │                          │    │ status     │
└─────────────┘                          └─────────────┘
                                          │ (FK)
                                          │
┌─────────────┐                           │
│  alerts     │                           │
├─────────────┤                           │
│ id (PK)     │                           │
│ account_id  │───────────────────────────┘
│ severity    │
│ message     │
│ read        │
│ created_at  │
└─────────────┘
```

### SQLite Schema

```sql
-- 服务商表
CREATE TABLE providers (
    id TEXT PRIMARY KEY,                    -- 'openai', 'anthropic', etc.
    name TEXT NOT NULL,                     -- 显示名
    display_name TEXT NOT NULL,             -- 'OpenAI', 'Anthropic'
    base_url TEXT NOT NULL,                 -- API endpoint
    auth_type TEXT NOT NULL DEFAULT 'bearer' -- 'bearer', 'jwt', 'api_key'
);

-- 账户表
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,                    -- UUID
    name TEXT NOT NULL,                     -- 账户别名
    provider_id TEXT NOT NULL REFERENCES providers(id),
    api_key_encrypted BLOB NOT NULL,        -- 加密存储
    plan_name TEXT,                         -- Plan 名称
    plan_quota REAL,                        -- 配额上限
    plan_used REAL DEFAULT 0,               -- 已使用
    plan_reset_cycle TEXT,                  -- 'monthly', 'quarterly', etc.
    plan_next_reset_date TEXT,              -- 下次重置日期
    is_active INTEGER DEFAULT 1,            -- 是否启用监控
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 采样数据表 (历史记录)
CREATE TABLE sampling_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    timestamp TEXT NOT NULL,                -- ISO 8601
    balance REAL NOT NULL,
    consumption_delta REAL DEFAULT 0,       -- 与上次采样的差值
    rate_per_min REAL DEFAULT 0,            -- 换算为每分钟速率
    status TEXT NOT NULL,                   -- 'idle', 'active', etc.
    created_at TEXT DEFAULT (datetime('now'))
);

-- 告警记录表
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id TEXT NOT NULL REFERENCES accounts(id),
    severity TEXT NOT NULL,                 -- 'info', 'warning', 'critical'
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 索引优化查询
CREATE INDEX idx_sampling_account_time ON sampling_points(account_id, timestamp DESC);
CREATE INDEX idx_alerts_unread ON alerts(is_read) WHERE is_read = 0;
```

---

## UI/UX 设计

### 设计系统 Tokens

#### 颜色 (OKLCH 色彩空间)

```css
:root {
  /* === Light Theme === */
  --bg-primary: oklch(0.97 0.005 250);           /* #F7F8FA 冷灰白 */
  --bg-secondary: oklch(0.94 0.006 250);         /* #EEF0F2 */
  --bg-elevated: oklch(0.98 0.004 250);          /* #FFFFFF 纯白 */
  --bg-surface: oklch(0.96 0.005 250);           /* #F5F6F8 */

  --text-primary: oklch(0.15 0.02 250);          /* #1A1D23 近黑 */
  --text-secondary: oklch(0.35 0.015 250);        /* #5A5F6B 中灰 */
  --text-muted: oklch(0.55 0.01 250);             /* #8E93A6 浅灰 */

  --accent: oklch(0.55 0.08 230);                /* #4A6FA5 钢蓝 */
  --accent-hover: oklch(0.50 0.10 230);          /* 加深 */
  --accent-subtle: oklch(0.92 0.03 230);         /* 极淡背景 */

  --border: oklch(0.88 0.008 250);               /* #D1D5DB */
  --border-strong: oklch(0.78 0.012 250);        /* #9CA3AF */

  --status-success: oklch(0.65 0.15 145);        /* #10B981 绿 */
  --status-warning: oklch(0.75 0.12 85);         /* #F59E0B 黄 */
  --status-error: oklch(0.60 0.20 25);           /* #EF4444 红 */
  --status-idle: oklch(0.80 0.01 250);           /* 灰色 */

  /* === Dark Theme === */
  [data-theme="dark"] {
    --bg-primary: oklch(0.17 0.008 250);         /* #18191C 深炭灰 */
    --bg-secondary: oklch(0.20 0.009 250);       /* #1F2024 */
    --bg-elevated: oklch(0.22 0.008 250);        /* #25262B */
    --bg-surface: oklch(0.19 0.008 250);         /* #1C1D21 */

    --text-primary: oklch(0.90 0.01 250);        /* #E8EAED 近白 */
    --text-secondary: oklch(0.70 0.012 250);      /* #9CA3AF */
    --text-muted: oklch(0.50 0.008 250);         /* #6B7280 */

    --accent: oklch(0.65 0.10 230);              /* #6B9BD2 亮钢蓝 */
    --accent-hover: oklch(0.70 0.12 230);
    --accent-subtle: oklch(0.25 0.04 230);

    --border: oklch(0.28 0.012 250);             /* #374151 */
    --border-strong: oklch(0.35 0.015 250);      /* #4B5563 */
  }
}
```

#### 字体

```css
:root {
  /* 字体家族 */
  --font-sans: 'Sora', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'Source Code Pro', 'SF Mono', Consolas, monospace;

  /* 字号阶梯 (modular scale 1.25 ratio) */
  --text-xs: 0.75rem;      /* 12px - 辅助标签 */
  --text-sm: 0.875rem;     /* 14px - 次要文本 */
  --text-base: 1rem;       /* 16px - 正文 */
  --text-lg: 1.125rem;     /* 18px - 小标题 */
  --text-xl: 1.25rem;      /* 20px - 大标题 */
  --text-2xl: 1.5rem;      /* 24px - 页面标题 */

  /* 字重 */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* 行高 */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
}
```

#### 间距 (4pt 基础网格)

```css
:root {
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.5rem;    /* 24px */
  --space-6: 2rem;      /* 32px */
  --space-7: 2.5rem;    /* 40px */
  --space-8: 3rem;      /* 48px */
  --space-9: 4rem;      /* 64px */
}
```

### 布局规范

#### 两级视图架构

**Level 1: 托盘弹出面板 (Tray Popup)**
- 尺寸: 320px 宽 × 自适应高度 (最大 480px)
- 定位: 托盘图标上方弹出
- 内容: 活跃账户摘要 + "打开完整面板"按钮
- 交互: 点击外部自动关闭

```
┌─ Tray Popup (320px) ──────────────────┐
│                                        │
│  AI Monitor                    ⚙️ 🌙  │ ← 头部
│                                        │
│  ● 2 个账户活跃                       │ ← 状态摘要
│                                        │
│  OpenAI-A        -$0.23/min           │ ← 活跃账户列表
│  GLM-Pro         -$2.34/min           │
│                                        │
│  ○ 3 个账户空闲                       │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │         打开完整面板              │  │ ← CTA按钮
│  └──────────────────────────────────┘  │
│                                        │
│  [AdSense Banner 320x50]              │ ← 广告位
└────────────────────────────────────────┘
```

**Level 2: 完整主窗口 (Main Window)**
- 尺寸: 最小 900×600，可调整大小/最大化
- 布局: 单列垂直流式
- 内容: 账户列表 + 详情面板（渐进披露）

```
┌─ Main Window (900×600+) ─────────────────────────────────┐
│                                                           │
│  AI API Monitor              🔔 ⚙️ 🌙  [Panel/Tray]     │ ← 28px Header
│                                                           │
│  ┌─ Summary Bar ──────────────────────────────────────┐   │
│  │ 总速率: -2.57/min | 在线: 5 | 总余额: $488.10     │   │ ← 36px 摘要
│  └─────────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ Account List ─────────────────────────────────────┐   │
│  │                                                      │   │
│  │  ● OpenAI-A           $42.50  -0.23/m  🔄 6d 14h  │   │ ← 默认行
│  │    sk-abc...1234                                    │   │
│  │  ─────────────────────────────────────────────────│   │
│  │  ● GLM-Pro             $89.00  -2.34/m  🔄 12d 6h  │   │
│  │    xxx.xxxxxxxx                                     │   │
│  │  ─────────────────────────────────────────────────│   │
│  │  ○ Anthropic-Dev       $128.10  0.00/m  🔄 24d 3h  │   │
│  │    sk-ant-abc...1234                                 │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ Expanded Detail Panel (点击行展开) ──────────────┐   │
│  │                                                      │   │
│  │  Plan: GLM Pro (Monthly)                            │   │
│  │  ████████████░░░░░░ 47% (23.4k / 50k tokens)      │   │
│  │                                                      │   │
│  │  📅 下次重置: 2024-05-01 00:00                      │   │
│  │  ⏳ 倒计时: 12d 06h 18m 32s                          │   │
│  │                                                      │   │
│  │  ⚡ 速率: -2,345 tokens/day                          │   │
│  │  🔮 预测: ✅ 不会超支 (剩余 ~12k, 置信度 87%)       │   │
│  │                                                      │   │
│  │  📊 趋势: ▂▃▅▆▇█▅▃                                  │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                           │
│  ┌─ AdSense Banner (728×90) ──────────────────────────┐   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### 交互规范

#### 状态指示器

| 状态 | 图标 | 颜色 | 尺寸 | 含义 |
|------|------|------|------|------|
| **IDLE** | `○` | `var(--status-idle)` | 8px 圆圈 | 空闲，无消耗 |
| **DETECTING** | `◔` (旋转) | `var(--status-warning)` | 8px 圆圈 | 正在10秒快检 |
| **ACTIVE** | `●` | `var(--status-success)` | 8px 实心圆 | 正在使用 |
| **PREDICTING** | `▲` | `var(--accent)` | 8px 三角 | 预测模式 |

**动画规格**:
- DETECTING 旋转: `animation: spin 1s linear infinite`
- 状态切换: `transition: all 200ms ease-out`
- 数值更新: `transition: color 300ms ease` (颜色渐变提示变化)

#### 点击行为

| 元素 | 默认操作 | 二次操作 |
|------|---------|---------|
| **账户行** | 展开/折叠详情面板 | 无 |
| **账户名** | 无（非链接） | 复制 API Key |
| **余额数字** | 无 | 高亮显示变化 |
| **重置倒计时** | 无 | 显示具体日期时间 |
| **状态指示器** | 无 | 显示最近3次采样详情 |

#### 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + ,` | 打开设置 |
| `Cmd/Ctrl + T` | 切换主题 |
| `Cmd/Ctrl + R` | 手动刷新所有账户 |
| `Escape` | 关闭弹层/收起详情 |
| `↑ / ↓` | 在账户列表间移动焦点 |
| `Enter / Space` | 展开/折叠当前聚焦的账户行 |

### 响应式断点

| 断点 | 宽度 | 布局调整 |
|------|------|---------|
| **Desktop XL** | ≥1200px | 双列：左侧列表(40%) + 右侧固定详情(60%) |
| **Desktop** | 900-1199px | 单列：列表+展开详情（当前设计）|
| **Tablet** | 640-899px | 单列：隐藏"速率"列，缩小字号 |
| **Mobile** | <640px | 单列：隐藏"余额"列，仅显示状态+名称+倒计时 |

---

## 安全架构

### API Key 安全存储方案

```rust
// src-tauri/src/storage/keyring.rs

use keyring::Entry;

pub struct SecureStorage {
    service_name: String, // "ai-api-monitor"
}

impl SecureStorage {
    /// 存储 API Key (加密到操作系统凭据管理器)
    pub fn store_api_key(&self, account_id: &str, api_key: &str) -> Result<()> {
        let entry = Entry::new(&self.service_name, account_id)?;
        entry.set_password(api_key)?;
        Ok(())
    }

    /// 读取 API Key
    pub fn get_api_key(&self, account_id: &str) -> Result<String> {
        let entry = Entry::new(&self.service_name, account_id)?;
        entry.get_password()
    }

    /// 删除 API Key
    pub fn delete_api_key(&self, account_id: &str) -> Result<()> {
        let entry = Entry::new(&self.service_name, account_id)?;
        entry.delete_credential()?;
        Ok(())
    }
}
```

**操作系统支持**:

| OS | 凭据管理器 | 存储位置 |
|----|-----------|---------|
| **Windows** | Credential Manager | `Control Panel → User Accounts → Credential Manager` |
| **macOS** | Keychain Access | `Applications → Utilities → Keychain Access` |
| **Linux** | Secret Service (GNOME Keyring / KWallet) | DBus secret service |

### JWT Token 管理

```rust
// src-tauri/src/auth/jwt_manager.rs

use jsonwebtoken::{encode, EncodingKey, Header};
use chrono::Utc;

pub struct JwtManager;

impl JwtManager {
    /// 生成 GLM API 所需的 JWT Token
    pub fn generate_glm_token(api_key: &str) -> Result<String> {
        let (api_id, secret) = parse_api_key(api_key)?;

        let payload = Claims {
            api_key: api_id,
            exp: (Utc::now() + Duration::hours(1)).timestamp() as usize,
            iat: Utc::now().timestamp() as usize,
        };

        let token = encode(
            &Header::default(),
            &payload,
            &EncodingKey::from_secret(secret.as_bytes()),
        )?;

        Ok(token)
    }

    /// Token 缓存 (内存中，TTL 1小时)
    pub async fn get_or_refresh_token(
        &self,
        account: &Account,
    ) -> Result<String> {
        // 检查缓存
        if let Some(cached) = TOKEN_CACHE.get(&account.id) {
            if !cached.is_expired() {
                return Ok(cached.token.clone());
            }
        }

        // 生成新 Token
        let api_key = self.decrypt_api_key(&account.api_key_encrypted)?;
        let token = Self::generate_glm_token(&api_key)?;

        // 更新缓存
        TOKEN_CACHE.insert(account.id.clone(), CachedToken::new(token));

        Ok(token)
    }
}
```

### 网络安全

- ✅ 所有 API 请求强制 HTTPS
- ✅ 证书校验（禁止自签名证书）
- ✅ 请求超时设置 (10s connect, 30s read)
- ✅ User-Agent 标识: `AI-API-Monitor/1.0`
- ✅ Rate Limiting: 遵守各服务商限制 (通常 60 req/min)

### 数据安全

- ✅ SQLite 数据库文件权限: `600` (仅所有者读写)
- ✅ 可选 SQLCipher 加密 (用户启用后)
- ✅ 敏感字段 (API Key) 从不写入日志
- ✅ 错误信息脱敏 (不暴露 Token/Key 片段)

---

## 商业化方案

### 免费增值模式 (Freemium)

| 功能 | Free 版 | Pro 版 ($4.99/月 或 $29.99/年) |
|------|--------|-------------------------------|
| **账户数量** | 最多 3 个账户 | 无限账户 |
| **服务商数量** | 最多 2 个服务商 | 全部支持 (5+) |
| **刷新频率** | 最低 60 秒 | 可调 10s-60s |
| **历史数据保留** | 7 天 | 90 天 |
| **广告** | 有广告 | **完全去广告** |
| **导出功能** | ❌ | CSV/PDF |
| **邮件告警** | ❌ | ✅ |
| **优先支持** | 社区论坛 | 专属 Discord + Email |

### 广告变现细节

**Google AdSense 配置**:

```html
<!-- 主窗口底部 -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-PUBLISHER_ID"
     data-ad-slot="SLOT_ID_BOTTOM_BANNER"
     data-ad-format="horizontal"
     data-full-width-responsive="true">
</ins>

<!-- 设置页侧边栏 -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-PUBLISHER_ID"
     data-ad-slot="SLOT_ID_SIDEBAR_RECT"
     data-ad-format="rectangle">
</ins>
```

**广告策略原则**:
1. **不打断核心功能**: 广告不在账户列表中间插入
2. **不影响可读性**: 广告区域明确边界，不与内容混淆
3. **尊重用户体验**: 不使用弹窗广告、自动播放视频
4. **相关性优先**: 展示开发者工具类广告 (云服务、IDE、API 平台)

### 收入预估模型

**保守估计 (Year 1)**:

| 指标 | Q1 | Q2 | Q3 | Q4 |
|------|-----|-----|-----|-----|
| MAU (月活) | 500 | 2,000 | 5,000 | 10,000 |
| DAU/MAU 比 | 30% | 35% | 40% | 45% |
| 日均展示/用户 | 15 | 18 | 20 | 22 |
| 日总展示次数 | 2,250 | 12,600 | 40,000 | 99,000 |
| 平均 eCPM | $2.00 | $2.20 | $2.50 | $3.00 |
| **日广告收入** | **$4.50** | **$27.72** | **$100** | **$297** |
| **月广告收入** | **$135** | **$831** | **$3,000** | **$8,910** |
| Pro 订阅收入 | $50 | $250 | $750 | $1,500 |
| **月总收入** | **$185** | **$1,081** | **$3,750** | **$10,410** |

---

## 实施路线图

### Phase 1: MVP (Week 1-2)

**目标**: 可运行的桌面应用，核心监控功能可用

- [ ] **Day 1-2**: 项目初始化
  - [ ] `npm create tauri-app@latest ai-api-monitor -- --template react-ts`
  - [ ] 安装依赖: zustand, recharts, @tanstack/react-query
  - [ ] 配置 Tailwind CSS (或 CSS Variables 系统)
  - [ ] 设置 ESLint + Prettier

- [ ] **Day 3-4**: Rust 后端骨架
  - [ ] 实现 `account_manager.rs` (CRUD 操作)
  - [ ] 实现 `storage/keyring.rs` (API Key 安全存储)
  - [ ] 实现 `providers/openai_provider.rs` (第一个适配器)
  - [ ] 定义 Tauri Commands IPC 接口

- [ ] **Day 5-7**: 前端核心 UI
  - [ ] 实现 `AccountList` 组件 (扁平列表)
  - [ ] 实现 `CountdownTimer` 组件 (Plan 重置倒计时)
  - [ ] 实现 `AccountDetailPanel` (渐进披露详情)
  - [ ] 实现 Light/Dark 主题切换

- [ ] **Day 8-10**: 监控引擎
  - [ ] 实现 `api_monitor.rs` (两段式监控逻辑)
  - [ ] 实现 Tauri Event 推送机制
  - [ ] 前端 `useApiMonitor` Hook 消费事件
  - [ ] 状态指示器 (IDLE/DETECTING/ACTIVE)

- [ ] **Day 11-14**: 集成测试 + 打包
  - [ ] 端到端测试 (添加账户 → 监控 → 查看数据)
  - [ ] 系统托盘集成 (Tray Icon + Menu)
  - [ ] Windows/Mac 打包 (MSI + DMG)
  - [ ] Bug 修复 + 性能优化

**交付物**:
- ✅ 可安装的 `.msi` / `.dmg` 安装包
- ✅ 支持至少 1 个服务商 (OpenAI)
- ✅ 两段式监控正常工作
- ✅ Plan 重置倒计时显示正确
- ✅ 基础告警 (控制台输出)

### Phase 2: 多服务商 + 完善 (Week 3-4)

- [ ] **Provider 适配器**
  - [ ] Anthropic Provider
  - [ ] GLM (智谱) Provider (含 JWT 鉴权)
  - [ ] Google Gemini Provider
  - [ ] Azure OpenAI Provider

- [ ] **预测引擎**
  - [ ] `prediction_engine.rs` 完整实现
  - [ ] 加权平均算法
  - [ ] 置信度计算
  - [ ] 前端预测面板 UI

- [ ] **告警系统**
  - [ ] `alert_system.rs` 规则引擎
  - [ ] 系统通知 (Toast + Sound)
  - [ ] 告警历史记录
  - [ ] 告警配置界面

- [ ] **历史数据**
  - [ ] SQLite 存储采样点
  - [ ] Recharts 趋势图
  - [ ] 时间范围筛选 (1h/6h/24h/7d/30d)

- [ ] **UX 打磨**
  - [ ] 响应式布局完善
  - [ ] 键盘快捷键
  - [ ] 动画微调
  - [ ] 无障碍优化 (WCAG 2.1 AA)

**交付物**:
- ✅ 支持 5 个主流 AI 服务商
- ✅ 超支预测准确率 > 85%
- ✅ 完整告警系统
- ✅ 30天历史数据可视化

### Phase 3: 商业化 (Month 2)

- [ ] **广告集成**
  - [ ] Google AdSense 申请 + 审核
  - [ ] 广告组件封装 (`AdBanner`)
  - [ ] 广告展示逻辑 (Free 版显示, Pro 版隐藏)
  - [ ] 广告性能监控 (展示次数, CTR, RPM)

- [ ] **订阅系统**
  - [ ] 用户账号系统 (邮箱注册/登录)
  - [ ] 支付集成 (Stripe / 支付宝)
  - [ ] License Key 本地验证
  - [ ] Pro 功能解锁逻辑

- [ ] **导出功能**
  - [ ] CSV 导出 (历史消耗)
  - [ ] PDF 月度报告 (使用 jsPDF / react-pdf)
  - [ ] 打印友好样式

- [ ] **多语言**
  - [ ] i18n 框架 (react-i18next)
  - [ ] 英文/中文双语
  - [ ] 语言包提取

**交付物**:
- ✅ 广告正常展示并产生收入
- ✅ Pro 订阅购买流程通畅
- ✅ 导出功能可用
- ✅ 中英文界面

### Phase 4: 增长优化 (Month 3+)

- [ ] **性能优化**
  - [ ] WebAssembly 加速预测计算
  - [ ] 虚拟滚动 (账户 > 50 时)
  - [ ] 后台唤醒优化 (macOS/Windows)
  - [ ] 内存占用优化 (目标 < 80MB)

- [ ] **高级功能**
  - [ ] 团队协作 (共享仪表盘)
  - [ ] Web Dashboard (远程查看)
  - [ ] Slack/Telegram Bot 通知
  - [ ] CLI 工具 (headless 模式)

- [ ] **生态扩展**
  - [ ] VS Code 插件 (侧边栏显示余额)
  - [ ] 浏览器 Extension (网页版 API 调用计数)
  - [ ] API 开放平台 (第三方集成)

- [ ] **增长策略**
  - [ ] Product Hunt 发布
  - [ ] 技术博客/教程 (SEO)
  - [ ] 社区建设 (Discord/GitHub Discussions)
  - [ ] KOL 合作 (YouTube/Twitter 开发者博主)

---

## 附录

### A. 参考资源

- **Tauri 2.0 文档**: https://v2.tauri.app/
- **React 18 文档**: https://react.dev/
- **Recharts 文档**: https://recharts.org/
- **Zustand 文档**: https://zustand-demo.pmnd.rs/
- **Impeccable Design System**: [.impeccable.md](/.impeccable.md)

### B. 原型文件

| 版本 | 文件 | 状态 | 说明 |
|------|------|------|------|
| V1 | `prototype.html` | ❌ 否决 | 赛博朋克霓虹风 (太"AI") |
| V2 | `prototype-v2.html` | ❌ 否决 | 克制风格初版 (缺核心功能) |
| V3 | `prototype-v3.html` | ❌ 否决 | 加入多账户+预测 (页面混乱) |
| **V4** | **`prototype-v4.html`** | **✅ 批准** | **最终版 (极简+Plan重置)** |

### C. 竞品分析

| 产品 | 类型 | 优势 | 劣势 |
|------|------|------|------|
| **OpenAI Dashboard** | Web | 官方数据 | 仅 OpenAI, 无多服务商 |
| **Langfuse** | SaaS | 功能强大 | 付费贵, 需自托管 |
| **Helicone** | SaaS | 开源 | 配置复杂, 非桌面端 |
| **Portkey** | SaaS | 网关+监控 | 重, 非个人工具 |
| **AI API Monitor Pro** | **桌面** | **轻量/离线/隐私** | **初期功能有限** |

### D. 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| **API 变更** | 某服务商接口改版 | 高 | 适配器模式隔离, 快速迭代 |
| **广告政策违规** | Google 封禁账号 | 低 | 遵守政策, 不诱导点击 |
| **性能问题** | 长时间运行内存泄漏 | 中 | Rust 内存安全 + 定期压力测试 |
| **竞争加剧** | 大厂推出类似产品 | 中 | 聚焦差异化 (轻量/隐私/桌面) |
| **用户增长慢** | 收入不及预期 | 中 | SEO + 社区 + 免费增值模式 |

---

## 文档元信息

- **作者**: AI Design Assistant (Impeccable Skill)
- **审核状态**: ✅ 用户已批准 (2026-04-24)
- **下一步**: 调用 `/writing-plans` 技能创建详细实施计划
- **最后更新**: 2026-04-24

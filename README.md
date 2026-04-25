# CPMS - Coding Plan Monitoring System

> *Know your API usage. Before your plan runs out.*

Real-time desktop monitor for AI API token & balance usage across multiple providers. Built with Tauri 2 + React.

---

## Features

- **Real-time Monitoring** — 10s snapshot detection + 60s long-term tracking cycle
- **Multi-provider** — Zhipu GLM (Pay-as-you-go), GLM Coding Plan (z.ai), MiniMax (CN/Global), DeepSeek
- **Model-level Tracking** — Each account binds to a specific model with independent status
- **Consumption Rate** — Real-time rate display (tokens/min or currency/min) with color-coded alerts
- **Overspend Prediction** — Time-to-exhaust forecast based on consumption rate, compared against reset cycle
- **Plan Reset Countdown** — Live days/hours/minutes until quota resets
- **Floating Widget** — Glassmorphism always-on-top mini window for quick glance
- **Bilingual UI** — Chinese / English one-click switch
- **Dark / Light Theme** — System-adaptive or manual toggle
- **Privacy-first** — All data stored locally. API keys encrypted with OS credential manager. Zero telemetry.

---

## Supported Providers

| Provider | Models | Billing |
|----------|--------|---------|
| **Zhipu GLM** | GLM-5.1, GLM-5, GLM-4-Plus, GLM-4-Air, GLM-4-Flash, GLM-4-Long, GLM-4V-Plus | Pay-as-you-go |
| **GLM Coding Plan** | GLM-5.1, GLM-5, GLM-4.7, GLM-4.6, GLM-4.5, GLM-4.5-Air | Coding Plan (z.ai) |
| **MiniMax (CN)** | MiniMax-M2.7, MiniMax-M2.5, MiniMax-M2.1, MiniMax-M2-her, Hailuo 2.3 | Token Plan |
| **MiniMax (Global)** | MiniMax-M2.7, MiniMax-M2.5, MiniMax-M2.1, MiniMax-M2-her, Hailuo 2.3 | Token Plan |
| **DeepSeek** | DeepSeek-V3.2, DeepSeek-R1, DeepSeek-Coder, DeepSeek-V3.1 | Pay-as-you-go |

---

## Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | >= 18 |
| Rust | >= 1.75 (via [rustup.rs](https://rustup.rs)) |
| OS | Windows 10+ / macOS 12+ |

### Install & Run

```bash
git clone https://github.com/creditai/Coding-Plan-Monitoring-System.git
cd Coding-Plan-Monitoring-System
npm install
npm run tauri dev
```

### Build for Production

```bash
npm run tauri build
```

Output: `src-tauri/target/release/bundle/`

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Desktop Framework | [Tauri 2.0](https://v2.tauri.app/) (Rust + Webview2) |
| Frontend | React 18 + TypeScript + Vite |
| State Management | [Zustand](https://zustand.pmnd.rs/) with localStorage persistence |
| i18n | Custom bilingual system (zero runtime deps) |
| Styling | CSS Variables (light/dark themes) |
| Encryption | AES-GCM via Tauri (OS machine key) |

---

## Architecture

```
Desktop App (Tauri)
├── Frontend (React)
│   ├── Dashboard Mode — Full monitoring view with account list, stats, predictions
│   └── Widget Mode — Compact always-on-top floating window
├── Backend (Rust)
│   ├── Provider API adapters (GLM, MiniMax, DeepSeek)
│   ├── Machine key generation for API key encryption
│   └── Balance/quota fetching with JWT support
└── Storage
    ├── localStorage (Zustand persist) — Account data, preferences
    └── Encrypted API keys — AES-GCM with OS-derived machine key
```

---

## Security

| Concern | Solution |
|---------|----------|
| API Key Storage | AES-GCM encrypted, key derived from OS machine ID |
| Network | HTTPS only, direct provider API calls |
| Local Data | Browser localStorage, never leaves the machine |
| Telemetry | None. Zero network calls except provider APIs you configure |

---

## How Monitoring Works

1. **Snapshot Phase (10s interval)** — Rapid balance checks to detect active usage
2. **Tracking Phase (60s interval)** — Long-term consumption rate calculation
3. **Prediction Engine** — Extrapolates current consumption rate to estimate time-to-exhaust
4. **Status Indicators** — Green (idle), Red pulse (active/consuming), Blue (detecting)

---

## License

[MIT](LICENSE)

---

<p align="center">Made by <a href="https://github.com/creditai">creditai</a></p>

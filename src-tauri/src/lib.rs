#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::{Manager, Emitter};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BalanceResult {
    pub balance: f64,
    pub is_token: bool,
    pub currency: String,
    pub total_usage: Option<f64>,
    pub plan_name: Option<String>,
    pub quota: Option<f64>,
    pub quota_used: Option<f64>,
    pub tokens_percentage: Option<f64>,
    pub next_reset: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
async fn create_widget_window(app: tauri::AppHandle) -> Result<(), String> {
    use std::fs;
    use std::path::PathBuf;

    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }

    let widget_html = include_str!("../../widget.html");

    let widget_label = format!("widget_{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis());

    let html_path: PathBuf = app_dir.join(format!("{}.html", widget_label));
    fs::write(&html_path, widget_html).map_err(|e| e.to_string())?;

    let url = format!("file://{}", html_path.to_string_lossy());
    eprintln!("[Widget] Loading: {}", url);

    let widget_window = tauri::WebviewWindowBuilder::new(
        &app,
        &widget_label,
        tauri::WebviewUrl::External(url.parse().map_err(|e| format!("{:?}", e))?),
    )
    .title("CPMS Widget")
    .inner_size(220.0, 160.0)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .center()
    .build()
    .map_err(|e| e.to_string())?;

    let widget_window_clone = widget_window.clone();
    let _widget_label = widget_label.clone();
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(std::time::Duration::from_secs(30));
            let _ = widget_window_clone.emit("widget-ping", ());
        }
    });

    eprintln!("[Widget] Created: {}", _widget_label);
    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetAccountData {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub balance: f64,
    pub status: String,
    pub plan: Option<WidgetPlanData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetPlanData {
    pub tokens_percentage: Option<f64>,
    pub next_reset_date: Option<String>,
}

#[tauri::command]
async fn update_widget_data(app: tauri::AppHandle, accounts: Vec<WidgetAccountData>) -> Result<(), String> {
    let windows = app.webview_windows();
    for (label, window) in windows {
        if label.starts_with("widget_") {
            let _ = window.emit("widget-data", &accounts);
        }
    }
    Ok(())
}

#[tauri::command]
async fn close_all_widgets(app: tauri::AppHandle) -> Result<(), String> {
    let windows = app.webview_windows();
    let widget_labels: Vec<String> = windows.keys()
        .filter(|label| label.starts_with("widget_"))
        .cloned()
        .collect();
    for label in widget_labels {
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.close();
        }
    }
    Ok(())
}

#[tauri::command]
async fn close_current_widget(app: tauri::AppHandle, label: String) -> Result<(), String> {
    eprintln!("[Widget] Close requested for: {}", label);
    if let Some(window) = app.get_webview_window(&label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn get_machine_key(app: tauri::AppHandle) -> Result<String, String> {
    use std::fs;
    use std::path::PathBuf;

    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }

    let key_file: PathBuf = app_dir.join(".machine_key");

    if key_file.exists() {
        let key = fs::read_to_string(&key_file).map_err(|e| e.to_string())?;
        return Ok(key.trim().to_string());
    }

    use sha2::{Sha256, Digest};
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".into());
    let username = whoami::username();
    let path_str = app_dir.to_string_lossy().to_string();
    let mut hasher = Sha256::new();
    hasher.update(hostname.as_bytes());
    hasher.update(username.as_bytes());
    hasher.update(path_str.as_bytes());
    hasher.update(b"cpms-salt-2024");
    let hash = hasher.finalize();
    let new_key: String = hash.iter().take(16).map(|b| format!("{:02x}", b)).collect();

    fs::write(&key_file, &new_key).map_err(|e| e.to_string())?;
    Ok(new_key)
}

#[tauri::command]
async fn fetch_balance(
    provider: String,
    api_key: String,
    _model: Option<String>,
) -> Result<BalanceResult, String> {
    eprintln!("[fetch_balance] provider={}, key_len={}", provider, api_key.len());
    match provider.as_str() {
        "openai" => fetch_openai_balance(&api_key).await,
        "glm" => fetch_glm_balance(&api_key).await,
        "glm-coding-plan" => fetch_glm_coding_plan_balance(&api_key).await,
        "minimax-cn" => fetch_minimax_cn_balance(&api_key).await,
        "minimax-global" => fetch_minimax_global_balance(&api_key).await,
        "qwen" => fetch_qwen_balance(&api_key).await,
        "kimi-cn" => fetch_kimi_cn_balance(&api_key).await,
        "kimi-global" => fetch_kimi_global_balance(&api_key).await,
        "deepseek" => fetch_deepseek_balance(&api_key).await,
        _ => Err(format!("Unsupported provider: {}", provider)),
    }
}

async fn fetch_openai_balance(api_key: &str) -> Result<BalanceResult, String> {
    let client = reqwest::Client::new();
    
    let res = client
        .get("https://api.openai.com/v1/dashboard/billing/subscription")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        if status == 401 {
            return Ok(BalanceResult {
                balance: 0.0,
                is_token: false,
                currency: "USD".into(),
                total_usage: None,
                plan_name: None,
                quota: None,
                quota_used: None,
                tokens_percentage: None,
                next_reset: None,
                error: Some("auth_failed".into()),
            });
        }
        return Err(format!("OpenAI API error {}: {}", status, body));
    }

    #[derive(Deserialize)]
    struct SubResponse {
        hard_limit_usd: f64,
        system_hard_limit_usd: f64,
    }

    let sub: SubResponse = res.json().await.map_err(|e| e.to_string())?;

    let usage_res = client
        .get("https://api.openai.com/v1/dashboard/billing/usage?start_date=2026-01-01&end_date=2026-12-31")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await;

    let total_usage = match usage_res {
        Ok(r) if r.status().is_success() => {
            #[derive(Deserialize)]
            struct Usage { total_usage: Option<f64> }
            let u: Usage = r.json().await.unwrap_or(Usage { total_usage: None });
            u.total_usage
        },
        _ => None,
    };

    Ok(BalanceResult {
        balance: (sub.hard_limit_usd - sub.system_hard_limit_usd).max(0.0),
        is_token: false,
        currency: "USD".into(),
        total_usage,
        plan_name: Some("Pay-as-you-go".into()),
        quota: Some(sub.hard_limit_usd),
        quota_used: Some(sub.system_hard_limit_usd),
        tokens_percentage: None,
        next_reset: None,
        error: None,
    })
}

async fn fetch_minimax_cn_balance(api_key: &str) -> Result<BalanceResult, String> {
    let client = reqwest::Client::new();

    let endpoints = vec![
        ("https://www.minimaxi.com/v1/token_plan/remains", "CNY"),
    ];

    for (url, currency) in endpoints {
        eprintln!("[MiniMax-CN] Trying: {}", url);

        let res = client
            .get(url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .send()
            .await;

        match res {
            Ok(response) => {
                let status = response.status();
                let body_text = response.text().await.unwrap_or_default();
                eprintln!("[MiniMax-CN] {} => status={}, body={}", url, status, &body_text[..body_text.len().min(800)]);

                if status.is_success() {
                    #[derive(Deserialize)]
                    struct MmRemains { model_remains: Option<Vec<MmModelRemain>> }
                    #[derive(Deserialize)]
                     struct MmModelRemain {
                         remains_time: Option<i64>,
                         end_time: Option<i64>,
                         current_interval_total_count: Option<i64>,
                         current_interval_usage_count: Option<i64>,
                         model_name: Option<String>,
                     }

                    if let Ok(data) = serde_json::from_str::<MmRemains>(&body_text) {
                        if let Some(remains) = data.model_remains {
                            if let Some(first) = remains.first() {
                                let remain_ms = first.remains_time.unwrap_or(0);
                                let end_time = first.end_time.unwrap_or(0);
                                let total_count = first.current_interval_total_count.unwrap_or(0);
                                let used_count = first.current_interval_usage_count.unwrap_or(0);
                                let balance_minutes = (remain_ms as f64) / 1000.0 / 60.0;
                                let quota = total_count as f64;
                                let quota_used = used_count as f64;
                                let next_reset = if end_time > 0 {
                                    let secs = (end_time / 1000) as i64;
                                    chrono::DateTime::from_timestamp(secs, 0).map(|dt| dt.to_rfc3339())
                                } else { None };
                                return Ok(BalanceResult {
                                    balance: balance_minutes,
                                    is_token: true,
                                    currency: currency.into(),
                                    total_usage: None,
                                    plan_name: Some("MiniMax (CN)".into()),
                                    quota: Some(quota),
                                    quota_used: Some(quota_used),
                                    tokens_percentage: if total_count > 0 { Some((used_count as f64 / total_count as f64) * 100.0) } else { None },
                                    next_reset,
                                    error: None,
                                });
                            }
                        }
                    }
                }
                if status == 401 || status == 403 {
                    return Ok(BalanceResult {
                        balance: 0.0, is_token: true, currency: currency.into(),
                        total_usage: None, plan_name: None, quota: None, quota_used: None, tokens_percentage: None,
                        next_reset: None, error: Some("auth_failed".into()),
                    });
                }
            },
            Err(e) => {
                eprintln!("[MiniMax-CN] {} => error: {}", url, e);
                continue;
            },
        }
    }

    Ok(BalanceResult {
        balance: 0.0, is_token: true, currency: "CNY".into(),
        total_usage: None, plan_name: None, quota: None, quota_used: None, tokens_percentage: None,
        next_reset: None, error: Some("auth_failed".into()),
    })
}

async fn fetch_minimax_global_balance(api_key: &str) -> Result<BalanceResult, String> {
    let client = reqwest::Client::new();

    let endpoints = vec![
        ("https://www.minimax.io/v1/token_plan/remains", "USD"),
    ];

    for (url, currency) in endpoints {
        eprintln!("[MiniMax-Global] Trying: {}", url);

        let res = client
            .get(url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .send()
            .await;

        match res {
            Ok(response) => {
                let status = response.status();
                let body_text = response.text().await.unwrap_or_default();
                eprintln!("[MiniMax-Global] {} => status={}, body={}", url, status, &body_text[..body_text.len().min(800)]);

                if status.is_success() {
                    #[derive(Deserialize)]
                    struct MmRemains { model_remains: Option<Vec<MmModelRemain>> }
                    #[derive(Deserialize)]
                    struct MmModelRemain {
                        remains_time: Option<i64>,
                        end_time: Option<i64>,
                        current_interval_total_count: Option<i64>,
                        current_interval_usage_count: Option<i64>,
                        model_name: Option<String>,
                    }

                    if let Ok(data) = serde_json::from_str::<MmRemains>(&body_text) {
                        if let Some(remains) = data.model_remains {
                            if let Some(first) = remains.first() {
                                let remain_ms = first.remains_time.unwrap_or(0);
                                let end_time = first.end_time.unwrap_or(0);
                                let total_count = first.current_interval_total_count.unwrap_or(0);
                                let used_count = first.current_interval_usage_count.unwrap_or(0);
                                let balance_minutes = (remain_ms as f64) / 1000.0 / 60.0;
                                let quota = total_count as f64;
                                let quota_used = used_count as f64;
                                let next_reset = if end_time > 0 {
                                    let secs = (end_time / 1000) as i64;
                                    chrono::DateTime::from_timestamp(secs, 0).map(|dt| dt.to_rfc3339())
                                } else { None };
                                return Ok(BalanceResult {
                                    balance: balance_minutes,
                                    is_token: true,
                                    currency: currency.into(),
                                    total_usage: None,
                                    plan_name: Some("MiniMax (Global)".into()),
                                    quota: Some(quota),
                                    quota_used: Some(quota_used),
                                    tokens_percentage: if total_count > 0 { Some((used_count as f64 / total_count as f64) * 100.0) } else { None },
                                    next_reset,
                                    error: None,
                                });
                            }
                        }
                    }
                }
                if status == 401 || status == 403 {
                    return Ok(BalanceResult {
                        balance: 0.0, is_token: true, currency: currency.into(),
                        total_usage: None, plan_name: None, quota: None, quota_used: None, tokens_percentage: None,
                        next_reset: None, error: Some("auth_failed".into()),
                    });
                }
            },
            Err(e) => {
                eprintln!("[MiniMax-Global] {} => error: {}", url, e);
                continue;
            },
        }
    }

    Ok(BalanceResult {
        balance: 0.0, is_token: true, currency: "USD".into(),
        total_usage: None, plan_name: None, quota: None, quota_used: None, tokens_percentage: None,
        next_reset: None, error: Some("auth_failed".into()),
    })
}

async fn fetch_qwen_balance(api_key: &str) -> Result<BalanceResult, String> {
    let client = reqwest::Client::new();

    let endpoints = vec![
        ("https://dashscope.aliyuncs.com/api/v1/user/balance", "CNY", "Qwen (CN)"),
        ("https://dashscope-intl.aliyuncs.com/api/v1/user/balance", "USD", "Qwen (Global)"),
    ];

    for (url, currency, plan_name) in endpoints {
        let res = client
            .get(url)
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await;

        match res {
            Ok(response) => {
                if response.status().is_success() {
                    #[derive(Deserialize)]
                    struct QwBody { data: Option<QwData> }
                    #[derive(Deserialize)]
                    struct QwData { remaining_balance: Option<f64>, consumed_amount: Option<f64> }

                    if let Ok(body) = response.json::<QwBody>().await {
                        if let Some(data) = body.data {
                            return Ok(BalanceResult {
                                balance: data.remaining_balance.unwrap_or(0.0),
                                is_token: true,
                                currency: currency.into(),
                                total_usage: data.consumed_amount,
                                plan_name: Some(format!("{} (Pay-as-you-go / Free Tier)", plan_name)),
                                quota: None,
                                quota_used: data.consumed_amount,
                                tokens_percentage: None,
                                next_reset: None,
                                error: None,
                            });
                        }
                    }
                }
            },
            Err(_) => continue,
        }
    }

    Ok(BalanceResult {
        balance: 0.0, is_token: true, currency: "CNY".into(),
        total_usage: None, plan_name: None, quota: None, quota_used: None, tokens_percentage: None,
        next_reset: None, error: Some("auth_failed".into()),
    })
}

async fn fetch_kimi_cn_balance(api_key: &str) -> Result<BalanceResult, String> {
    let client = reqwest::Client::new();

    let endpoints = vec![
        "https://api.moonshot.cn/v1/users/me/balance",
    ];

    for url in endpoints {
        let res = client
            .get(url)
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await;

        match res {
            Ok(response) => {
                if response.status().is_success() {
                    #[derive(Deserialize)]
                    struct KmBody { data: Option<KmData> }
                    #[derive(Deserialize)]
                    struct KmData { available_balance: f64, voucher_total: Option<f64> }

                    if let Ok(body) = response.json::<KmBody>().await {
                        if let Some(data) = body.data {
                            return Ok(BalanceResult {
                                balance: data.available_balance,
                                is_token: true,
                                currency: "CNY".into(),
                                total_usage: None,
                                plan_name: Some("Kimi (CN)".into()),
                                quota: data.voucher_total,
                                quota_used: None,
                                tokens_percentage: None,
                                next_reset: None,
                                error: None,
                            });
                        }
                    }
                }
            },
            Err(_) => continue,
        }
    }

    Ok(BalanceResult {
        balance: 0.0, is_token: true, currency: "CNY".into(),
        total_usage: None, plan_name: None, quota: None, quota_used: None, tokens_percentage: None,
        next_reset: None, error: Some("auth_failed".into()),
    })
}

async fn fetch_kimi_global_balance(api_key: &str) -> Result<BalanceResult, String> {
    let client = reqwest::Client::new();

    let endpoints = vec![
        "https://api.moonshot.ai/v1/users/me/balance",
    ];

    for url in endpoints {
        let res = client
            .get(url)
            .header("Authorization", format!("Bearer {}", api_key))
            .send()
            .await;

        match res {
            Ok(response) => {
                if response.status().is_success() {
                    #[derive(Deserialize)]
                    struct KmBody { data: Option<KmData> }
                    #[derive(Deserialize)]
                    struct KmData { available_balance: f64, voucher_total: Option<f64> }

                    if let Ok(body) = response.json::<KmBody>().await {
                        if let Some(data) = body.data {
                            return Ok(BalanceResult {
                                balance: data.available_balance,
                                is_token: true,
                                currency: "USD".into(),
                                total_usage: None,
                                plan_name: Some("Kimi (Global)".into()),
                                quota: data.voucher_total,
                                quota_used: None,
                                tokens_percentage: None,
                                next_reset: None,
                                error: None,
                            });
                        }
                    }
                }
            },
            Err(_) => continue,
        }
    }

    Ok(BalanceResult {
        balance: 0.0, is_token: true, currency: "USD".into(),
        total_usage: None, plan_name: None, quota: None, quota_used: None, tokens_percentage: None,
        next_reset: None, error: Some("auth_failed".into()),
    })
}

async fn fetch_deepseek_balance(api_key: &str) -> Result<BalanceResult, String> {
    let client = reqwest::Client::new();

    let res = client
        .get("https://api.deepseek.com/user/balance")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
        if res.status() == 401 || res.status() == 403 {
            return Ok(BalanceResult {
                balance: 0.0, is_token: true, currency: "CNY".into(),
                total_usage: None, plan_name: None, quota: None, quota_used: None, tokens_percentage: None,
                next_reset: None, error: Some("auth_failed".into()),
            });
        }
        return Err(format!("DeepSeek API error {}", res.status()));
    }

    #[derive(Deserialize)]
    struct DsBody { balance_infos: Vec<DsInfo> }
    #[derive(Deserialize)]
    struct DsInfo { currency: String, total_balance: String, topped_up_balance: Option<String>, granted_balance: Option<String> }

    let body: DsBody = res.json().await.map_err(|e| e.to_string())?;
    let info = body.balance_infos.into_iter().next();

    match info {
        Some(i) => {
            let parse_f = |s: &str| s.parse::<f64>().unwrap_or(0.0);
            let total = parse_f(&i.total_balance);
            let topped = i.topped_up_balance.as_ref().map(|s| parse_f(s)).unwrap_or(0.0);
            let granted = i.granted_balance.as_ref().map(|s| parse_f(s)).unwrap_or(0.0);
            Ok(BalanceResult {
                balance: total,
                is_token: true,
                currency: i.currency,
                total_usage: None,
                plan_name: Some("DeepSeek".into()),
                quota: Some(total),
                quota_used: None,
                tokens_percentage: None,
                next_reset: None,
                error: None,
            })
        },
        None => Ok(BalanceResult {
            balance: 0.0, is_token: true, currency: "CNY".into(),
            total_usage: None, plan_name: Some("Free Tier".into()), quota: None, quota_used: None, tokens_percentage: None,
            next_reset: None, error: Some("auth_failed".into()),
        }),
    }
}

fn generate_glm_jwt(api_key: &str) -> Result<String, String> {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;

    let parts: Vec<&str> = api_key.splitn(2, '.').collect();
    if parts.len() != 2 {
        return Err("Invalid GLM API key format: expected id.secret".into());
    }
    let key_id = parts[0];
    let secret = parts[1];

    let header = base64_url_safe(r#"{"alg":"HS256","sign_type":"SIGN"}"#);
    let payload = base64_url_safe(&format!(r#"{{"api_key":"{}","exp":{},"timestamp":{}}}"#,
        key_id,
        chrono::Utc::now().timestamp() as i64 + 3600,
        chrono::Utc::now().timestamp() as i64,
    ));

    let mut mac: Hmac<Sha256> = Hmac::new_from_slice(secret.as_bytes())
        .map_err(|e| e.to_string())?;
    mac.update(format!("{}.{}", header, payload).as_bytes());
    let signature = base64_url_safe(&hex::encode(mac.finalize().into_bytes()));

    Ok(format!("{}.{}.{}", header, payload, signature))
}

fn base64_url_safe(s: &str) -> String {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD.encode(s)
        .replace('+', "-")
        .replace('/', "_")
        .trim_end_matches('=')
        .to_string()
}

async fn fetch_glm_balance(api_key: &str) -> Result<BalanceResult, String> {
    fetch_glm_general_balance(api_key).await
}

async fn fetch_glm_coding_plan_balance(api_key: &str) -> Result<BalanceResult, String> {
    let client = reqwest::Client::new();

    let quota_endpoints = vec![
        "https://api.z.ai/api/monitor/usage/quota/limit",
        "https://open.bigmodel.cn/api/monitor/usage/quota/limit",
    ];

    for endpoint in &quota_endpoints {
        eprintln!("[GLM-CodingPlan] Trying quota API: {}", endpoint);

        let res = client
            .get(*endpoint)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("accept", "application/json")
            .send()
            .await;

        match res {
            Ok(response) => {
                let status = response.status();
                let body_text = response.text().await.unwrap_or_default();
                eprintln!("[GLM-CodingPlan] {} => status={}, body={}", endpoint, status, &body_text[..body_text.len().min(500)]);

                if status.is_success() && !body_text.is_empty() {
                    if let Ok(result) = parse_zai_quota_response(&body_text) {
                        eprintln!("[GLM-CodingPlan] Parsed quota: balance={}", result.balance);
                        return Ok(result);
                    }
                    eprintln!("[GLM-CodingPlan] Failed to parse quota response, trying legacy parse...");
                    if let Ok(result) = parse_glm_balance_response(&body_text, true) {
                        return Ok(result);
                    }
                }
            },
            Err(e) => {
                eprintln!("[GLM-CodingPlan] {} => error: {}", endpoint, e);
            }
        }
    }

    eprintln!("[GLM-CodingPlan] Quota API failed, trying JWT balance endpoints...");

    if let Ok(jwt) = generate_glm_jwt(api_key) {
        let jwt_endpoints = vec![
            "https://open.bigmodel.cn/api/coding/paas/v4/users/me/balance",
            "https://open.bigmodel.cn/api/paas/v4/users/me/balance",
        ];

        for endpoint in &jwt_endpoints {
            eprintln!("[GLM-CodingPlan] Trying JWT: {}", endpoint);

            let res = client
                .get(*endpoint)
                .header("Authorization", format!("Bearer {}", jwt))
                .send()
                .await;

            match res {
                Ok(response) => {
                    let status = response.status();
                    let body_text = response.text().await.unwrap_or_default();
                    eprintln!("[GLM-CodingPlan] JWT {} => status={}, body={}", endpoint, status, &body_text[..body_text.len().min(300)]);

                    if status.is_success() && !body_text.is_empty() {
                        if let Ok(result) = parse_glm_balance_response(&body_text, true) {
                            return Ok(result);
                        }
                    }
                },
                Err(e) => {
                    eprintln!("[GLM-CodingPlan] JWT {} => error: {}", endpoint, e);
                }
            }
        }
    }

    Ok(BalanceResult {
        balance: -1.0,
        is_token: true,
        currency: "CNY".into(),
        total_usage: None,
        plan_name: Some("GLM Coding Plan".into()),
        quota: None,
        quota_used: None,
        tokens_percentage: None,
        next_reset: None,
        error: Some("coding_plan_no_balance_api".into()),
    })
}

fn parse_zai_quota_response(body_text: &str) -> Result<BalanceResult, String> {
    #[derive(Deserialize)]
    struct ZaiQuotaResponse {
        data: Option<serde_json::Value>,
        plan_name: Option<String>,
        plan: Option<String>,
        plan_type: Option<String>,
        package_name: Option<String>,
        success: Option<bool>,
    }

    let resp: ZaiQuotaResponse = serde_json::from_str(body_text)
        .map_err(|e| format!("Z.ai quota parse error: {}", e))?;

    let data = resp.data.ok_or("No data field in Z.ai quota response")?;

    let level = data.get("level")
        .and_then(|v| v.as_str())
        .unwrap_or("");

    let plan_label = resp.plan_name
        .or(resp.plan)
        .or(resp.plan_type)
        .or(resp.package_name)
        .unwrap_or_else(|| {
            if level.is_empty() {
                "GLM Coding Plan".into()
            } else {
                format!("GLM Coding Plan · {}", level)
            }
        });

    let limits = data.get("limits")
        .and_then(|v| v.as_array())
        .ok_or("No limits array in Z.ai quota response")?;

    let mut tokens_percentage: f64 = 0.0;
    let mut tokens_next_reset_ms: Option<i64> = None;
    let mut time_usage: f64 = 0.0;
    let mut time_remaining: f64 = 0.0;
    let mut time_current: f64 = 0.0;
    let mut time_next_reset_ms: Option<i64> = None;
    let mut time_percentage: f64 = 0.0;

    for limit in limits {
        let limit_type = limit.get("type")
            .and_then(|v| v.as_str())
            .unwrap_or("");

        let percentage = limit.get("percentage")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);

        let reset_ms = limit.get("nextResetTime")
            .and_then(|v| v.as_i64());

        match limit_type {
            "TOKENS_LIMIT" => {
                tokens_percentage = percentage;
                tokens_next_reset_ms = reset_ms;
            },
            "TIME_LIMIT" => {
                time_usage = limit.get("usage").and_then(|v| v.as_f64()).unwrap_or(0.0);
                time_remaining = limit.get("remaining").and_then(|v| v.as_f64()).unwrap_or(0.0);
                time_current = limit.get("currentValue").and_then(|v| v.as_f64()).unwrap_or(0.0);
                time_percentage = percentage;
                time_next_reset_ms = reset_ms;
            },
            _ => {}
        }
    }

    let reset_ms = tokens_next_reset_ms.or(time_next_reset_ms);

    let (balance, quota, quota_used) = if time_usage > 0.0 {
        (time_remaining, time_usage, time_current)
    } else if tokens_percentage > 0.0 {
        let remaining_pct = 100.0 - tokens_percentage;
        (remaining_pct, 100.0, tokens_percentage)
    } else {
        (0.0, 0.0, 0.0)
    };

    let next_reset = reset_ms.map(|ms| {
        let secs = ms / 1000;
        chrono::DateTime::from_timestamp(secs, 0)
            .map(|dt| dt.to_rfc3339())
            .unwrap_or_default()
    });

    eprintln!("[GLM-CodingPlan] Parsed: plan={}, tokens_pct={}%, time={}/{}/{} ({}%), reset={:?}",
        plan_label, tokens_percentage, time_current, time_usage, time_remaining, time_percentage, next_reset);

    Ok(BalanceResult {
        balance,
        is_token: true,
        currency: "CNY".into(),
        total_usage: Some(quota_used),
        plan_name: Some(plan_label),
        quota: Some(quota),
        quota_used: Some(quota_used),
        tokens_percentage: if tokens_percentage > 0.0 { Some(tokens_percentage) } else { None },
        next_reset,
        error: None,
    })
}

async fn fetch_glm_general_balance(api_key: &str) -> Result<BalanceResult, String> {
    let jwt = generate_glm_jwt(api_key)?;
    let client = reqwest::Client::new();

    let res = client
        .get("https://open.bigmodel.cn/api/paas/v4/users/me/balance")
        .header("Authorization", format!("Bearer {}", jwt))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = res.status();
    let body_text = res.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        if status == 401 || body_text.contains("invalid api_key") || body_text.contains("token") {
            return Ok(BalanceResult {
                balance: 0.0,
                is_token: true,
                currency: "CNY".into(),
                total_usage: None,
                plan_name: None,
                quota: None,
                quota_used: None,
                tokens_percentage: None,
                next_reset: None,
                error: Some("auth_failed".into()),
            });
        }
        return Err(format!("GLM API error {}: {}", status, body_text));
    }

    parse_glm_balance_response(&body_text, false)
}

fn parse_glm_balance_response(body_text: &str, is_coding_plan: bool) -> Result<BalanceResult, String> {
    #[derive(Deserialize)]
    struct GlmResponse {
        code: Option<i32>,
        msg: Option<String>,
        data: Option<serde_json::Value>,
        success: Option<bool>,
    }

    let glm_res: GlmResponse = serde_json::from_str(body_text)
        .map_err(|e| format!("GLM JSON parse error: {}. Response: {}", e, &body_text[..body_text.len().min(500)]))?;

    if let Some(code) = glm_res.code {
        if code != 0 && code != 200 {
            return Ok(BalanceResult {
                balance: 0.0,
                is_token: true,
                currency: "CNY".into(),
                total_usage: None,
                plan_name: Some(format!("Error: {}", glm_res.msg.unwrap_or_default())),
                quota: None,
                quota_used: None,
                tokens_percentage: None,
                next_reset: None,
                error: Some("api_error".into()),
            });
        }
    }

    match glm_res.data {
        Some(data) => {
            let total_balance = data.get("total_balance").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let available_balance = data.get("available_balance").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let voucher_total = data.get("voucher_total").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let voucher_available = data.get("voucher_available").and_then(|v| v.as_f64()).unwrap_or(0.0);

            let plan_name = if is_coding_plan {
                "GLM Coding Plan (Subscription)"
            } else {
                "General API (Pay-as-you-go)"
            };

            Ok(BalanceResult {
                balance: available_balance + voucher_available,
                is_token: true,
                currency: "CNY".into(),
                total_usage: Some(total_balance - available_balance),
                plan_name: Some(plan_name.into()),
                quota: Some((total_balance + voucher_total).max(0.0)),
                quota_used: Some(total_balance + voucher_total - available_balance - voucher_available),
                tokens_percentage: None,
                next_reset: None,
                error: None,
            })
        },
        None => {
            #[derive(Deserialize)]
            struct GlmBalanceDirect {
                total_balance: Option<f64>,
                available_balance: Option<f64>,
                voucher_total: Option<f64>,
                voucher_available: Option<f64>,
                balance: Option<f64>,
            }

            let direct: GlmBalanceDirect = serde_json::from_str(body_text)
                .unwrap_or(GlmBalanceDirect {
                    total_balance: None,
                    available_balance: None,
                    voucher_total: None,
                    voucher_available: None,
                    balance: None,
                });

            let balance_val = direct.available_balance
                .or(direct.balance)
                .unwrap_or(0.0);

            let plan_name = if is_coding_plan {
                "GLM Coding Plan"
            } else {
                "General API"
            };

            Ok(BalanceResult {
                balance: balance_val,
                is_token: true,
                currency: "CNY".into(),
                total_usage: direct.total_balance.map(|t| t - balance_val),
                plan_name: Some(plan_name.into()),
                quota: direct.total_balance.or(direct.voucher_total),
                quota_used: direct.total_balance.map(|t| t - balance_val),
                tokens_percentage: None,
                next_reset: None,
                error: None,
            })
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![fetch_balance, get_machine_key, create_widget_window, update_widget_data, close_all_widgets, close_current_widget])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

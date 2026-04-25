import { useState, useEffect, useCallback, useMemo } from 'react';
import { useMonitorStore } from './stores/monitorStore';
import { i18n, PROVIDER_OPTIONS, PROVIDER_MODELS } from './i18n/locales';
import type { Account, ProviderType, ResetCycleType, AccountStatus } from './types/account';
import './App.css';

function t(key: string, lang: 'zh' | 'en', params?: Record<string, string | number>): string {
  const val = i18n[lang][key];
  if (typeof val === 'function') return val(...(Object.values(params || {}).map(v => typeof v === 'number' ? v : 0)));
  if (!val) return key;
  if (params) {
    let result = String(val);
    for (const [k, v] of Object.entries(params)) result = result.replace(`{${k}}`, String(v));
    return result;
  }
  return String(val);
}

const formatBalance = (balance: number, isToken: boolean, lang: 'zh' | 'en' = 'zh'): string => {
  if (isToken) return balance >= 1000 ? `${(balance / 1000).toFixed(1)}k` : String(balance);
  const prefix = lang === 'zh' ? '¥' : '$';
  return `${prefix}${balance.toFixed(2)}`;
};

const formatRate = (rate: number, isToken: boolean, lang: 'zh' | 'en'): string => {
  if (rate === 0) return t('idleText', lang);
  const abs = Math.abs(rate);
  const unit = isToken ? t('tokensPerMin', lang) : t('perMin', lang);
  const sign = rate > 0 ? '-' : '+';
  return `${sign}${abs.toFixed(1)} ${unit}`;
};

const getResetCycleLabel = (cycle: ResetCycleType, resetDate: Date | null, lang: 'zh' | 'en'): string => {
  switch (cycle) {
    case 'monthly': return `${t('monthly', lang)} · ${resetDate?.getDate() || ''}`;
    case 'quarterly': return `Q${Math.ceil(((resetDate?.getMonth() || 0) + 1) / 3)} ${t('quarterly', lang)}`;
    case 'annual': return `${t('annual', lang)} · ${resetDate?.getFullYear() || ''}`;
    case 'payg': return t('payg', lang);
    default: return t('custom', lang);
  }
};

function getCountdown(targetDate: Date | null) {
  if (!targetDate) return null;
  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    isUrgent: diff < 259200000,
    isSoon: diff < 604800000,
  };
}

function formatCountdown(cd: NonNullable<ReturnType<typeof getCountdown>>, lang: 'zh' | 'en'): string {
  return t('timeFormatDays', lang, { days: cd.days, hours: cd.hours, minutes: cd.minutes });
}

function formatCountdownShort(cd: NonNullable<ReturnType<typeof getCountdown>>, lang: 'zh' | 'en'): string {
  return t('timeFormatShort', lang, { days: cd.days, hours: cd.hours });
}

function StatusIndicator({ status, lang }: { status: AccountStatus; lang: 'zh' | 'en' }) {
  const statusMap: Record<AccountStatus, string> = {
    active: t('statusActive', lang),
    idle: t('statusIdle', lang),
    detecting: t('statusDetecting', lang),
    predicting: t('statusPredicting', lang)
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div className={`status-indicator ${status}`} />
      <span className={`status-row-label ${status}`}>{statusMap[status]}</span>
    </div>
  );
}

function CountdownTimer({ resetDate, lang }: { resetDate: string | null; lang: 'zh' | 'en' }) {
  const [cd, setCd] = useState(() => getCountdown(resetDate ? new Date(resetDate) : null));

  useEffect(() => {
    const timer = setInterval(
      () => setCd(getCountdown(resetDate ? new Date(resetDate) : null)),
      1000
    );
    return () => clearInterval(timer);
  }, [resetDate]);

  if (!cd) {
    return (
      <>
        <div className="countdown-label">{t('cycle', lang)}</div>
        <div className="countdown-value">{t('symbolInfinity', lang)} {t('unlimited', lang)}</div>
      </>
    );
  }

  return (
    <>
      <div className="countdown-label">{t('nextReset', lang)}</div>
      <div className={`countdown-value ${cd.isUrgent ? 'urgent' : cd.isSoon ? 'soon' : ''}`}>
        {formatCountdown(cd, lang)}
      </div>
    </>
  );
}

function ProgressBar({ used, total, tokensPercentage, lang }: { used: number | null; total: number | null; tokensPercentage: number | null; lang: 'zh' | 'en' }) {
  const hasTokensPct = tokensPercentage !== null && tokensPercentage !== undefined;
  if (!total && !hasTokensPct) return null;

  const pct = hasTokensPct ? tokensPercentage! : (used && total ? (used / total) * 100 : 0);
  const isToken = (total && total > 100) || hasTokensPct;

  return (
    <div className="progress-container">
      <div className="progress-header">
        <span>{t('planName', lang)}</span>
        {hasTokensPct ? (
          <span>{tokensPercentage!.toFixed(0)}%</span>
        ) : (
          <span>{pct.toFixed(0)}% ({formatBalance(used || 0, isToken, lang)} / {formatBalance(total || 0, isToken, lang)})</span>
        )}
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${pct > 80 ? 'danger' : pct > 60 ? 'warning' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hasTokensPct && (
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
          {t('tokensUsed', lang)}: {tokensPercentage!.toFixed(0)}% · {t('tokensRemaining', lang)}: {(100 - tokensPercentage!).toFixed(0)}%
        </div>
      )}
    </div>
  );
}

function PredictionCard({
  prediction,
  lang
}: {
  prediction: NonNullable<Account['prediction']>;
  lang: 'zh' | 'en';
}) {
  if (!prediction) return null;

  const formatTime = (minutes: number | null): string => {
    if (minutes === null || !isFinite(minutes)) return t('symbolInfinity', lang) + ' ' + t('unlimited', lang);
    if (minutes <= 0) return lang === 'zh' ? '已耗尽' : 'Exhausted';
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = Math.floor(minutes % 60);
    if (days > 0) return `${days}${lang === 'zh' ? '天' : 'd'} ${hours}${lang === 'zh' ? '时' : 'h'} ${mins}${lang === 'zh' ? '分' : 'm'}`;
    if (hours > 0) return `${hours}${lang === 'zh' ? '时' : 'h'} ${mins}${lang === 'zh' ? '分' : 'm'}`;
    return `${mins}${lang === 'zh' ? '分' : 'm'}`;
  };

  const cls = prediction.willExhaustBeforeReset
    ? (prediction.timeToExhaustMin !== null && prediction.timeToExhaustMin <= 60 ? 'danger' : 'warning')
    : '';

  return (
    <div className={`prediction-card ${cls}`}>
      <div className="prediction-status">
        <span>{prediction.willExhaustBeforeReset ? t('iconWarning', lang) : t('iconSuccess', lang)}</span>
        <span>
          {prediction.willExhaustBeforeReset
            ? t('willExhaust', lang)
            : t('withinBudget', lang)}
        </span>
      </div>
      <div className="prediction-details">
        <div className="prediction-detail-item">
          <span>{t('bulletPoint', lang)}</span>
          <span>
            {t('estimatedTimeRemaining', lang)}: {formatTime(prediction.timeToExhaustMin)}
          </span>
        </div>
        <div className="prediction-detail-item">
          <span>{t('bulletPoint', lang)}</span>
          <span>
            {t('confidence', lang)}: {prediction.confidence}%
          </span>
        </div>
      </div>
    </div>
  );
}

function AccountRow({ account, lang, onDelete }: { account: Account; lang: 'zh' | 'en'; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isToken = account.balance > 100;

  const balCls = account.balance < (isToken ? 1000 : 10)
    ? 'low'
    : account.balance < (isToken ? 5000 : 20)
      ? 'medium'
      : '';

  const showAlert = account.prediction?.willExhaustBeforeReset &&
    account.plan.daysUntilReset !== null &&
    account.plan.daysUntilReset < 7;

  const alertCls = account.plan.daysUntilReset !== null && account.plan.daysUntilReset < 3
    ? 'danger'
    : 'warning';

  const providerLabel = PROVIDER_OPTIONS.find(p => p.value === account.provider)?.label;
  const providerName = providerLabel ? (providerLabel[lang] || providerLabel.zh || account.provider) : account.provider;

  return (
    <div className={`account-row ${expanded ? 'expanded' : ''}`} onClick={() => setExpanded(!expanded)}>
      <div className="account-left">
        <StatusIndicator status={account.status} lang={lang} />
      </div>

      <div className="account-info">
        <div className="account-name">
          {account.name}
          {account.modelName && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 4 }}>
              · {account.modelName}
            </span>
          )}
          {showAlert && <span className={`alert-badge ${alertCls}`}>!</span>}
        </div>
        <div className="account-key">
          <span className="provider-tag">{providerName}</span>
          <span className="key-mask">{account.apiKeyEncrypted.replace(/./g, '•').slice(0, 8)}</span>
        </div>
      </div>

      <div className="account-balance">
        <div className={`balance-value ${balCls}`}>
          {account.plan.tokensPercentage !== null && account.plan.tokensPercentage !== undefined ? (
            <span style={{ color: 'var(--accent-color)' }}>{account.plan.tokensPercentage.toFixed(0)}%</span>
          ) : (
            formatBalance(account.balance, isToken, lang)
          )}
        </div>
      </div>

      <div className={`consumption-rate ${account.consumptionRate > 0 ? 'negative' : account.consumptionRate < 0 ? 'positive' : ''}`}>
        {formatRate(account.consumptionRate, isToken, lang)}
      </div>

      <div className="account-reset">
        {account.plan.nextResetDate ? (
          <CountdownTimer resetDate={account.plan.nextResetDate} lang={lang} />
        ) : (
          <>
            <div className="countdown-label">{t('cycle', lang)}</div>
            <div className="countdown-value">{t('symbolInfinity', lang)} {t('unlimited', lang)}</div>
          </>
        )}
      </div>

      <div className="expand-icon">{t('iconExpand', lang)}</div>

      {expanded && (
        <div className="detail-panel">
          <div className="detail-left">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{t('planName', lang)}</h3>
              <button
                className="btn-danger-small"
                onClick={(e) => { e.stopPropagation(); onDelete(account.id); }}
                title={t('delete', lang)}
              >
                {t('iconDelete', lang)} {t('delete', lang)}
              </button>
            </div>
            <div className="plan-name">
              {account.plan.name}
              {account.plan.tokensPercentage !== null && (
                <span className="plan-badge">
                  {getResetCycleLabel(
                    account.plan.resetCycle,
                    account.plan.nextResetDate ? new Date(account.plan.nextResetDate) : null,
                    lang
                  )}
                </span>
              )}
            </div>

            {account.plan.tokensPercentage !== null && (
              <>
                <ProgressBar used={account.plan.quotaUsed} total={account.plan.quota} tokensPercentage={account.plan.tokensPercentage} lang={lang} />

                {account.plan.nextResetDate && (
                  <div className="reset-info">
                    <div className="reset-item">
                      <span className="reset-item-label">{t('nextReset', lang)}</span>
                      <span className="reset-item-value">
                        {new Date(account.plan.nextResetDate).toLocaleDateString(
                          lang === 'zh' ? 'zh-CN' : 'en-US',
                          { year: 'numeric', month: 'short', day: 'numeric' }
                        )}
                      </span>
                    </div>
                    <div className="reset-item">
                      <span className="reset-item-label">{t('timeRemaining', lang)}</span>
                      <span className="countdown-timer">
                        {getCountdown(new Date(account.plan.nextResetDate))
                          ? formatCountdownShort(getCountdown(new Date(account.plan.nextResetDate))!, lang)
                          : '--'}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {account.plan.tokensPercentage === null && (
              <div className="reset-info">
                <div className="reset-item">
                  <span className="reset-item-label">{t('cycle', lang)}</span>
                  <span className="reset-item-value">{t('unlimited', lang)}</span>
                </div>
              </div>
            )}
          </div>

          {account.prediction && (
            <div className="prediction-section">
              <h3>{t('predictionAnalysis', lang)}</h3>
              <PredictionCard
                prediction={account.prediction}
                lang={lang}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddModal({
  open,
  onClose,
  lang,
  onAdd
}: {
  open: boolean;
  onClose: () => void;
  lang: 'zh' | 'en';
  onAdd: (acc: Account) => void;
}) {
  const [prov, setProv] = useState<ProviderType | ''>('');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const modelId = (form.elements.namedItem('model') as HTMLSelectElement)?.value;
    const models = PROVIDER_MODELS[prov] || [];
    const found = models.find(m => m.id === modelId);

    onAdd({
      id: crypto.randomUUID(),
      name: (form.elements.namedItem('accountName') as HTMLInputElement).value || '',
      provider: prov as ProviderType,
      model: modelId,
      modelName: found?.name[lang] || modelId || '',
      apiKeyEncrypted: (form.elements.namedItem('apiKey') as HTMLInputElement).value,
      balance: 0,
      status: 'idle',
      consumptionRate: 0,
      plan: {
        name: t('payg', lang),
        quota: null,
        quotaUsed: null,
        tokensPercentage: null,
        resetCycle: 'payg',
        nextResetDate: null,
        daysUntilReset: null
      },
      prediction: null,
      lastUpdated: new Date()
    });

    onClose();
    setProv('');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>{t('addAccountTitle', lang)}</h2>
          <button 
            style={{ background: 'none', border: 'none', fontSize: 'var(--text-lg)', cursor: 'pointer', color: 'var(--text-tertiary)' }} 
            onClick={onClose}
          >{t('iconClose', lang)}</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('accountName', lang)}</label>
            <input
              name="accountName"
              style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-base)', background: 'var(--bg-base)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
              placeholder={t('accountNamePlaceholder', lang)}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('selectProvider', lang)}</label>
            <select
              value={prov}
              onChange={(e) => {
                const v = e.target.value as ProviderType;
                setProv(v);

                const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement;
                if (modelSelect) {
                  modelSelect.innerHTML =
                    `<option value="">${t('selectModel', lang)}</option>` +
                    (PROVIDER_MODELS[v] || [])
                      .map(m => `<option value="${m.id}">${m.name[lang]}</option>`)
                      .join('');
                  modelSelect.disabled = !PROVIDER_MODELS[v]?.length;
                  modelSelect.required = !!PROVIDER_MODELS[v]?.length;
                }
              }}
              required
            >
              <option value="" disabled>{t('selectProvider', lang)}</option>
              {PROVIDER_OPTIONS.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label[lang]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>{t('selectModel', lang)}</label>
            <select id="modelSelect" name="model" disabled required defaultValue="">
              <option value="">{t('selectModel', lang)}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('apiKey', lang)}</label>
            <input
              name="apiKey"
              type="password"
              style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-base)', background: 'var(--bg-base)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)' }}
              placeholder={t('apiKeyPlaceholder', lang)}
              required
              autoComplete="off"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              {t('cancel', lang)}
            </button>
            <button type="submit" className="btn-primary">
              {t('confirm', lang)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const { accounts, lang, theme, addAccount, removeAccount, toggleLang, toggleTheme, startMonitoring, initEncryption } = useMonitorStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);
  const [isWidgetMode, setIsWidgetMode] = useState(false);

  useEffect(() => {
    if (isAlwaysOnTop) {
      document.documentElement.style.setProperty('--widget-z-index', '2147483647');
    } else {
      document.documentElement.style.setProperty('--widget-z-index', '9999');
    }
  }, [isAlwaysOnTop]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    console.log('[App] Mounting, initializing...');
    (async () => {
      console.log('[App] Calling initEncryption...');
      await initEncryption();
      console.log('[App] Calling startMonitoring...');
      startMonitoring();
      console.log('[App] Initialization complete');
    })();
    return () => {
      console.log('[App] Unmounting, stopping monitoring...');
      const { stopMonitoring } = useMonitorStore.getState();
      stopMonitoring();
    };
  }, []);

  useEffect(() => {
    if (accounts.length > 0) {
      const widgetData = accounts.map(a => ({
        id: a.id,
        name: a.name,
        provider: a.provider,
        balance: a.balance,
        status: a.status,
        plan: a.plan.tokensPercentage !== null ? {
          tokens_percentage: a.plan.tokensPercentage,
          next_reset_date: a.plan.nextResetDate,
        } : null,
      }));
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('update_widget_data', { accounts: widgetData }).catch(() => {});
      });
    }
  }, [accounts]);

  console.log('[App] Rendering with accounts:', accounts.length);

  const activeAccounts = accounts.filter(a => a.status === 'active');
  const detectingAccounts = accounts.filter(a => a.status === 'detecting');
  const isAnyoneUsing = activeAccounts.length > 0;
  const isDetecting = detectingAccounts.length > 0 && !isAnyoneUsing;

  const stats = useMemo(() => {
    const hasBalanceAccounts = accounts.filter(a => a.plan.tokensPercentage === null || a.plan.tokensPercentage === undefined);
    return {
      totalBalance: hasBalanceAccounts.reduce((s, a) => s + a.balance, 0),
      activeCount: activeAccounts.length,
      alertCount: accounts.filter(a =>
        a.prediction?.willExhaustBeforeReset &&
        a.plan.daysUntilReset !== null &&
        a.plan.daysUntilReset < 7
      ).length,
      avgRate: accounts.length
        ? accounts.reduce((s, a) => s + a.consumptionRate, 0) / accounts.length
        : 0,
    };
  }, [accounts]);

  const handleAddAccount = useCallback((acc: Account) => {
    addAccount(acc);
    setShowAddModal(false);
  }, [addAccount]);

  const toggleWidgetMode = async () => {
    const newMode = !isWidgetMode;
    setIsWidgetMode(newMode);

    try {
      const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window');
      const win = getCurrentWindow();

      if (newMode) {
        document.documentElement.classList.add('widget-mode-active');
        document.body.classList.add('widget-mode-active');
        setIsAlwaysOnTop(true);
        await win.setAlwaysOnTop(true);
        await win.setDecorations(false);
        await win.setResizable(false);
        await win.setSize(new LogicalSize(260, 135));
      } else {
        document.documentElement.classList.remove('widget-mode-active');
        document.body.classList.remove('widget-mode-active');
        setIsAlwaysOnTop(false);
        await win.setAlwaysOnTop(false);
        await win.setDecorations(true);
        await win.setResizable(true);
        await win.setSize(new LogicalSize(1200, 800));
        await win.center();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={`app-container ${isWidgetMode ? 'widget-mode' : ''}`}>
      {/* Header */}
      <header className={`header ${isWidgetMode ? 'widget-header' : ''}`} {...(isWidgetMode ? { 'data-tauri-drag-region': '' } : {})}>
        <div>
          <h1 className="header-title">{isWidgetMode ? 'CPMS' : t('appTitle', lang)}</h1>
          {!isWidgetMode && <p className="header-subtitle">{t('subtitle', lang)}</p>}
        </div>

        <div className="header-actions">
          {!isWidgetMode && (
            <button
              className="btn-add-header"
              onClick={() => setShowAddModal(true)}
            >
              {t('prefixAdd', lang)}{t('addAccount', lang)}
            </button>
          )}

          <button
            className={isWidgetMode ? 'widget-mode-btn' : 'mode-toggle'}
            onClick={toggleWidgetMode}
            title={isWidgetMode ? t('exitWidgetMode', lang) : t('widgetMode', lang)}
          >
            {isWidgetMode ? '×' : t('widgetMode', lang)}
          </button>

          {!isWidgetMode && (
            <button
              className={`pin-toggle ${isAlwaysOnTop ? 'active' : ''}`}
              onClick={() => setIsAlwaysOnTop(!isAlwaysOnTop)}
              title={t('alwaysOnTop', lang)}
            >
              📌
            </button>
          )}

          {!isWidgetMode && (
            <button className="lang-toggle" onClick={toggleLang}>
              {t('switchLang', lang)}
            </button>
          )}

          {!isWidgetMode && (
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? t('darkMode', lang) : t('lightMode', lang)}
            </button>
          )}
        </div>
      </header>

      {isWidgetMode ? (
        <>
          <button
            className="widget-close-trigger"
            onClick={toggleWidgetMode}
            title={t('exitWidgetMode', lang)}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <div className="widget-view">
            {accounts.length === 0 ? (
              <div className="widget-empty">{t('noAccounts', lang)}</div>
            ) : (
              accounts.slice(0, 4).map(acc => {
                const hasPlan = acc.plan.tokensPercentage !== null;
                const statusClass = acc.status === 'active' ? 'active' : acc.status === 'detecting' ? 'detecting' : 'idle';
                const pct = acc.plan.tokensPercentage ?? 0;
                const isConsuming = acc.consumptionRate > 0;
                const valueClass = hasPlan
                  ? (pct > 80 ? 'danger' : pct > 60 ? 'warning' : '')
                  : (isConsuming ? 'danger' : '');
                const value = hasPlan
                  ? `${pct.toFixed(0)}%`
                  : isConsuming
                    ? `-${Math.abs(acc.consumptionRate).toFixed(1)}/min`
                    : `${t('currencyPrefix', lang)}${acc.balance.toFixed(acc.balance > 100 ? 0 : 2)}`;

                return (
                  <div className={`widget-account-row${isConsuming ? ' consuming' : ''}`} key={acc.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className={`widget-status-dot ${statusClass}`}></span>
                      <span className="widget-account-name">{acc.modelName || acc.name || acc.provider}</span>
                    </div>
                    <span className={`widget-account-value ${valueClass}`}>{value}</span>
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          {/* Usage Banner */}
      {(isAnyoneUsing || isDetecting) ? (
        <div className={`usage-status-banner ${isAnyoneUsing ? 'in-use' : 'detecting'}`}>
          <span className={`status-icon-large ${isDetecting ? 'pulse' : ''}`}>
            {isAnyoneUsing ? t('iconActive', lang) : t('iconDetecting', lang)}
          </span>
          <div className="status-content">
            <div className="status-title">
              {isAnyoneUsing
                ? t('inUseCount', lang, { n: activeAccounts.length })
                : t('detectingCount', lang, { n: detectingAccounts.length })
              }
            </div>

            {isAnyoneUsing && (
              <div className="status-details">
                {activeAccounts.map(acc => (
                  <span key={acc.id} className="status-detail-item">
                    <span className="status-label-active">
                      {t('statusActive', lang)}
                    </span>
                    <span>
                      {acc.name} {formatRate(acc.consumptionRate, acc.balance > 100, lang)}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="usage-status-banner idle">
          <span className="status-icon-large">{t('iconIdle', lang)}</span>
          <div className="status-content">
            <div className="status-title">{t('allIdle', lang)}</div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-bar">
        {[
          {
            label: t('totalBalance', lang),
            val: `${t('currencyPrefix', lang)}${stats.totalBalance.toFixed(2)}`,
            cls: ''
          },
          {
            label: t('activeAccounts', lang),
            val: stats.activeCount.toString(),
            cls: '',
            accent: true
          },
          {
            label: t('alerts', lang),
            val: stats.alertCount.toString(),
            cls: stats.alertCount > 0 ? 'danger' : ''
          },
          {
            label: t('avgConsumption', lang),
            val: `${stats.avgRate.toFixed(2)} ${t('perDay', lang)}`,
            cls: Math.abs(stats.avgRate) > 2 ? 'warning' : ''
          }
        ].map(({ label, val, cls, accent }, i) => (
          <div key={i} className="stat-card">
            <div className="stat-label">{label}</div>
            <div className={`stat-value ${accent ? 'text-accent' : cls}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Account List */}
      <div className="account-list">
        {accounts.map(acc => (
          <AccountRow key={acc.id} account={acc} lang={lang} onDelete={removeAccount} />
        ))}
      </div>
        </>
      )}

      {/* Add Account Modal */}
      <AddModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        lang={lang}
        onAdd={handleAddAccount}
      />
    </div>
  );
}

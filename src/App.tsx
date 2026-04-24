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

const formatBalance = (balance: number, isToken: boolean): string => {
  if (isToken) return balance >= 1000 ? `${(balance / 1000).toFixed(1)}k` : String(balance);
  return `$${balance.toFixed(2)}`;
};

const formatRate = (rate: number, isToken: boolean, lang: 'zh' | 'en'): string => {
  if (rate === 0) return t('idleText', lang);
  const abs = Math.abs(rate);
  const unit = isToken ? t('tokensPerMin', lang) : t('perMin', lang);
  return `${rate > 0 ? '+' : '-'}${abs.toFixed(2)} ${unit}`;
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
        <div className="countdown-value">∞ {t('unlimited', lang)}</div>
      </>
    );
  }

  return (
    <>
      <div className="countdown-label">{t('nextReset', lang)}</div>
      <div className={`countdown-value ${cd.isUrgent ? 'urgent' : cd.isSoon ? 'soon' : ''}`}>
        {cd.days}d {cd.hours}h {cd.minutes}m
      </div>
    </>
  );
}

function ProgressBar({ used, total, lang }: { used: number | null; total: number | null; lang: 'zh' | 'en' }) {
  if (!total) return null;

  const pct = (used || 0) / total * 100;
  const isToken = total > 100;

  return (
    <div className="progress-container">
      <div className="progress-header">
        <span>{t('planName', lang)}</span>
        <span>{pct.toFixed(0)}% ({formatBalance(used || 0, isToken)} / {formatBalance(total, isToken)})</span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${pct > 80 ? 'danger' : pct > 60 ? 'warning' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PredictionCard({
  prediction,
  consumptionRate,
  lang
}: {
  prediction: NonNullable<Account['prediction']>;
  consumptionRate: number;
  lang: 'zh' | 'en';
}) {
  if (!prediction) return null;

  const cls = prediction.willExhaustBeforeReset
    ? (prediction.estimatedRemainingAtReset < 0 ? 'danger' : 'warning')
    : '';

  const absRemaining = Math.abs(prediction.estimatedRemainingAtReset);
  const isTokenUnit = absRemaining > 100;

  return (
    <div className={`prediction-card ${cls}`}>
      <div className="prediction-status">
        <span>{prediction.willExhaustBeforeReset ? '⚠️' : '✅'}</span>
        <span>{t(prediction.willExhaustBeforeReset ? 'willExhaust' : 'withinBudget', lang)}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
          {t('confidence', lang)}: {prediction.confidence}%
        </span>
      </div>
      <div className="prediction-details">
        <div className="prediction-detail-item">
          <span>•</span>
          <span>
            {t('currentRatePrediction', lang, {
              value: formatBalance(absRemaining, isTokenUnit),
              unit: t(prediction.willExhaustBeforeReset ? 'overBudget' : 'remaining', lang)
            })}
          </span>
        </div>
        <div className="prediction-detail-item">
          <span>•</span>
          <span>
            {t('rateDoubleWarning', lang, {
              result: t(prediction.willExhaustBeforeReset ? 'exhaustsEarlier' : 'mayExhaustEarly', lang)
            })}
          </span>
        </div>
        <div className="prediction-detail-item">
          <span>•</span>
          <span>{formatRate(consumptionRate, Math.abs(consumptionRate) > 100, lang)}</span>
        </div>
      </div>
    </div>
  );
}

function AccountRow({ account, lang }: { account: Account; lang: 'zh' | 'en' }) {
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
          <span className="provider-tag">{providerName}</span>
          {account.name}
          {account.modelName && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 4 }}>
              · {account.modelName}
            </span>
          )}
          {showAlert && <span className={`alert-badge ${alertCls}`}>!</span>}
        </div>
        <div className="account-key">{account.apiKeyEncrypted}</div>
      </div>

      <div className="account-balance">
        <div className={`balance-value ${balCls}`}>{formatBalance(account.balance, isToken)}</div>
      </div>

      <div className="consumption-rate">
        {formatRate(account.consumptionRate, isToken, lang)}
      </div>

      <div className="account-reset">
        {account.plan.nextResetDate ? (
          <CountdownTimer resetDate={account.plan.nextResetDate} lang={lang} />
        ) : (
          <>
            <div className="countdown-label">{t('cycle', lang)}</div>
            <div className="countdown-value">∞ {t('unlimited', lang)}</div>
          </>
        )}
      </div>

      <div className="expand-icon">›</div>

      {expanded && (
        <div className="detail-panel">
          <div className="detail-left">
            <h3>{t('planName', lang)}</h3>
            <div className="plan-name">
              {account.plan.name}
              <span className="plan-badge">
                {getResetCycleLabel(
                  account.plan.resetCycle,
                  account.plan.nextResetDate ? new Date(account.plan.nextResetDate) : null,
                  lang
                )}
              </span>
            </div>

            {account.plan.quota && (
              <ProgressBar used={account.plan.quotaUsed} total={account.plan.quota} lang={lang} />
            )}

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
                      ? `${getCountdown(new Date(account.plan.nextResetDate))!.days}d ${getCountdown(new Date(account.plan.nextResetDate))!.hours}h`
                      : '--'}
                  </span>
                </div>
              </div>
            )}

            {!account.plan.nextResetDate && (
              <div className="reset-info">
                <div className="reset-item">
                  <span className="reset-item-label">{t('cycle', lang)}</span>
                  <span className="reset-item-value">{t('unlimited', lang)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="prediction-section">
            <h3>{t('predictionAnalysis', lang)}</h3>
            {account.prediction && (
              <PredictionCard
                prediction={account.prediction}
                consumptionRate={account.consumptionRate}
                lang={lang}
              />
            )}
          </div>
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
      apiKeyEncrypted: '•••••••',
      balance: 0,
      status: 'idle',
      consumptionRate: 0,
      plan: {
        name: t('payg', lang),
        quota: null,
        quotaUsed: null,
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
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('addAccountTitle', lang)}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>{t('accountName', lang)}</label>
              <input
                name="accountName"
                className="form-input"
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
                defaultValue=""
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
              <select id="modelSelect" disabled required defaultValue="">
                <option value="">{t('selectModel', lang)}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('apiKey', lang)}</label>
              <input
                name="apiKey"
                type="password"
                className="form-input"
                placeholder={t('apiKeyPlaceholder', lang)}
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div className="modal-footer">
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
  const { accounts, lang, theme, addAccount, toggleLang, toggleTheme } = useMonitorStore();
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const activeAccounts = accounts.filter(a => a.status === 'active');
  const detectingAccounts = accounts.filter(a => a.status === 'detecting');
  const isAnyoneUsing = activeAccounts.length > 0;
  const isDetecting = detectingAccounts.length > 0 && !isAnyoneUsing;

  const stats = useMemo(() => ({
    totalBalance: accounts.reduce((s, a) => s + a.balance, 0),
    activeCount: activeAccounts.length,
    alertCount: accounts.filter(a =>
      a.prediction?.willExhaustBeforeReset &&
      a.plan.daysUntilReset !== null &&
      a.plan.daysUntilReset < 7
    ).length,
    avgRate: accounts.length
      ? accounts.reduce((s, a) => s + a.consumptionRate, 0) / accounts.length
      : 0,
  }), [accounts]);

  const handleAddAccount = useCallback((acc: Account) => {
    addAccount(acc);
    setShowAddModal(false);
  }, [addAccount]);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div>
          <h1 className="header-title">{t('appTitle', lang)}</h1>
          <p className="header-subtitle">{t('subtitle', lang)}</p>
        </div>

        <div className="header-actions">
          <button
            className="btn-add-header"
            onClick={() => setShowAddModal(true)}
          >
            + {t('addAccount', lang)}
          </button>

          <button className="lang-toggle" onClick={toggleLang}>
            {t('switchLang', lang)}
          </button>

          <button className="theme-toggle" onClick={toggleTheme}>
            {theme === 'light' ? t('darkMode', lang) : t('lightMode', lang)}
          </button>
        </div>
      </header>

      {/* Usage Banner */}
      {(isAnyoneUsing || isDetecting) ? (
        <div className={`usage-status-banner ${isAnyoneUsing ? 'in-use' : 'detecting'}`}>
          <span className={`status-icon-large ${isDetecting ? 'pulse' : ''}`}>
            {isAnyoneUsing ? '●' : '◔'}
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
          <span className="status-icon-large">○</span>
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
            val: `$${stats.totalBalance.toFixed(2)}`,
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
          <AccountRow key={acc.id} account={acc} lang={lang} />
        ))}
      </div>

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

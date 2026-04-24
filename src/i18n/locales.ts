export type Lang = 'zh' | 'en';

export type I18nValue = string | ((...args: number[]) => string);

export interface I18n {
  zh: Record<string, I18nValue>;
  en: Record<string, I18nValue>;
}

export const i18n: I18n = {
  zh: {
    appTitle: 'API Monitor Pro',
    subtitle: '实时余额与用量监控',
    darkMode: '深色',
    lightMode: '浅色',
    switchLang: 'EN',
    addAccount: '添加账户',
    totalBalance: '总余额',
    activeAccounts: '活跃账户',
    alerts: '告警',
    avgConsumption: '平均消耗',
    allIdle: '所有账户空闲',
    detectingCount: (n: number) => `正在检测 ${n} 个账户...`,
    detectingDesc: '执行10秒快照采样以判断是否有人使用',
    inUseCount: (n: number) => `检测到 ${n} 个账户正在使用中`,
    statusActive: '使用中',
    statusIdle: '空闲',
    statusDetecting: '检测中',
    statusPredicting: '预测中',
    cycle: '周期',
    unlimited: '无限',
    planName: 'Plan 名称',
    nextReset: '下次重置',
    timeRemaining: '剩余时间',
    predictionAnalysis: '预测分析',
    recentActivity: '最近活动（最近4次检测）',
    willExhaust: '将在重置前耗尽',
    withinBudget: '预算内',
    confidence: '置信度',
    currentRatePrediction: '按当前速率，重置时预计 {value} {unit}',
    rateDoubleWarning: '若速率翻倍 → {result}',
    exhaustsEarlier: '将提前耗尽',
    mayExhaustEarly: '可能提前2天耗尽',
    overBudget: '超支',
    remaining: '剩余',
    tokensPerMin: 'tokens/分钟',
    perDay: '/天',
    perMin: '/分钟',
    idleText: '空闲',
    payg: '按量付费',
    monthly: '每月',
    quarterly: '季度',
    annual: '年度',
    selectProvider: '选择服务商',
    selectModel: '选择模型',
    accountName: '账户名称',
    accountNamePlaceholder: '例如：OpenAI 个人项目',
    apiKey: 'API Key',
    apiKeyPlaceholder: '输入 API Key...',
    cancel: '取消',
    confirm: '确认添加',
    addAccountTitle: '添加新账户',
  },
  en: {
    appTitle: 'API Monitor Pro',
    subtitle: 'Real-time balance and usage tracking',
    darkMode: 'DARK',
    lightMode: 'LIGHT',
    switchLang: '中文',
    addAccount: 'Add Account',
    totalBalance: 'Total Balance',
    activeAccounts: 'Active Accounts',
    alerts: 'Alerts',
    avgConsumption: 'Avg Consumption',
    allIdle: 'All accounts idle',
    detectingCount: (n: number) => `Detecting ${n} accounts...`,
    detectingDesc: 'Running 10-second snapshot to check usage',
    inUseCount: (n: number) => `${n} account${n > 1 ? 's' : ''} currently in use`,
    statusActive: 'ACTIVE',
    statusIdle: 'IDLE',
    statusDetecting: 'DETECTING',
    statusPredicting: 'PREDICTING',
    cycle: 'Cycle',
    unlimited: 'Unlimited',
    planName: 'Plan',
    nextReset: 'Next Reset',
    timeRemaining: 'Time Remaining',
    predictionAnalysis: 'Prediction Analysis',
    recentActivity: 'Recent Activity (Last 4 checks)',
    willExhaust: 'Will Exhaust Before Reset',
    withinBudget: 'Within Budget',
    confidence: 'Confidence',
    currentRatePrediction: 'At current rate, ~{value} {unit} at reset',
    rateDoubleWarning: 'If rate doubles → {result}',
    exhaustsEarlier: 'exhausts earlier',
    mayExhaustEarly: 'may exhaust 2 days early',
    overBudget: 'over budget',
    remaining: 'remaining',
    tokensPerMin: 'tokens/min',
    perDay: '/day',
    perMin: '/min',
    idleText: 'idle',
    payg: 'Pay-as-you-go',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annual: 'Annual',
    selectProvider: 'Select Provider',
    selectModel: 'Select Model',
    accountName: 'Account Name',
    accountNamePlaceholder: 'e.g. OpenAI Personal',
    apiKey: 'API Key',
    apiKeyPlaceholder: 'Enter API key...',
    cancel: 'Cancel',
    confirm: 'Add Account',
    addAccountTitle: 'Add New Account',
  },
};

export interface ProviderOption {
  value: string;
  label: Record<Lang, string>;
}

export const PROVIDER_OPTIONS: ProviderOption[] = [
  { value: 'openai', label: { zh: 'OpenAI', en: 'OpenAI' } },
  { value: 'anthropic', label: { zh: 'Anthropic (Claude)', en: 'Anthropic (Claude)' } },
  { value: 'glm', label: { zh: '智谱 GLM', en: 'Zhipu GLM' } },
  { value: 'google', label: { zh: 'Google Gemini', en: 'Google Gemini' } },
  { value: 'azure', label: { zh: 'Azure OpenAI', en: 'Azure OpenAI' } },
];

export interface ModelOption {
  id: string;
  name: Record<Lang, string>;
}

export const PROVIDER_MODELS: Record<string, ModelOption[]> = {
  openai: [
    { id: 'gpt-4o', name: { zh: 'GPT-4o', en: 'GPT-4o' } },
    { id: 'gpt-4-turbo', name: { zh: 'GPT-4 Turbo', en: 'GPT-4 Turbo' } },
    { id: 'gpt-3.5-turbo', name: { zh: 'GPT-3.5 Turbo', en: 'GPT-3.5 Turbo' } },
    { id: 'o1', name: { zh: 'o1 (推理)', en: 'o1 (Reasoning)' } },
    { id: 'o3-mini', name: { zh: 'o3-mini', en: 'o3-mini' } },
  ],
  anthropic: [
    { id: 'claude-opus-4', name: { zh: 'Claude Opus 4', en: 'Claude Opus 4' } },
    { id: 'claude-sonnet-4', name: { zh: 'Claude Sonnet 4', en: 'Claude Sonnet 4' } },
    { id: 'claude-haiku-3.5', name: { zh: 'Claude Haiku 3.5', en: 'Claude Haiku 3.5' } },
  ],
  glm: [
    { id: 'glm-4-plus', name: { zh: 'GLM-4-Plus', en: 'GLM-4-Plus' } },
    { id: 'glm-4-air', name: { zh: 'GLM-4-Air', en: 'GLM-4-Air' } },
    { id: 'glm-4-flash', name: { zh: 'GLM-4-Flash', en: 'GLM-4-Flash' } },
    { id: 'glm-4-long', name: { zh: 'GLM-4-Long', en: 'GLM-4-Long' } },
  ],
  google: [
    { id: 'gemini-2.5-pro', name: { zh: 'Gemini 2.5 Pro', en: 'Gemini 2.5 Pro' } },
    { id: 'gemini-2.5-flash', name: { zh: 'Gemini 2.5 Flash', en: 'Gemini 2.5 Flash' } },
    { id: 'gemini-2.0-flash', name: { zh: 'Gemini 2.0 Flash', en: 'Gemini 2.0 Flash' } },
  ],
  azure: [
    { id: 'gpt-4o-azure', name: { zh: 'GPT-4o (Azure)', en: 'GPT-4o (Azure)' } },
    { id: 'gpt-4-turbo-azure', name: { zh: 'GPT-4 Turbo (Azure)', en: 'GPT-4 Turbo (Azure)' } },
    { id: 'dall-e-3', name: { zh: 'DALL-E 3', en: 'DALL-E 3' } },
  ],
};

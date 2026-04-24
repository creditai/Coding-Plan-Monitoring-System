import { create } from 'zustand';
import type { Account } from '../types/account';

interface MonitorState {
  accounts: Account[];
  lang: 'zh' | 'en';
  theme: 'light' | 'dark';
  addAccount: (account: Account) => void;
  removeAccount: (id: string) => void;
  updateAccount: (id: string, data: Partial<Account>) => void;
  toggleLang: () => void;
  toggleTheme: () => void;
}

const nextMonth = new Date();
nextMonth.setDate(nextMonth.getDate() + 15);

const mockAccounts: Account[] = [
  {
    id: 'demo-1',
    name: 'Personal Project',
    provider: 'openai',
    model: 'gpt-4o',
    modelName: 'GPT-4o',
    apiKeyEncrypted: 'sk-••••••••a3f2',
    balance: 23.47,
    status: 'active',
    consumptionRate: -0.23,
    plan: {
      name: 'Pay-as-you-go',
      quota: null,
      quotaUsed: null,
      resetCycle: 'payg',
      nextResetDate: null,
      daysUntilReset: null,
    },
    prediction: {
      willExhaustBeforeReset: false,
      estimatedRemainingAtReset: 12.5,
      confidence: 87,
    },
    lastUpdated: new Date(),
  },
  {
    id: 'demo-2',
    name: 'Company API',
    provider: 'anthropic',
    model: 'claude-opus-4',
    modelName: 'Claude Opus 4',
    apiKeyEncrypted: 'sk-ant-••••••b8c1',
    balance: 4580,
    status: 'idle',
    consumptionRate: 0,
    plan: {
      name: 'Team Plan',
      quota: 10000,
      quotaUsed: 5420,
      resetCycle: 'monthly',
      nextResetDate: nextMonth.toISOString(),
      daysUntilReset: 15,
    },
    prediction: {
      willExhaustBeforeReset: false,
      estimatedRemainingAtReset: 2800,
      confidence: 92,
    },
    lastUpdated: new Date(),
  },
  {
    id: 'demo-3',
    name: 'GLM Dev Test',
    provider: 'glm',
    model: 'glm-4-plus',
    modelName: 'GLM-4-Plus',
    apiKeyEncrypted: '••••••••c7d3',
    balance: 125000,
    status: 'active',
    consumptionRate: -156.8,
    plan: {
      name: 'Coding Plan Pro',
      quota: 500000,
      quotaUsed: 375000,
      resetCycle: 'monthly',
      nextResetDate: nextMonth.toISOString(),
      daysUntilReset: 15,
    },
    prediction: {
      willExhaustBeforeReset: true,
      estimatedRemainingAtReset: -45000,
      confidence: 78,
    },
    lastUpdated: new Date(),
  },
  {
    id: 'demo-4',
    name: 'Gemini Lab',
    provider: 'google',
    model: 'gemini-2.5-pro',
    modelName: 'Gemini 2.5 Pro',
    apiKeyEncrypted: 'AI••••••e2f1',
    balance: 8.92,
    status: 'detecting',
    consumptionRate: -0.05,
    plan: {
      name: 'Pay-as-you-go',
      quota: null,
      quotaUsed: null,
      resetCycle: 'payg',
      nextResetDate: null,
      daysUntilReset: null,
    },
    prediction: null,
    lastUpdated: new Date(),
  },
];

export const useMonitorStore = create<MonitorState>((set) => ({
  accounts: mockAccounts,
  lang: 'zh' as const,
  theme: 'light' as const,

  addAccount: (account) =>
    set((state) => ({ accounts: [...state.accounts, account] })),

  removeAccount: (id) =>
    set((state) => ({ accounts: state.accounts.filter((a) => a.id !== id) })),

  updateAccount: (id, data) =>
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...data } : a)),
    })),

  toggleLang: () =>
    set((state) => ({ lang: state.lang === 'zh' ? 'en' : 'zh' })),

  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}));

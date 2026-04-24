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

export const useMonitorStore = create<MonitorState>((set) => ({
  accounts: [],
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

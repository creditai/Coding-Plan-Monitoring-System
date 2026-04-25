import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Account } from '../types/account';
import { encrypt, decrypt } from '../utils/crypto';

const REFRESH_INTERVAL = 60000;
const SNAPSHOT_INTERVAL = 10000;

interface BalanceSnapshot {
  balance: number;
  timestamp: number;
}

interface MonitorState {
  accounts: Account[];
  lang: 'zh' | 'en';
  theme: 'light' | 'dark';
  _mk: string;
  addAccount: (account: Account) => void;
  removeAccount: (id: string) => void;
  updateAccount: (id: string, data: Partial<Account>) => void;
  toggleLang: () => void;
  toggleTheme: () => void;
  refreshBalance: (id: string) => Promise<void>;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  initEncryption: () => Promise<void>;
  decryptKey: (encrypted: string) => Promise<string>;
}

const snapshots = new Map<string, BalanceSnapshot[]>();
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let snapshotTimer: ReturnType<typeof setInterval> | null = null;
let isRefreshing = false;
let machineKey = '';

export const useMonitorStore = create<MonitorState>()(
  persist(
    (set, get) => ({
      accounts: [],
      lang: 'en' as const,
      theme: 'light' as const,
      _mk: '',

      initEncryption: async () => {
        if (machineKey) return;
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          machineKey = await invoke<string>('get_machine_key');
          set({ _mk: 'initialized' });
          console.log('[Crypto] Machine key loaded');
        } catch (e) {
          console.error('[Crypto] Failed to load machine key:', e);
        }
      },

      decryptKey: async (encrypted: string) => {
        if (!machineKey) await get().initEncryption();
        if (!machineKey) return '';
        try {
          return await decrypt(encrypted, machineKey);
        } catch {
          return encrypted;
        }
      },

      addAccount: async (account) => {
        if (!machineKey) await get().initEncryption();

        let encryptedKey = account.apiKeyEncrypted;
        if (machineKey && !account.apiKeyEncrypted.startsWith('enc:')) {
          encryptedKey = 'enc:' + await encrypt(account.apiKeyEncrypted, machineKey);
        }

        const stored: Account = {
          ...account,
          apiKeyEncrypted: encryptedKey,
        };

        set((s) => ({ accounts: [...s.accounts, stored] }));
        snapshots.set(account.id, []);
        await get().refreshBalance(account.id);
      },

      removeAccount: (id) => {
        snapshots.delete(id);
        set((state) => ({ accounts: state.accounts.filter((a) => a.id !== id) }));
      },

      updateAccount: (id, data) =>
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...data } : a)),
        })),

      toggleLang: () =>
        set((state) => ({ lang: state.lang === 'zh' ? 'en' : 'zh' })),

      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

      refreshBalance: async (id) => {
        const state = get();
        const account = state.accounts.find((a) => a.id === id);
        if (!account || !account.apiKeyEncrypted) return;

        let rawApiKey: string;
        if (account.apiKeyEncrypted.startsWith('enc:')) {
          rawApiKey = await get().decryptKey(account.apiKeyEncrypted.slice(4));
        } else {
          rawApiKey = account.apiKeyEncrypted.replace(/•/g, '');
        }
        if (!rawApiKey) return;

        set((s) => ({
          accounts: s.accounts.map((a) =>
            a.id === id ? { ...a, status: 'detecting' as const } : a
          ),
        }));

        try {
          const { invoke } = await import('@tauri-apps/api/core');
          const result = await invoke<{
            balance: number;
            isToken: boolean;
            currency: string;
            totalUsage?: number;
            planName?: string;
            quota?: number;
            quotaUsed?: number;
            tokensPercentage?: number;
            nextReset?: string;
            error?: string;
          }>('fetch_balance', {
            provider: account.provider,
            apiKey: rawApiKey,
            model: account.model,
          });

          console.log(`[Balance] ${account.provider} result:`, JSON.stringify(result));
          console.log(`[Balance] tokensPercentage from API: ${result.tokensPercentage}, current stored: ${account.plan.tokensPercentage}`);

          if (result.error === 'auth_failed') {
            set((s) => ({
              accounts: s.accounts.map((a) =>
                a.id === id
                  ? { ...a, status: 'idle' as const, balance: 0, plan: { ...a.plan, name: 'Auth Failed' } }
                  : a
              ),
            }));
            return;
          }

          if (result.error === 'coding_plan_no_balance_api') {
            set((s) => ({
              accounts: s.accounts.map((a) =>
                a.id === id
                  ? { ...a, status: 'active' as const, balance: -1, plan: { ...a.plan, name: result.planName ?? 'Coding Plan' } }
                  : a
              ),
            }));
            return;
          }

          if (result.error) {
            console.error('API Error:', result.error);
            set((s) => ({
              accounts: s.accounts.map((a) =>
                a.id === id
                  ? { ...a, status: 'idle' as const, plan: { ...a.plan, name: `Error: ${result.error}` } }
                  : a
              ),
            }));
            return;
          }

          const balance = result.balance;
          const now = Date.now();

          const accSnapshots = snapshots.get(id) || [];
          accSnapshots.push({ balance, timestamp: now });
          if (accSnapshots.length > 60) accSnapshots.splice(0, accSnapshots.length - 60);
          snapshots.set(id, accSnapshots);

          let consumptionRate = 0;
          if (accSnapshots.length >= 2) {
            const latest = accSnapshots[accSnapshots.length - 1];
            const oldest = accSnapshots[0];
            const timeDiffMin = (latest.timestamp - oldest.timestamp) / 60000;
            if (timeDiffMin > 0) {
              consumptionRate = -(latest.balance - oldest.balance) / timeDiffMin;
            }
          }

          const currentTime = Date.now();
          const fiveMinutesAgo = currentTime - 5 * 60 * 1000;
          const recentActivity = account.lastUpdated.getTime() > fiveMinutesAgo;
          const significantUsage = consumptionRate > 5;
          const isActive = (consumptionRate > 0.01) || (recentActivity && significantUsage);

          let nextResetDate = result.nextReset ?? null;
          let daysUntilReset: number | null = null;
          if (nextResetDate) {
            const resetTime = new Date(nextResetDate).getTime();
            daysUntilReset = Math.max(0, Math.ceil((resetTime - currentTime) / 86400000));
          }

          let prediction: Account['prediction'] = null;
          const hasTokenPct = result.tokensPercentage !== null && result.tokensPercentage !== undefined;
          const currentBalance = balance > 0 ? balance : 0;

          if (consumptionRate > 0 && currentBalance > 0) {
            let remainingResource = currentBalance;
            if (hasTokenPct && result.quota && result.quota > 0) {
              remainingResource = result.quota * (100 - result.tokensPercentage!) / 100;
            }
            const timeToExhaustMin = remainingResource / consumptionRate;
            const timeToResetMin = daysUntilReset !== null ? daysUntilReset * 24 * 60 : Infinity;
            const willExhaustBeforeReset = timeToExhaustMin < timeToResetMin;

            prediction = {
              willExhaustBeforeReset,
              estimatedRemainingAtReset: willExhaustBeforeReset ? 0 : currentBalance - consumptionRate * timeToResetMin,
              confidence: accSnapshots.length >= 5 ? 90 : accSnapshots.length >= 3 ? 70 : 50,
              timeToExhaustMin: isFinite(timeToExhaustMin) ? timeToExhaustMin : null,
            };
          } else if (hasTokenPct && result.tokensPercentage! >= 100) {
            prediction = {
              willExhaustBeforeReset: true,
              estimatedRemainingAtReset: 0,
              confidence: 100,
              timeToExhaustMin: 0,
            };
          } else if (consumptionRate <= 0 && currentBalance > 0) {
            prediction = {
              willExhaustBeforeReset: false,
              estimatedRemainingAtReset: currentBalance,
              confidence: 60,
              timeToExhaustMin: null,
            };
          }

          console.log(`[Balance] tokensPercentage from API: ${result.tokensPercentage}, current stored: ${account.plan.tokensPercentage}`);
          console.log(`[Balance] Updating UI for account ${id}: balance=${balance}, status=${isActive ? 'active' : 'idle'}`);
          set((s) => ({
            accounts: s.accounts.map((a) =>
              a.id === id
                ? {
                    ...a,
                    balance,
                    status: (isActive ? 'active' : 'idle') as 'active' | 'idle',
                    consumptionRate,
                    prediction,
                    plan: {
                      name: result.planName ?? a.plan.name,
                      quota: result.quota ?? a.plan.quota,
                      quotaUsed: result.quotaUsed ?? a.plan.quotaUsed,
                      tokensPercentage: result.tokensPercentage ?? a.plan.tokensPercentage,
                      resetCycle: a.plan.resetCycle,
                      nextResetDate,
                      daysUntilReset,
                    },
                    lastUpdated: new Date(),
                  }
                : a
            ),
          }));
          console.log(`[Balance] UI updated, new balance=${balance}, tokensPercentage=${result.tokensPercentage}`);
        } catch (e) {
          console.error('Fetch failed:', e);
          set((s) => ({
            accounts: s.accounts.map((a) =>
              a.id === id ? { ...a, status: 'idle' as const } : a
            ),
          }));
        }
      },

      startMonitoring: () => {
        if (refreshTimer) {
          console.log('[Monitor] Already running, skipping');
          return;
        }

        console.log('[Monitor] Starting monitoring...');
        const { accounts } = get();
        console.log(`[Monitor] Accounts to monitor: ${accounts.length}`);

        const refreshAll = async () => {
          if (isRefreshing) return;
          isRefreshing = true;
          try {
            const { accounts } = get();
            console.log(`[Monitor] Refreshing all accounts: ${accounts.length}`);
            for (const acc of accounts) {
              await get().refreshBalance(acc.id);
            }
          } finally {
            isRefreshing = false;
          }
        };

        refreshTimer = setInterval(refreshAll, REFRESH_INTERVAL);

        snapshotTimer = setInterval(() => {
          const { accounts } = get();
          for (const acc of accounts) {
            const snaps = snapshots.get(acc.id) || [];
            if (snaps.length > 0) {
              const latest = snaps[snaps.length - 1];
              const timeDiffMin = (Date.now() - latest.timestamp) / 60000;
              if (timeDiffMin > 0.5) {
                get().refreshBalance(acc.id);
              }
            }
          }
        }, SNAPSHOT_INTERVAL);

        console.log(`[Monitor] Started: refresh=${REFRESH_INTERVAL / 1000}s, snapshot=${SNAPSHOT_INTERVAL / 1000}s`);
      },

      stopMonitoring: () => {
        if (refreshTimer) {
          clearInterval(refreshTimer);
          refreshTimer = null;
        }
        if (snapshotTimer) {
          clearInterval(snapshotTimer);
          snapshotTimer = null;
        }
        console.log('[Monitor] Stopped');
      },
    }),
    {
      name: 'cpms-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accounts: state.accounts.map((a) => ({
          ...a,
          lastUpdated: a.lastUpdated instanceof Date ? a.lastUpdated.toISOString() : a.lastUpdated,
        })),
        lang: state.lang,
        theme: state.theme,
        _mk: state._mk,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.accounts = state.accounts.map((a) => ({
            ...a,
            lastUpdated: a.lastUpdated ? new Date(a.lastUpdated) : new Date(),
          }));
        }
      },
    }
  )
);

export type ProviderType = 'openai' | 'glm' | 'glm-coding-plan' | 'minimax-cn' | 'minimax-global' | 'qwen' | 'kimi-cn' | 'kimi-global' | 'deepseek';
export type ResetCycleType = 'monthly' | 'quarterly' | 'annual' | 'payg' | 'custom';
export type AccountStatus = 'idle' | 'detecting' | 'active' | 'predicting';

export interface PlanInfo {
  name: string;
  quota: number | null;
  quotaUsed: number | null;
  tokensPercentage: number | null;
  resetCycle: ResetCycleType;
  nextResetDate: string | null;
  daysUntilReset: number | null;
}

export interface PredictionResult {
  willExhaustBeforeReset: boolean;
  estimatedRemainingAtReset: number;
  confidence: number;
  timeToExhaustMin: number | null;
}

export interface Account {
  id: string;
  name: string;
  provider: ProviderType;
  model: string;
  modelName: string;
  apiKeyEncrypted: string;
  balance: number;
  status: AccountStatus;
  consumptionRate: number;
  plan: PlanInfo;
  prediction: PredictionResult | null;
  lastUpdated: Date;
}

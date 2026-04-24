export type ProviderType = 'openai' | 'anthropic' | 'glm' | 'google' | 'azure';
export type ResetCycleType = 'monthly' | 'quarterly' | 'annual' | 'payg' | 'custom';
export type AccountStatus = 'idle' | 'detecting' | 'active' | 'predicting';

export interface PlanInfo {
  name: string;
  quota: number | null;
  quotaUsed: number | null;
  resetCycle: ResetCycleType;
  nextResetDate: string | null;
  daysUntilReset: number | null;
}

export interface PredictionResult {
  willExhaustBeforeReset: boolean;
  estimatedRemainingAtReset: number;
  confidence: number;
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

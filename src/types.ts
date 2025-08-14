export interface IPaymentDataRaw {
  correlationId: string;
  amount: number;
}

export interface IPaymentData {
  correlationId: string;
  amount: number;
  requestedAt: string;
  processor: 'default' | 'fallback';
}

export interface IHealth {
  failing: boolean;
  minResponseTime: number;
}

export interface IHealthsSummary {
  default: IHealth;
  fallback: IHealth;
}

export interface IBestProcessor {
  processor: 'default' | 'fallback' | 'none' | 'null';
  url: string;
}
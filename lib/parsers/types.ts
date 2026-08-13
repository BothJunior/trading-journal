export interface ParsedExecution {
  timestamp: Date;
  ticker: string;
  action: "BUY" | "SELL";
  price: number;
  quantity: number;
  fee: number;
  slippage?: number;
  broker: string;
  rawRecord?: Record<string, any>;
  executionHash?: string;
}

export interface ParseResult {
  executions: ParsedExecution[];
  errors: string[];
}

export type BrokerType = "METATRADER" | "IBKR" | "BINANCE" | "BYBIT" | "GENERIC";

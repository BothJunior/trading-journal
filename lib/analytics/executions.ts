import Decimal from "decimal.js";

export interface ExecutionInput {
  id?: string;
  timestamp: Date | string;
  action: "BUY" | "SELL" | string;
  price: number | string;
  quantity: number | string; // Lot size (e.g., 0.01, 0.10, 1.00)
  fee?: number | string;
  slippage?: number | string;
}

export interface AggregatedTradeResult {
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  closedQuantity: number;
  openQuantity: number;
  positionSizeOz: number; // Contract size units / oz
  grossPnL: number;
  netPnL: number;
  totalFees: number;
  realizedR: number;
  direction: "LONG" | "SHORT";
  status: "OPEN" | "CLOSED" | "CANCELLED";
}

/**
 * Calculates contract size multiplier per 1.00 lot based on asset ticker:
 * - Gold (XAUUSD): 100 troy oz / lot
 * - Standard Forex (EURUSD, GBPUSD, AUDUSD, NZDUSD): 100,000 units / lot ($0.10/pip at 0.01 lot)
 * - JPY Forex (USDJPY): 100,000 / exitPrice USD equivalent (~$0.06 - $0.07/pip at 0.01 lot)
 * - Equities / Crypto: 1 unit / lot
 */
export function getContractMultiplier(ticker: string = "", exitPrice: number = 1): number {
  const norm = (ticker || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Gold (XAUUSD, GOLD)
  if (norm.includes("XAU") || norm.includes("GOLD")) {
    return 100;
  }

  // JPY Pairs (USDJPY, EURJPY, GBPJPY, etc.)
  if (norm.includes("JPY")) {
    return exitPrice > 0 ? 100000 / exitPrice : 100000;
  }

  // Standard Forex (EURUSD, GBPUSD, AUDUSD, NZDUSD, USDCAD, USDCHF)
  if (
    norm.includes("EUR") ||
    norm.includes("GBP") ||
    norm.includes("AUD") ||
    norm.includes("NZD") ||
    norm.includes("CAD") ||
    norm.includes("CHF")
  ) {
    return 100000;
  }

  // Default
  return 1;
}

/**
 * Pure deterministic execution aggregation using Decimal.js.
 * Supports Gold (XAUUSD), EURUSD, GBPUSD, AUDUSD, USDJPY, and multi-asset lot calculations.
 */
export function aggregateExecutions(
  executions: ExecutionInput[],
  direction: "LONG" | "SHORT" = "LONG",
  initialRisk: number | string = 0,
  contractSize?: number | string,
  ticker: string = "XAUUSD"
): AggregatedTradeResult {
  if (!executions || executions.length === 0) {
    return {
      entryPrice: 0,
      exitPrice: 0,
      quantity: 0,
      closedQuantity: 0,
      openQuantity: 0,
      positionSizeOz: 0,
      grossPnL: 0,
      netPnL: 0,
      totalFees: 0,
      realizedR: 0,
      direction,
      status: "OPEN",
    };
  }

  // Sort executions chronologically
  const sorted = [...executions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let totalEntryVal = new Decimal(0);
  let totalEntryQty = new Decimal(0);
  let totalExitVal = new Decimal(0);
  let totalExitQty = new Decimal(0);
  let totalFees = new Decimal(0);

  const isLong = direction.toUpperCase() === "LONG";

  for (const exec of sorted) {
    const price = new Decimal(exec.price || 0);
    const qty = new Decimal(exec.quantity || 0);
    const fee = new Decimal(exec.fee || 0);
    const action = exec.action.toUpperCase();

    totalFees = totalFees.plus(fee);

    // For LONG: BUY is entry, SELL is exit
    // For SHORT: SELL is entry, BUY is exit
    const isEntry = isLong ? action === "BUY" : action === "SELL";

    if (isEntry) {
      totalEntryVal = totalEntryVal.plus(price.times(qty));
      totalEntryQty = totalEntryQty.plus(qty);
    } else {
      totalExitVal = totalExitVal.plus(price.times(qty));
      totalExitQty = totalExitQty.plus(qty);
    }
  }

  const weightedEntryPrice = totalEntryQty.isZero()
    ? new Decimal(0)
    : totalEntryVal.div(totalEntryQty);

  const weightedExitPrice = totalExitQty.isZero()
    ? new Decimal(0)
    : totalExitVal.div(totalExitQty);

  // Determine contract size multiplier
  const effectiveExit = weightedExitPrice.isZero() ? weightedEntryPrice.toNumber() : weightedExitPrice.toNumber();
  const baseMultiplier = contractSize !== undefined
    ? Number(contractSize)
    : getContractMultiplier(ticker, effectiveExit);

  const mult = new Decimal(baseMultiplier);

  // Closed quantity in lots
  const closedQuantity = Decimal.min(totalEntryQty, totalExitQty);
  const openQuantity = totalEntryQty.minus(totalExitQty).abs();

  // Position size in contract units
  const positionSizeOz = closedQuantity.times(mult);

  let grossPnL = new Decimal(0);
  if (!closedQuantity.isZero()) {
    if (isLong) {
      const priceMovement = weightedExitPrice.minus(weightedEntryPrice);
      grossPnL = priceMovement.times(positionSizeOz);
    } else {
      const priceMovement = weightedEntryPrice.minus(weightedExitPrice);
      grossPnL = priceMovement.times(positionSizeOz);
    }
  }

  const netPnL = grossPnL.minus(totalFees);

  const risk = new Decimal(initialRisk || 0);
  let realizedR = new Decimal(0);
  if (!risk.isZero() && !risk.isNegative()) {
    realizedR = netPnL.div(risk);
  }

  const isFullyClosed = !totalEntryQty.isZero() && totalEntryQty.equals(totalExitQty);

  return {
    entryPrice: weightedEntryPrice.toNumber(),
    exitPrice: weightedExitPrice.toNumber(),
    quantity: totalEntryQty.toNumber(),
    closedQuantity: closedQuantity.toNumber(),
    openQuantity: openQuantity.toNumber(),
    positionSizeOz: positionSizeOz.toNumber(),
    grossPnL: grossPnL.toNumber(),
    netPnL: netPnL.toNumber(),
    totalFees: totalFees.toNumber(),
    realizedR: realizedR.toNumber(),
    direction,
    status: isFullyClosed ? "CLOSED" : "OPEN",
  };
}

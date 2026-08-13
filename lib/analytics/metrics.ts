import Decimal from "decimal.js";

export interface TradeMetricInput {
  id?: string;
  netPnL: number | string;
  grossPnL?: number | string;
  initialRisk?: number | string;
  realizedR?: number | string;
  status?: string;
  entryDate?: Date | string | null;
  exitDate?: Date | string | null;
}

export interface PortfolioMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number; // 0 to 100 percentage
  lossRate: number; // 0 to 100 percentage
  totalNetPnL: number;
  totalGrossWin: number;
  totalGrossLoss: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number; // $ per trade
  avgRealizedR: number;
  maxDrawdownAmount: number;
  maxDrawdownPercent: number;
}

/**
 * Pure deterministic performance metrics calculation using Decimal.js.
 */
export function calculateMetrics(trades: TradeMetricInput[]): PortfolioMetrics {
  const closedTrades = trades.filter(
    (t) => !t.status || t.status.toUpperCase() === "CLOSED"
  );

  if (closedTrades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      winRate: 0,
      lossRate: 0,
      totalNetPnL: 0,
      totalGrossWin: 0,
      totalGrossLoss: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      expectancy: 0,
      avgRealizedR: 0,
      maxDrawdownAmount: 0,
      maxDrawdownPercent: 0,
    };
  }

  let totalNetPnL = new Decimal(0);
  let totalGrossWin = new Decimal(0);
  let totalGrossLoss = new Decimal(0);

  let winningTrades = 0;
  let losingTrades = 0;
  let breakevenTrades = 0;

  let totalRSum = new Decimal(0);
  let tradesWithRiskCount = 0;

  for (const t of closedTrades) {
    const pnl = new Decimal(t.netPnL || 0);
    const risk = new Decimal(t.initialRisk || 0);
    const rVal = new Decimal(t.realizedR || 0);

    totalNetPnL = totalNetPnL.plus(pnl);

    if (pnl.greaterThan(0)) {
      winningTrades++;
      totalGrossWin = totalGrossWin.plus(pnl);
    } else if (pnl.lessThan(0)) {
      losingTrades++;
      totalGrossLoss = totalGrossLoss.plus(pnl.abs());
    } else {
      breakevenTrades++;
    }

    if (!risk.isZero()) {
      totalRSum = totalRSum.plus(rVal.isZero() ? pnl.div(risk) : rVal);
      tradesWithRiskCount++;
    }
  }

  const totalCount = new Decimal(closedTrades.length);
  const winCountDec = new Decimal(winningTrades);
  const lossCountDec = new Decimal(losingTrades);

  const winRateRatio = winCountDec.div(totalCount);
  const lossRateRatio = lossCountDec.div(totalCount);

  const winRatePercent = winRateRatio.times(100);
  const lossRatePercent = lossRateRatio.times(100);

  const profitFactor = totalGrossLoss.isZero()
    ? totalGrossWin.isZero()
      ? new Decimal(0)
      : new Decimal(999) // Clean fallback when 0 losses
    : totalGrossWin.div(totalGrossLoss);

  const avgWin = winningTrades > 0 ? totalGrossWin.div(winCountDec) : new Decimal(0);
  const avgLoss = losingTrades > 0 ? totalGrossLoss.div(lossCountDec) : new Decimal(0);

  // Expectancy = (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
  const expectancy = winRateRatio
    .times(avgWin)
    .minus(lossRateRatio.times(avgLoss));

  const avgRealizedR =
    tradesWithRiskCount > 0
      ? totalRSum.div(new Decimal(tradesWithRiskCount))
      : new Decimal(0);

  // Calculate Max Drawdown
  let peakBalance = new Decimal(0);
  let currentBalance = new Decimal(0);
  let maxDrawdownAmt = new Decimal(0);
  let maxDrawdownPct = new Decimal(0);

  // Sort by exit date or entry date for equity curve calculation
  const sorted = [...closedTrades].sort((a, b) => {
    const dateA = new Date(a.exitDate || a.entryDate || 0).getTime();
    const dateB = new Date(b.exitDate || b.entryDate || 0).getTime();
    return dateA - dateB;
  });

  for (const t of sorted) {
    const pnl = new Decimal(t.netPnL || 0);
    currentBalance = currentBalance.plus(pnl);

    if (currentBalance.greaterThan(peakBalance)) {
      peakBalance = currentBalance;
    }

    const drawdownAmt = peakBalance.minus(currentBalance);
    if (drawdownAmt.greaterThan(maxDrawdownAmt)) {
      maxDrawdownAmt = drawdownAmt;
    }

    if (!peakBalance.isZero()) {
      const ddPct = drawdownAmt.div(peakBalance).times(100);
      if (ddPct.greaterThan(maxDrawdownPct)) {
        maxDrawdownPct = ddPct;
      }
    }
  }

  return {
    totalTrades: closedTrades.length,
    winningTrades,
    losingTrades,
    breakevenTrades,
    winRate: winRatePercent.toNumber(),
    lossRate: lossRatePercent.toNumber(),
    totalNetPnL: totalNetPnL.toNumber(),
    totalGrossWin: totalGrossWin.toNumber(),
    totalGrossLoss: totalGrossLoss.toNumber(),
    profitFactor: profitFactor.toNumber(),
    avgWin: avgWin.toNumber(),
    avgLoss: avgLoss.toNumber(),
    expectancy: expectancy.toNumber(),
    avgRealizedR: avgRealizedR.toNumber(),
    maxDrawdownAmount: maxDrawdownAmt.toNumber(),
    maxDrawdownPercent: maxDrawdownPct.toNumber(),
  };
}

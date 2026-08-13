import { describe, it, expect } from "vitest";
import { aggregateExecutions, getContractMultiplier } from "@/lib/analytics/executions";
import { calculateMetrics } from "@/lib/analytics/metrics";
import { calculateExcursion } from "@/lib/analytics/excursion";
import { computeExecutionHash } from "@/lib/parsers/hash";
import Decimal from "decimal.js";

describe("Analytics Math Engine (Decimal.js)", () => {
  it("verifies strict floating-point precision (prevents 0.1 + 0.2 drift)", () => {
    const a = new Decimal(0.1);
    const b = new Decimal(0.2);
    const sum = a.plus(b);

    expect(sum.equals(0.3)).toBe(true);
    expect(sum.toString()).toBe("0.3");
  });

  it("verifies EURUSD 0.01 lot 100 pips move = +$10.00 profit", () => {
    // User example: Buy 0.01 lot EURUSD @ 1.16000, exit @ 1.17000 (100 pips)
    // 0.01 lot * 100,000 = 1,000 units -> 0.01000 * 1000 = +$10.00
    const eurExecs = [
      { timestamp: "2026-08-13T10:00:00Z", action: "BUY", price: 1.16000, quantity: 0.01, fee: 0 },
      { timestamp: "2026-08-13T11:00:00Z", action: "SELL", price: 1.17000, quantity: 0.01, fee: 0 },
    ];

    const result = aggregateExecutions(eurExecs, "LONG", 10, undefined, "EURUSD");
    expect(result.grossPnL).toBe(10);
    expect(result.netPnL).toBe(10);
  });

  it("verifies USDJPY 0.01 lot 100 pips move = ~$6.62 profit", () => {
    // User example: Buy 0.01 lot USDJPY @ 150.00, exit @ 151.00 (100 pips)
    // PnL in JPY = 100 pips * 10 JPY/pip = 1,000 JPY -> 1000 / 151 = $6.62
    const jpyExecs = [
      { timestamp: "2026-08-13T10:00:00Z", action: "BUY", price: 150.00, quantity: 0.01, fee: 0 },
      { timestamp: "2026-08-13T11:00:00Z", action: "SELL", price: 151.00, quantity: 0.01, fee: 0 },
    ];

    const result = aggregateExecutions(jpyExecs, "LONG", 10, undefined, "USDJPY");
    expect(result.grossPnL).toBeCloseTo(6.62, 2);
  });

  it("verifies exact XAUUSD Gold PnL math (0.01 lot BUY 4320 to 4440 = +$120)", () => {
    const buyExecutions = [
      { timestamp: "2026-08-13T10:00:00Z", action: "BUY", price: 4320, quantity: 0.01, fee: 0 },
      { timestamp: "2026-08-13T11:00:00Z", action: "SELL", price: 4440, quantity: 0.01, fee: 0 },
    ];

    const buyResult = aggregateExecutions(buyExecutions, "LONG", 50, 100, "XAUUSD");
    expect(buyResult.positionSizeOz).toBe(1);
    expect(buyResult.grossPnL).toBe(120);
    expect(buyResult.netPnL).toBe(120);
  });

  it("handles partial scaling out across 3+ price levels correctly", () => {
    const executions = [
      { timestamp: "2026-08-01T10:00:00Z", action: "BUY", price: 100, quantity: 1, fee: 1.5 },
      { timestamp: "2026-08-01T11:00:00Z", action: "SELL", price: 110, quantity: 0.3, fee: 0.5 },
      { timestamp: "2026-08-01T12:00:00Z", action: "SELL", price: 115, quantity: 0.4, fee: 0.5 },
      { timestamp: "2026-08-01T13:00:00Z", action: "SELL", price: 120, quantity: 0.3, fee: 0.5 },
    ];

    const result = aggregateExecutions(executions, "LONG", 500, 1);

    expect(result.entryPrice).toBe(100);
    expect(result.exitPrice).toBe(115);
    expect(result.quantity).toBe(1);
    expect(result.closedQuantity).toBe(1);
    expect(result.openQuantity).toBe(0);
    expect(result.status).toBe("CLOSED");
    expect(result.grossPnL).toBe(15);
    expect(result.totalFees).toBe(3);
    expect(result.netPnL).toBe(12);
  });

  it("handles missing or zero initial risk (R = 0) without division by zero errors", () => {
    const executions = [
      { timestamp: "2026-08-01T10:00:00Z", action: "BUY", price: 50, quantity: 10, fee: 1 },
      { timestamp: "2026-08-01T11:00:00Z", action: "SELL", price: 60, quantity: 10, fee: 1 },
    ];

    const result = aggregateExecutions(executions, "LONG", 0, 1);

    expect(result.netPnL).toBe(98);
    expect(result.realizedR).toBe(0);
  });

  it("calculates expectancy, win rate, and profit factor accurately", () => {
    const mockTrades = [
      { netPnL: 300, initialRisk: 100, realizedR: 3, status: "CLOSED" },
      { netPnL: 200, initialRisk: 100, realizedR: 2, status: "CLOSED" },
      { netPnL: -100, initialRisk: 100, realizedR: -1, status: "CLOSED" },
      { netPnL: -100, initialRisk: 100, realizedR: -1, status: "CLOSED" },
    ];

    const metrics = calculateMetrics(mockTrades);

    expect(metrics.totalTrades).toBe(4);
    expect(metrics.winningTrades).toBe(2);
    expect(metrics.losingTrades).toBe(2);
    expect(metrics.winRate).toBe(50);
    expect(metrics.lossRate).toBe(50);
    expect(metrics.totalGrossWin).toBe(500);
    expect(metrics.totalGrossLoss).toBe(200);
    expect(metrics.profitFactor).toBe(2.5);
    expect(metrics.avgWin).toBe(250);
    expect(metrics.avgLoss).toBe(100);
    expect(metrics.expectancy).toBe(75);
  });

  it("computes MAE and MFE correctly for LONG and SHORT trades", () => {
    const bars = [
      { high: 105, low: 98, timestamp: "2026-08-01T10:00:00Z" },
      { high: 112, low: 95, timestamp: "2026-08-01T11:00:00Z" },
      { high: 108, low: 102, timestamp: "2026-08-01T12:00:00Z" },
    ];

    const longExcursion = calculateExcursion(100, "LONG", bars, 10);
    expect(longExcursion.mfe).toBe(12);
    expect(longExcursion.mae).toBe(5);

    const shortExcursion = calculateExcursion(100, "SHORT", bars, 10);
    expect(shortExcursion.mfe).toBe(5);
    expect(shortExcursion.mae).toBe(12);
  });

  it("generates deterministic SHA256 execution hashes for deduplication", () => {
    const userId = "usr_12345";
    const timestamp = "2026-08-13T08:00:00.000Z";
    const ticker = "XAUUSD";
    const price = 4320;
    const quantity = 0.01;
    const action = "BUY";

    const hash1 = computeExecutionHash(userId, timestamp, ticker, price, quantity, action);
    const hash2 = computeExecutionHash(userId, timestamp, ticker, price, quantity, action);

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
  });
});

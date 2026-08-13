import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseBrokerCSV, BrokerType, computeExecutionHash, normalizeGoldTicker } from "@/lib/parsers";
import { aggregateExecutions } from "@/lib/analytics/executions";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const broker = (formData.get("broker") as BrokerType) || "GENERIC";
    const tradingAccountId = formData.get("tradingAccountId") as string;
    const columnMappingJson = formData.get("columnMapping") as string;

    if (!file || !tradingAccountId) {
      return NextResponse.json(
        { error: "CSV File and Trading Account are required" },
        { status: 400 }
      );
    }

    // Verify account ownership (Strict Multi-Tenant Check)
    const account = await prisma.tradingAccount.findFirst({
      where: { id: tradingAccountId, userId },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Trading account not found or access denied" },
        { status: 403 }
      );
    }

    const csvContent = await file.text();
    const columnMapping = columnMappingJson ? JSON.parse(columnMappingJson) : undefined;

    const parseResult = parseBrokerCSV(broker, csvContent, columnMapping);
    if (parseResult.executions.length === 0) {
      return NextResponse.json(
        {
          error: "No valid executions found in CSV",
          details: parseResult.errors,
        },
        { status: 400 }
      );
    }

    // Compute hashes for deduplication & normalize ticker for XAUUSD Gold Journal
    const executionsWithHash = parseResult.executions.map((exec) => {
      const normalizedTicker = normalizeGoldTicker(exec.ticker);
      const hash = computeExecutionHash(
        userId,
        exec.timestamp,
        normalizedTicker,
        exec.price,
        exec.quantity,
        exec.action
      );
      return { ...exec, ticker: normalizedTicker, executionHash: hash };
    });

    // Query existing hashes for this user to ensure idempotency
    const existingExecutions = await prisma.execution.findMany({
      where: {
        userId,
        executionHash: { in: executionsWithHash.map((e) => e.executionHash) },
      },
      select: { executionHash: true },
    });

    const existingHashSet = new Set(existingExecutions.map((e) => e.executionHash));

    // Filter out duplicates
    const newExecutions = executionsWithHash.filter(
      (e) => !existingHashSet.has(e.executionHash)
    );

    if (newExecutions.length === 0) {
      return NextResponse.json({
        message: "All executions in file already imported (deduplicated).",
        importedCount: 0,
        skippedCount: executionsWithHash.length,
      });
    }

    // Group executions by Ticker
    const groupedByTicker: Record<string, typeof newExecutions> = {};
    for (const exec of newExecutions) {
      if (!groupedByTicker[exec.ticker]) {
        groupedByTicker[exec.ticker] = [];
      }
      groupedByTicker[exec.ticker].push(exec);
    }

    let createdTradesCount = 0;
    let createdExecutionsCount = 0;

    for (const [ticker, execs] of Object.entries(groupedByTicker)) {
      // Determine primary direction from first fill
      const firstAction = execs[0].action;
      const direction = firstAction === "BUY" ? "LONG" : "SHORT";

      // Calculate exact math with Decimal.js engine
      const agg = aggregateExecutions(execs, direction, 0);

      // Create Trade record
      const trade = await prisma.trade.create({
        data: {
          userId,
          tradingAccountId,
          ticker,
          direction,
          status: agg.status,
          entryDate: new Date(execs[0].timestamp),
          exitDate: agg.status === "CLOSED" ? new Date(execs[execs.length - 1].timestamp) : null,
          entryPrice: agg.entryPrice,
          exitPrice: agg.exitPrice,
          quantity: agg.quantity,
          grossPnL: agg.grossPnL,
          netPnL: agg.netPnL,
          totalFees: agg.totalFees,
          realizedR: agg.realizedR,
        },
      });
      createdTradesCount++;

      // Create child Executions linked to Trade & User
      await prisma.execution.createMany({
        data: execs.map((e) => ({
          tradeId: trade.id,
          userId,
          timestamp: new Date(e.timestamp),
          action: e.action,
          price: e.price,
          quantity: e.quantity,
          fee: e.fee,
          executionHash: e.executionHash,
        })),
      });
      createdExecutionsCount += execs.length;
    }

    return NextResponse.json({
      message: "CSV imported successfully",
      importedExecutions: createdExecutionsCount,
      createdTrades: createdTradesCount,
      skippedDuplicates: executionsWithHash.length - newExecutions.length,
      errors: parseResult.errors,
    });
  } catch (error: any) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process CSV import" },
      { status: 500 }
    );
  }
}

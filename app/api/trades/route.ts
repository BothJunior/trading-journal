import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { aggregateExecutions } from "@/lib/analytics/executions";
import { computeExecutionHash } from "@/lib/parsers/hash";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const tradingAccountId = searchParams.get("tradingAccountId");
  const strategyId = searchParams.get("strategyId");
  const status = searchParams.get("status");

  const whereClause: any = {
    userId: session.user.id,
  };

  if (tradingAccountId) whereClause.tradingAccountId = tradingAccountId;
  if (strategyId) whereClause.strategyId = strategyId;
  if (status) whereClause.status = status;

  const trades = await prisma.trade.findMany({
    where: whereClause,
    include: {
      tradingAccount: true,
      strategy: true,
      executions: true,
      tradeTags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: { entryDate: "desc" },
  });

  return NextResponse.json({ trades });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await req.json();
    const {
      tradingAccountId,
      strategyId,
      ticker,
      direction,
      assetClass,
      entryDate,
      initialRisk,
      stopLoss,
      takeProfit,
      entryPrice,
      exitPrice,
      quantity,
      fees,
      notes,
      executions,
      tagIds,
    } = body;

    if (!tradingAccountId || !ticker || !direction || !entryDate) {
      return NextResponse.json(
        { error: "Missing required fields (tradingAccountId, ticker, direction, entryDate)" },
        { status: 400 }
      );
    }

    // Strict multi-tenant verification
    const account = await prisma.tradingAccount.findFirst({
      where: { id: tradingAccountId, userId: session.user.id },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Invalid trading account or access denied" },
        { status: 403 }
      );
    }

    const normTicker = ticker.trim().toUpperCase();
    const normDirection = direction.toUpperCase();
    const isLong = normDirection === "LONG";

    let execInputs = executions || [];

    // Auto-generate child execution fills if logging manually with entry/exit price
    if (execInputs.length === 0 && entryPrice !== undefined && entryPrice !== "") {
      const entryP = Number(entryPrice);
      const exitP = exitPrice !== undefined && exitPrice !== "" ? Number(exitPrice) : null;
      const qty = Number(quantity || 1);
      const entryTime = new Date(entryDate).toISOString();

      // Entry fill
      execInputs.push({
        timestamp: entryTime,
        action: isLong ? "BUY" : "SELL",
        price: entryP,
        quantity: qty,
        fee: Number(fees || 0),
      });

      // Exit fill if trade is closed / has exit price
      if (exitP !== null && exitP > 0) {
        const exitTime = new Date(new Date(entryDate).getTime() + 3600 * 1000).toISOString();
        execInputs.push({
          timestamp: exitTime,
          action: isLong ? "SELL" : "BUY",
          price: exitP,
          quantity: qty,
          fee: 0,
        });
      }
    }

    // Process executions using Decimal.js analytics engine
    const agg = aggregateExecutions(execInputs, normDirection, initialRisk || 0, undefined, normTicker);

    const newTrade = await prisma.trade.create({
      data: {
        userId: session.user.id,
        tradingAccountId,
        strategyId: strategyId || null,
        ticker: normTicker,
        direction: normDirection,
        assetClass: assetClass || "COMMODITY",
        status: agg.status,
        entryDate: new Date(entryDate),
        exitDate: agg.status === "CLOSED" ? new Date(new Date(entryDate).getTime() + 3600 * 1000) : null,
        entryPrice: agg.entryPrice,
        exitPrice: agg.exitPrice,
        quantity: agg.quantity,
        initialRisk: Number(initialRisk || 0),
        stopLoss: stopLoss ? Number(stopLoss) : null,
        takeProfit: takeProfit ? Number(takeProfit) : null,
        grossPnL: agg.grossPnL,
        netPnL: agg.netPnL,
        totalFees: agg.totalFees,
        realizedR: agg.realizedR,
        notes: notes || "",
        executions: execInputs.length > 0
          ? {
              create: execInputs.map((e: any) => ({
                userId,
                action: e.action.toUpperCase(),
                price: Number(e.price),
                quantity: Number(e.quantity),
                fee: Number(e.fee || 0),
                timestamp: new Date(e.timestamp),
                executionHash: computeExecutionHash(
                  userId,
                  e.timestamp,
                  normTicker,
                  e.price,
                  e.quantity,
                  e.action
                ),
              })),
            }
          : undefined,
        tradeTags: tagIds && tagIds.length > 0
          ? {
              create: tagIds.map((tagId: string) => ({
                tag: { connect: { id: tagId } },
              })),
            }
          : undefined,
      },
      include: {
        tradingAccount: true,
        strategy: true,
        executions: true,
        tradeTags: { include: { tag: true } },
      },
    });

    return NextResponse.json({ trade: newTrade }, { status: 201 });
  } catch (error: any) {
    console.error("Create trade error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create trade" },
      { status: 500 }
    );
  }
}

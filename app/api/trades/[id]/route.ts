import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeExecutionHash } from "@/lib/parsers/hash";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trade = await prisma.trade.findFirst({
    where: {
      id: params.id,
      userId: session.user.id, // STRICT MULTI-TENANT ISOLATION
    },
    include: {
      tradingAccount: true,
      strategy: true,
      executions: {
        orderBy: { timestamp: "asc" },
      },
      tradeTags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!trade) {
    return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  }

  // Synthetic executions fallback if trade has no stored child executions
  let executions = trade.executions;
  if ((!executions || executions.length === 0) && trade.entryPrice) {
    const isLong = trade.direction.toUpperCase() === "LONG";
    const entryTime = trade.entryDate.toISOString();
    const entryAction = isLong ? "BUY" : "SELL";
    const exitAction = isLong ? "SELL" : "BUY";

    const syntheticExecs: any[] = [
      {
        id: `${trade.id}-exec-entry`,
        tradeId: trade.id,
        userId: trade.userId,
        action: entryAction,
        price: trade.entryPrice,
        quantity: trade.quantity,
        fee: trade.totalFees || 0,
        slippage: 0,
        timestamp: trade.entryDate,
        executionHash: computeExecutionHash(
          trade.userId,
          entryTime,
          trade.ticker,
          trade.entryPrice,
          trade.quantity,
          entryAction
        ),
      },
    ];

    if (trade.exitPrice) {
      const exitDateObj = trade.exitDate || new Date(trade.entryDate.getTime() + 3600 * 1000);
      const exitTime = exitDateObj.toISOString();
      syntheticExecs.push({
        id: `${trade.id}-exec-exit`,
        tradeId: trade.id,
        userId: trade.userId,
        action: exitAction,
        price: trade.exitPrice,
        quantity: trade.quantity,
        fee: 0,
        slippage: 0,
        timestamp: exitDateObj,
        executionHash: computeExecutionHash(
          trade.userId,
          exitTime,
          trade.ticker,
          trade.exitPrice,
          trade.quantity,
          exitAction
        ),
      });
    }

    executions = syntheticExecs;
  }

  return NextResponse.json({
    trade: {
      ...trade,
      executions,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { strategyId, notes, stopLoss, takeProfit, initialRisk, tagIds } = body;

    // Verify ownership
    const existing = await prisma.trade.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Trade not found or access denied" }, { status: 404 });
    }

    // Handle tag updating
    if (tagIds !== undefined) {
      await prisma.tradeTag.deleteMany({
        where: { tradeId: params.id },
      });

      if (tagIds.length > 0) {
        await prisma.tradeTag.createMany({
          data: tagIds.map((tagId: string) => ({
            tradeId: params.id,
            tagId,
          })),
        });
      }
    }

    const updatedTrade = await prisma.trade.update({
      where: { id: params.id },
      data: {
        strategyId: strategyId !== undefined ? strategyId : existing.strategyId,
        notes: notes !== undefined ? notes : existing.notes,
        stopLoss: stopLoss !== undefined ? Number(stopLoss) : existing.stopLoss,
        takeProfit: takeProfit !== undefined ? Number(takeProfit) : existing.takeProfit,
        initialRisk: initialRisk !== undefined ? Number(initialRisk) : existing.initialRisk,
      },
      include: {
        tradingAccount: true,
        strategy: true,
        executions: true,
        tradeTags: { include: { tag: true } },
      },
    });

    return NextResponse.json({ trade: updatedTrade });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update trade" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.trade.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Trade not found or access denied" }, { status: 404 });
  }

  await prisma.trade.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ message: "Trade deleted successfully" });
}

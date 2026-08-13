import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateMetrics } from "@/lib/analytics/metrics";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch strategies
  const strategies = await prisma.strategy.findMany({
    where: { userId: session.user.id },
    include: {
      trades: true,
    },
  });

  // Fetch setup tags
  const setupTags = await prisma.tag.findMany({
    where: { userId: session.user.id, type: "SETUP" },
    include: {
      tradeTags: {
        include: {
          trade: true,
        },
      },
    },
  });

  const strategyReports = strategies.map((strat) => {
    const metrics = calculateMetrics(strat.trades);
    return {
      id: strat.id,
      name: strat.name,
      type: "STRATEGY",
      targetWinRate: strat.targetWinRate,
      targetRR: strat.targetRR,
      metrics,
    };
  });

  const tagReports = setupTags.map((tag) => {
    const trades = tag.tradeTags.map((tt) => tt.trade).filter(Boolean);
    const metrics = calculateMetrics(trades as any[]);
    return {
      id: tag.id,
      name: tag.name,
      type: "TAG",
      metrics,
    };
  });

  return NextResponse.json({
    strategies: strategyReports,
    setupTags: tagReports,
  });
}

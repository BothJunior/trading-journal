import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all mistake tags for user
  const mistakeTags = await prisma.tag.findMany({
    where: { userId: session.user.id, type: "MISTAKE" },
    include: {
      tradeTags: {
        include: {
          trade: true,
        },
      },
    },
  });

  const report = mistakeTags.map((tag) => {
    let totalLoss = new Decimal(0);
    let totalGain = new Decimal(0);
    let totalNetPnL = new Decimal(0);
    let tradeCount = 0;
    let mistakeCount = 0;

    for (const tt of tag.tradeTags) {
      if (tt.trade && tt.trade.status === "CLOSED") {
        tradeCount++;
        const pnl = new Decimal(tt.trade.netPnL || 0);
        totalNetPnL = totalNetPnL.plus(pnl);

        if (pnl.lessThan(0)) {
          totalLoss = totalLoss.plus(pnl.abs());
          mistakeCount++;
        } else {
          totalGain = totalGain.plus(pnl);
        }
      }
    }

    return {
      tagId: tag.id,
      tagName: tag.name,
      tagColor: tag.color,
      tradeCount,
      mistakeCount,
      totalLoss: totalLoss.toNumber(),
      totalGain: totalGain.toNumber(),
      totalNetPnL: totalNetPnL.toNumber(),
    };
  });

  // Calculate overall total loss from mistakes
  let grandTotalMistakeLoss = new Decimal(0);
  for (const item of report) {
    grandTotalMistakeLoss = grandTotalMistakeLoss.plus(new Decimal(item.totalLoss));
  }

  return NextResponse.json({
    mistakes: report.sort((a, b) => b.totalLoss - a.totalLoss),
    grandTotalMistakeLoss: grandTotalMistakeLoss.toNumber(),
  });
}

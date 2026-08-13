import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trades = await prisma.trade.findMany({
    where: { userId: session.user.id, status: "CLOSED" },
  });

  // Days: 0 (Sun) to 6 (Sat)
  // Hours: 0 to 23
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayStats: Record<string, { pnl: Decimal; wins: number; total: number }> = {};
  const hourStats: Record<number, { pnl: Decimal; wins: number; total: number }> = {};

  for (let i = 0; i < 7; i++) {
    dayStats[dayNames[i]] = { pnl: new Decimal(0), wins: 0, total: 0 };
  }

  for (let i = 0; i < 24; i++) {
    hourStats[i] = { pnl: new Decimal(0), wins: 0, total: 0 };
  }

  for (const trade of trades) {
    const entryDate = new Date(trade.entryDate);
    const day = dayNames[entryDate.getDay()];
    const hour = entryDate.getHours();
    const pnl = new Decimal(trade.netPnL || 0);

    if (dayStats[day]) {
      dayStats[day].total += 1;
      dayStats[day].pnl = dayStats[day].pnl.plus(pnl);
      if (pnl.greaterThan(0)) dayStats[day].wins += 1;
    }

    if (hourStats[hour]) {
      hourStats[hour].total += 1;
      hourStats[hour].pnl = hourStats[hour].pnl.plus(pnl);
      if (pnl.greaterThan(0)) hourStats[hour].wins += 1;
    }
  }

  const dayResult = Object.entries(dayStats).map(([day, stat]) => ({
    day,
    totalTrades: stat.total,
    winRate: stat.total > 0 ? (stat.wins / stat.total) * 100 : 0,
    netPnL: stat.pnl.toNumber(),
  }));

  const hourResult = Object.entries(hourStats).map(([hourStr, stat]) => ({
    hour: Number(hourStr),
    label: `${hourStr.padStart(2, "0")}:00`,
    totalTrades: stat.total,
    winRate: stat.total > 0 ? (stat.wins / stat.total) * 100 : 0,
    netPnL: stat.pnl.toNumber(),
  }));

  return NextResponse.json({
    byDay: dayResult,
    byHour: hourResult,
  });
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const strategies = await prisma.strategy.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ strategies });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, description, rules, targetWinRate, targetRR } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Strategy name is required" }, { status: 400 });
    }

    const strategy = await prisma.strategy.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        rules: rules || null,
        targetWinRate: targetWinRate ? Number(targetWinRate) : null,
        targetRR: targetRR ? Number(targetRR) : null,
      },
    });

    return NextResponse.json({ strategy }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create strategy" }, { status: 500 });
  }
}

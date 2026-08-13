import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accounts = await prisma.tradingAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ accounts });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, broker, currency, initialBalance, isDefault } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Account name is required" }, { status: 400 });
    }

    if (isDefault) {
      await prisma.tradingAccount.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    const account = await prisma.tradingAccount.create({
      data: {
        userId: session.user.id,
        name,
        broker: broker || "Generic",
        currency: currency || "USD",
        initialBalance: Number(initialBalance || 10000),
        currentBalance: Number(initialBalance || 10000),
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create account" }, { status: 500 });
  }
}

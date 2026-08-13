import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, broker, currency, initialBalance, isDefault } = await req.json();

    // Verify multi-tenant ownership
    const existing = await prisma.tradingAccount.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Account not found or access denied" }, { status: 404 });
    }

    if (isDefault) {
      await prisma.tradingAccount.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }

    const updatedAccount = await prisma.tradingAccount.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existing.name,
        broker: broker !== undefined ? broker : existing.broker,
        currency: currency !== undefined ? currency : existing.currency,
        initialBalance: initialBalance !== undefined ? Number(initialBalance) : existing.initialBalance,
        isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
      },
    });

    return NextResponse.json({ account: updatedAccount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update account" }, { status: 500 });
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

  const existing = await prisma.tradingAccount.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Account not found or access denied" }, { status: 404 });
  }

  await prisma.tradingAccount.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ message: "Account deleted successfully" });
}

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
    const { name, description, rules, targetWinRate, targetRR } = await req.json();

    const existing = await prisma.strategy.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Strategy not found or access denied" }, { status: 404 });
    }

    const updated = await prisma.strategy.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        rules: rules !== undefined ? rules : existing.rules,
        targetWinRate: targetWinRate !== undefined ? Number(targetWinRate) : existing.targetWinRate,
        targetRR: targetRR !== undefined ? Number(targetRR) : existing.targetRR,
      },
    });

    return NextResponse.json({ strategy: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update strategy" }, { status: 500 });
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

  const existing = await prisma.strategy.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Strategy not found or access denied" }, { status: 404 });
  }

  await prisma.strategy.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ message: "Strategy deleted successfully" });
}

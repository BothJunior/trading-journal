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
    const { name, color, type } = await req.json();

    const existing = await prisma.tag.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tag not found or access denied" }, { status: 404 });
    }

    const updated = await prisma.tag.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        color: color !== undefined ? color : existing.color,
        type: type !== undefined ? type : existing.type,
      },
    });

    return NextResponse.json({ tag: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update tag" }, { status: 500 });
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

  const existing = await prisma.tag.findFirst({
    where: { id: params.id, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Tag not found or access denied" }, { status: 404 });
  }

  await prisma.tag.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ message: "Tag deleted successfully" });
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        tradingAccounts: {
          create: {
            name: "XAUUSD Gold Account",
            broker: "MetaTrader / Forex",
            currency: "USD",
            initialBalance: 10000,
            currentBalance: 10000,
            isDefault: true,
          },
        },
        strategies: {
          createMany: {
            data: [
              {
                name: "Asia Range Sweep & Reversal",
                description: "Trading XAUUSD liquidity sweeps above/below Asia Session high/low during London open",
                targetWinRate: 65,
                targetRR: 2.5,
              },
              {
                name: "NY Session Expansion",
                description: "Momentum continuation on Gold during US Market Open & NY session liquidity expansion",
                targetWinRate: 60,
                targetRR: 3.0,
              },
              {
                name: "Gold Order Block / FVG Re-test",
                description: "SMC Fair Value Gap and Order Block re-test on 15m/1h timeframe",
                targetWinRate: 70,
                targetRR: 2.0,
              },
              {
                name: "Psychological Key Level Rejection",
                description: "Trading clean price action rejections at major round numbers ($2600, $2700, $3000)",
                targetWinRate: 55,
                targetRR: 3.5,
              },
            ],
          },
        },
        tags: {
          createMany: {
            data: [
              // Gold Setup Tags
              { name: "Asia Sweep", color: "#f59e0b", type: "SETUP" },
              { name: "London Expansion", color: "#eab308", type: "SETUP" },
              { name: "NY Volatility Shift", color: "#3b82f6", type: "SETUP" },
              { name: "Gold FVG Re-test", color: "#8b5cf6", type: "SETUP" },
              { name: "Key Level Bounce", color: "#10b981", type: "SETUP" },

              // Gold Mistake Tags
              { name: "Chased Gold Spike", color: "#ef4444", type: "MISTAKE" },
              { name: "FOMO During NFP/CPI", color: "#f97316", type: "MISTAKE" },
              { name: "Ignored Gold Spread", color: "#dc2626", type: "MISTAKE" },
              { name: "Overleveraged Gold Position", color: "#b91c1c", type: "MISTAKE" },
              { name: "Early Exit on Wick", color: "#eab308", type: "MISTAKE" },

              // Emotional Tags
              { name: "Calm & Patient", color: "#06b6d4", type: "EMOTION" },
              { name: "Anxious / Over-trading", color: "#ec4899", type: "EMOTION" },
            ],
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to register user" },
      { status: 500 }
    );
  }
}

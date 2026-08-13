import crypto from "crypto";

export function normalizeGoldTicker(ticker: string): string {
  const clean = (ticker || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.includes("XAU") || clean.includes("GOLD")) {
    return "XAUUSD";
  }
  return clean || "XAUUSD";
}

export function computeExecutionHash(
  userId: string,
  timestamp: Date | string,
  ticker: string,
  price: number | string,
  quantity: number | string,
  action: string
): string {
  const formattedTime = new Date(timestamp).toISOString();
  const normalizedTicker = normalizeGoldTicker(ticker);
  const normalizedPrice = Number(price).toFixed(8);
  const normalizedQty = Number(quantity).toFixed(8);
  const normalizedAction = action.trim().toUpperCase();

  const payload = `${userId}:${formattedTime}:${normalizedTicker}:${normalizedPrice}:${normalizedQty}:${normalizedAction}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

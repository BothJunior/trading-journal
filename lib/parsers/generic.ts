import Papa from "papaparse";
import { ParseResult, ParsedExecution } from "./types";

export interface ColumnMapping {
  ticker: string;
  action: string;
  price: string;
  quantity: string;
  timestamp: string;
  fee?: string;
}

/**
 * Generic parser accepting arbitrary user column mapping.
 */
export function parseGenericCSV(
  csvContent: string,
  mapping?: ColumnMapping
): ParseResult {
  const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  const executions: ParsedExecution[] = [];
  const errors: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i] as Record<string, string>;

    try {
      const tickerCol = mapping?.ticker || findHeader(row, ["ticker", "symbol", "pair", "item", "asset"]);
      const actionCol = mapping?.action || findHeader(row, ["action", "side", "type", "buy/sell"]);
      const priceCol = mapping?.price || findHeader(row, ["price", "rate", "execprice", "trade price"]);
      const qtyCol = mapping?.quantity || findHeader(row, ["quantity", "qty", "size", "volume", "amount", "shares"]);
      const feeCol = mapping?.fee || findHeader(row, ["fee", "commission", "comm"]);
      const timeCol = mapping?.timestamp || findHeader(row, ["timestamp", "date", "time", "date/time", "createdat"]);

      const ticker = row[tickerCol] || "";
      const rawAction = (row[actionCol] || "").toUpperCase();
      const price = parseFloat(row[priceCol] || "0");
      const qty = parseFloat(row[qtyCol] || "0");
      const fee = feeCol ? Math.abs(parseFloat(row[feeCol] || "0")) : 0;
      const timeStr = row[timeCol] || "";

      if (!ticker || isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) {
        continue;
      }

      const action: "BUY" | "SELL" = rawAction.includes("BUY") || rawAction.startsWith("B") ? "BUY" : "SELL";
      const timestamp = timeStr ? new Date(timeStr) : new Date();

      executions.push({
        timestamp,
        ticker: ticker.trim().toUpperCase(),
        action,
        price,
        quantity: qty,
        fee,
        broker: "GENERIC",
        rawRecord: row,
      });
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message || "Failed to parse Generic CSV row"}`);
    }
  }

  return { executions, errors };
}

function findHeader(row: Record<string, string>, keywords: string[]): string {
  const keys = Object.keys(row);
  for (const kw of keywords) {
    const match = keys.find((k) => k.toLowerCase().includes(kw));
    if (match) return match;
  }
  return keys[0] || "";
}

import Papa from "papaparse";
import { ParseResult, ParsedExecution } from "./types";

/**
 * Parser for Binance Spot & Futures CSV Trade History.
 * Common headers: Symbol, Side, Price, Executed, Amount, Fee, Date(UTC) / Time
 */
export function parseBinanceCSV(csvContent: string): ParseResult {
  const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  const executions: ParsedExecution[] = [];
  const errors: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i] as Record<string, string>;

    try {
      const symbol = row["Symbol"] || row["Market"] || row["pair"] || "";
      const side = (row["Side"] || row["Type"] || row["action"] || "").toUpperCase();
      const price = parseFloat(row["Price"] || row["Average Price"] || "0");
      const qty = parseFloat(row["Executed"] || row["Amount"] || row["Filled"] || "0");
      const fee = Math.abs(parseFloat(row["Fee"] || row["Commission"] || "0"));
      const timeStr = row["Date(UTC)"] || row["Time"] || row["Date"] || "";

      if (!symbol || isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) {
        continue;
      }

      const action: "BUY" | "SELL" = side.includes("BUY") ? "BUY" : "SELL";
      const timestamp = timeStr ? new Date(timeStr) : new Date();

      executions.push({
        timestamp,
        ticker: symbol.trim().toUpperCase(),
        action,
        price,
        quantity: qty,
        fee,
        broker: "BINANCE",
        rawRecord: row,
      });
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message || "Failed to parse Binance row"}`);
    }
  }

  return { executions, errors };
}

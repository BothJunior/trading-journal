import Papa from "papaparse";
import { ParseResult, ParsedExecution } from "./types";

/**
 * Parser for Interactive Brokers Flex Query / Trade Confirmations CSV.
 * Common headers: Symbol, Date/Time, Buy/Sell, Quantity, Price, Comm/Fee
 */
export function parseIBKRCSV(csvContent: string): ParseResult {
  const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  const executions: ParsedExecution[] = [];
  const errors: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i] as Record<string, string>;

    try {
      const symbol = row["Symbol"] || row["symbol"] || row["Financial Instrument"] || "";
      const side = (row["Buy/Sell"] || row["Side"] || row["Action"] || "").toUpperCase();
      const price = Math.abs(parseFloat(row["Price"] || row["Trade Price"] || "0"));
      const qty = Math.abs(parseFloat(row["Quantity"] || row["Shares"] || "0"));
      const fee = Math.abs(parseFloat(row["Comm/Fee"] || row["Commission"] || "0"));
      const timeStr = row["Date/Time"] || row["Trade Date"] || row["Time"] || "";

      if (!symbol || isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) {
        continue;
      }

      const action: "BUY" | "SELL" = side.startsWith("B") || side.includes("BUY") ? "BUY" : "SELL";
      const timestamp = timeStr ? new Date(timeStr) : new Date();

      executions.push({
        timestamp,
        ticker: symbol.trim().toUpperCase(),
        action,
        price,
        quantity: qty,
        fee,
        broker: "IBKR",
        rawRecord: row,
      });
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message || "Failed to parse IBKR row"}`);
    }
  }

  return { executions, errors };
}

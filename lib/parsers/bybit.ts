import Papa from "papaparse";
import { ParseResult, ParsedExecution } from "./types";

/**
 * Parser for Bybit Trade History CSV.
 * Common headers: Symbol, Side, Executed Price, Executed Qty, Fee Paid, Transaction Time
 */
export function parseBybitCSV(csvContent: string): ParseResult {
  const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  const executions: ParsedExecution[] = [];
  const errors: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i] as Record<string, string>;

    try {
      const symbol = row["Symbol"] || row["Contracts"] || "";
      const side = (row["Side"] || row["Action"] || "").toUpperCase();
      const price = parseFloat(row["Executed Price"] || row["Order Price"] || row["Price"] || "0");
      const qty = parseFloat(row["Executed Qty"] || row["Qty"] || row["Quantity"] || "0");
      const fee = Math.abs(parseFloat(row["Fee Paid"] || row["Fee"] || "0"));
      const timeStr = row["Transaction Time"] || row["Filled Time"] || row["Time"] || "";

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
        broker: "BYBIT",
        rawRecord: row,
      });
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message || "Failed to parse Bybit row"}`);
    }
  }

  return { executions, errors };
}

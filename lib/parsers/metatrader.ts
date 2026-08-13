import Papa from "papaparse";
import { ParseResult, ParsedExecution } from "./types";

/**
 * Parser for MetaTrader 4 / 5 CSV export files.
 * Format usually has headers like: Ticket, Open Time, Type, Size, Item, Price, S / L, T / P, Close Time, Commission, Taxes, Swap, Profit
 */
export function parseMetaTraderCSV(csvContent: string): ParseResult {
  const parsed = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  const executions: ParsedExecution[] = [];
  const errors: string[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i] as Record<string, string>;

    try {
      const type = (row["Type"] || row["type"] || row["Action"] || "").toUpperCase();
      const ticker = row["Item"] || row["Symbol"] || row["symbol"] || row["Ticker"] || "";
      const price = parseFloat(row["Price"] || row["price"] || "0");
      const qty = parseFloat(row["Size"] || row["Volume"] || row["Lots"] || row["quantity"] || "0");
      const fee = Math.abs(parseFloat(row["Commission"] || row["Swap"] || row["fee"] || "0"));
      const timeStr = row["Open Time"] || row["Time"] || row["Date"] || row["timestamp"] || "";

      if (!ticker || isNaN(price) || isNaN(qty) || price <= 0 || qty <= 0) {
        continue;
      }

      const action: "BUY" | "SELL" = type.includes("BUY") ? "BUY" : "SELL";
      const timestamp = timeStr ? new Date(timeStr) : new Date();

      executions.push({
        timestamp,
        ticker: ticker.trim().toUpperCase(),
        action,
        price,
        quantity: qty,
        fee,
        broker: "METATRADER",
        rawRecord: row,
      });
    } catch (err: any) {
      errors.push(`Row ${i + 1}: ${err.message || "Failed to parse MT row"}`);
    }
  }

  return { executions, errors };
}

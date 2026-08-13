import { parseMetaTraderCSV } from "./metatrader";
import { parseIBKRCSV } from "./interactive-brokers";
import { parseBinanceCSV } from "./binance";
import { parseBybitCSV } from "./bybit";
import { parseGenericCSV, ColumnMapping } from "./generic";
import { BrokerType, ParseResult } from "./types";
import { computeExecutionHash } from "./hash";

export * from "./types";
export * from "./hash";

export function parseBrokerCSV(
  broker: BrokerType,
  csvContent: string,
  mapping?: ColumnMapping
): ParseResult {
  switch (broker) {
    case "METATRADER":
      return parseMetaTraderCSV(csvContent);
    case "IBKR":
      return parseIBKRCSV(csvContent);
    case "BINANCE":
      return parseBinanceCSV(csvContent);
    case "BYBIT":
      return parseBybitCSV(csvContent);
    case "GENERIC":
    default:
      return parseGenericCSV(csvContent, mapping);
  }
}

import Decimal from "decimal.js";

export interface PriceBar {
  high: number | string;
  low: number | string;
  close?: number | string;
  timestamp: Date | string;
}

export interface ExcursionResult {
  mae: number; // Max Adverse Excursion (absolute price distance or currency offset)
  mfe: number; // Max Favourable Excursion
  maeR?: number; // MAE in terms of initial risk (R)
  mfeR?: number; // MFE in terms of initial risk (R)
}

/**
 * Computes MAE and MFE using price bar data during trade duration.
 */
export function calculateExcursion(
  entryPrice: number | string,
  direction: "LONG" | "SHORT",
  bars: PriceBar[],
  initialRisk?: number | string
): ExcursionResult {
  const entry = new Decimal(entryPrice);
  const isLong = direction.toUpperCase() === "LONG";
  const risk = new Decimal(initialRisk || 0);

  if (bars.length === 0 || entry.isZero()) {
    return { mae: 0, mfe: 0, maeR: 0, mfeR: 0 };
  }

  let maxAdverse = new Decimal(0);
  let maxFavourable = new Decimal(0);

  for (const bar of bars) {
    const high = new Decimal(bar.high);
    const low = new Decimal(bar.low);

    if (isLong) {
      // Long position:
      // Favourable is price rising above entry (High - Entry)
      // Adverse is price dropping below entry (Entry - Low)
      const fav = high.minus(entry);
      const adv = entry.minus(low);

      if (fav.greaterThan(maxFavourable)) maxFavourable = fav;
      if (adv.greaterThan(maxAdverse)) maxAdverse = adv;
    } else {
      // Short position:
      // Favourable is price dropping below entry (Entry - Low)
      // Adverse is price rising above entry (High - Entry)
      const fav = entry.minus(low);
      const adv = high.minus(entry);

      if (fav.greaterThan(maxFavourable)) maxFavourable = fav;
      if (adv.greaterThan(maxAdverse)) maxAdverse = adv;
    }
  }

  // Ensure non-negative
  maxAdverse = Decimal.max(0, maxAdverse);
  maxFavourable = Decimal.max(0, maxFavourable);

  let maeR = new Decimal(0);
  let mfeR = new Decimal(0);

  if (!risk.isZero() && !risk.isNegative()) {
    maeR = maxAdverse.div(risk);
    mfeR = maxFavourable.div(risk);
  }

  return {
    mae: maxAdverse.toNumber(),
    mfe: maxFavourable.toNumber(),
    maeR: maeR.toNumber(),
    mfeR: mfeR.toNumber(),
  };
}

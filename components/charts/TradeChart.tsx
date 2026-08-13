"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, CandlestickData, Time } from "lightweight-charts";

export interface ExecutionMarker {
  timestamp: string | Date;
  action: "BUY" | "SELL";
  price: number;
  quantity: number;
}

interface TradeChartProps {
  candles?: { time: string | number; open: number; high: number; low: number; close: number }[];
  executions?: ExecutionMarker[];
  stopLoss?: number | null;
  takeProfit?: number | null;
  entryPrice?: number | null;
  height?: number;
}

export default function TradeChart({
  candles = [],
  executions = [],
  stopLoss,
  takeProfit,
  entryPrice,
  height = 400,
}: TradeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    chartContainerRef.current.innerHTML = "";

    const chart = createChart(chartContainerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#090d16" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.5)" },
        horzLines: { color: "rgba(30, 41, 59, 0.5)" },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: "#334155",
      },
      timeScale: {
        borderColor: "#334155",
        timeVisible: true,
      },
      localization: {
        timeFormatter: (timeSec: number) => {
          return new Date(timeSec * 1000).toLocaleString();
        },
      },
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
    });

    let formattedCandles: CandlestickData<Time>[] = [];

    if (candles && candles.length > 0) {
      formattedCandles = candles
        .map((c) => ({
          time: (typeof c.time === "number"
            ? c.time
            : Math.floor(new Date(c.time).getTime() / 1000)) as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
        .sort((a, b) => (a.time as number) - (b.time as number));
    } else if (executions && executions.length > 0) {
      const sortedExecs = [...executions].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      const baseTime = Math.floor(new Date(sortedExecs[0].timestamp).getTime() / 1000);
      const entryP = sortedExecs[0].price;

      // Prepend pre-entry context candles
      formattedCandles = [
        {
          time: (baseTime - 7200) as Time,
          open: entryP * 0.997,
          high: entryP * 1.001,
          low: entryP * 0.995,
          close: entryP * 0.999,
        },
        {
          time: (baseTime - 3600) as Time,
          open: entryP * 0.999,
          high: entryP * 1.002,
          low: entryP * 0.998,
          close: entryP,
        },
      ];

      // Add execution bars
      sortedExecs.forEach((exec, idx) => {
        const time = (baseTime + (idx + 1) * 3600) as Time;
        const p = exec.price;
        const prevClose = idx > 0 ? sortedExecs[idx - 1].price : entryP;
        formattedCandles.push({
          time,
          open: prevClose,
          high: Math.max(prevClose, p) * 1.001,
          low: Math.min(prevClose, p) * 0.999,
          close: p,
        });
      });

      // Post-exit context bar
      const lastExec = sortedExecs[sortedExecs.length - 1];
      const lastTime = baseTime + (sortedExecs.length + 1) * 3600;
      formattedCandles.push({
        time: lastTime as Time,
        open: lastExec.price,
        high: lastExec.price * 1.002,
        low: lastExec.price * 0.998,
        close: lastExec.price,
      });
    } else if (entryPrice) {
      // Fallback if only entryPrice prop is passed
      const nowSec = Math.floor(Date.now() / 1000);
      const p = entryPrice;
      formattedCandles = [
        { time: (nowSec - 7200) as Time, open: p * 0.998, high: p * 1.001, low: p * 0.996, close: p * 0.999 },
        { time: (nowSec - 3600) as Time, open: p * 0.999, high: p * 1.002, low: p * 0.998, close: p },
        { time: nowSec as Time, open: p, high: p * 1.003, low: p * 0.997, close: p * 1.001 },
      ];
    }

    if (formattedCandles.length > 0) {
      candleSeries.setData(formattedCandles);
    }

    // Set Execution Markers (BUY = Arrow Up Green, SELL = Arrow Down Red)
    if (executions && executions.length > 0 && formattedCandles.length > 0) {
      const markers = executions.map((exec, idx) => {
        const isBuy = exec.action.toUpperCase() === "BUY";
        // Map execution marker to corresponding candle index (offset by +2 pre-entry bars)
        const candleIdx = Math.min(idx + 2, formattedCandles.length - 1);
        const targetCandleTime = formattedCandles[candleIdx].time;

        return {
          time: targetCandleTime,
          position: isBuy ? ("belowBar" as const) : ("aboveBar" as const),
          color: isBuy ? "#10b981" : "#ef4444",
          shape: isBuy ? ("arrowUp" as const) : ("arrowDown" as const),
          text: `${exec.action} @ $${exec.price} (${exec.quantity})`,
        };
      });

      candleSeries.setMarkers(markers);
    }

    // Add Stop Loss Horizontal Line Overlay
    if (stopLoss) {
      candleSeries.createPriceLine({
        price: stopLoss,
        color: "#ef4444",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `SL: $${stopLoss}`,
      });
    }

    // Add Take Profit Horizontal Line Overlay
    if (takeProfit) {
      candleSeries.createPriceLine({
        price: takeProfit,
        color: "#10b981",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `TP: $${takeProfit}`,
      });
    }

    // Add Entry Price Horizontal Line Overlay
    if (entryPrice) {
      candleSeries.createPriceLine({
        price: entryPrice,
        color: "#3b82f6",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: `Entry: $${entryPrice}`,
      });
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [candles, executions, stopLoss, takeProfit, entryPrice, height]);

  return (
    <div className="w-full relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2">
      <div ref={chartContainerRef} className="w-full h-full min-h-[350px]" />
    </div>
  );
}

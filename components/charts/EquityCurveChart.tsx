"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, Time } from "lightweight-charts";

interface EquityCurvePoint {
  time: string;
  pnl: number;
  balance: number;
}

interface EquityCurveChartProps {
  data: EquityCurvePoint[];
  height?: number;
  initialBalance?: number;
}

export default function EquityCurveChart({
  data = [],
  height = 300,
  initialBalance = 10000,
}: EquityCurveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

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
        vertLines: { color: "rgba(30, 41, 59, 0.3)" },
        horzLines: { color: "rgba(30, 41, 59, 0.3)" },
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

    const areaSeries = chart.addAreaSeries({
      topColor: "rgba(16, 185, 129, 0.4)",
      bottomColor: "rgba(16, 185, 129, 0.0)",
      lineColor: "#10b981",
      lineWidth: 2,
    });

    if (data.length > 0) {
      const rawSorted = [...data].sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      );

      const formattedData: { time: Time; value: number }[] = [];
      let lastTimeSec = -1;

      for (const item of rawSorted) {
        let timeSec = Math.floor(new Date(item.time).getTime() / 1000);
        if (timeSec <= lastTimeSec) {
          timeSec = lastTimeSec + 1;
        }
        lastTimeSec = timeSec;
        formattedData.push({
          time: timeSec as Time,
          value: item.balance,
        });
      }

      areaSeries.setData(formattedData);
    } else {
      // Empty baseline fallback
      const now = Math.floor(Date.now() / 1000);
      areaSeries.setData([
        { time: (now - 86400) as Time, value: initialBalance },
        { time: now as Time, value: initialBalance },
      ]);
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
  }, [data, height, initialBalance]);

  return (
    <div className="w-full relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-2">
      <div ref={chartContainerRef} className="w-full h-full min-h-[250px]" />
    </div>
  );
}

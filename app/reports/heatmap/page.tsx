"use client";

import { useEffect, useState } from "react";
import { BarChart3, Clock, Calendar } from "lucide-react";

export default function HeatmapPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHeatmap();
  }, []);

  const fetchHeatmap = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/heatmap");
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Failed to load heatmap data", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 sm:p-3 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
            <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Time & Day Distribution Heatmap</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Identify high-probability trading windows and avoid low-edge sessions
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Day of Week Card */}
        <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <span>Performance by Day of Week</span>
          </h2>

          {loading ? (
            <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : (
            <div className="space-y-3">
              {data?.byDay?.map((item: any) => {
                const isProfitable = item.netPnL >= 0;
                return (
                  <div
                    key={item.day}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs sm:text-sm"
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <span className="w-10 font-bold text-white text-xs sm:text-sm">{item.day}</span>
                      <span className="text-[11px] text-slate-400">({item.totalTrades}t)</span>
                    </div>

                    <div className="flex items-center space-x-3 sm:space-x-4">
                      <div className="text-right">
                        <div className="text-[10px] sm:text-xs text-slate-400 font-medium">Win Rate</div>
                        <div className="text-xs sm:text-sm font-bold text-cyan-400">{item.winRate.toFixed(1)}%</div>
                      </div>

                      <div className="text-right w-20 sm:w-24">
                        <div className="text-[10px] sm:text-xs text-slate-400 font-medium">Net PnL</div>
                        <div
                          className={`text-xs sm:text-sm font-bold font-mono ${
                            isProfitable ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {isProfitable ? "+" : ""}${item.netPnL.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hourly Distribution Grid */}
        <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <span>Hourly Execution Grid</span>
          </h2>

          {loading ? (
            <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {data?.byHour?.map((item: any) => {
                const hasTrades = item.totalTrades > 0;
                const isWin = item.netPnL > 0;
                const isLoss = item.netPnL < 0;

                return (
                  <div
                    key={item.hour}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      !hasTrades
                        ? "bg-slate-900/30 border-slate-800/40 text-slate-600"
                        : isWin
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : isLoss
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        : "bg-slate-800/40 border-slate-700 text-slate-300"
                    }`}
                  >
                    <div className="text-[11px] font-bold text-slate-400">{item.label}</div>
                    <div className="text-xs font-mono font-bold mt-1">
                      {hasTrades ? `${item.winRate.toFixed(0)}%` : "-"}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {hasTrades ? `${item.totalTrades}t` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

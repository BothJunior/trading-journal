"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, DollarSign, ArrowDownRight, ShieldAlert } from "lucide-react";

export default function MistakeLeakagePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMistakes();
  }, []);

  const fetchMistakes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/mistakes");
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Failed to load mistake leakage report", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 sm:p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">XAUUSD Gold Mistake Leakage</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Quantify financial capital drained directly by Gold discipline failures (news spikes, FOMO, spread slippage)
            </p>
          </div>
        </div>
      </div>

      {/* Summary Highlight Card */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 border border-rose-500/30 bg-rose-950/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-full">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-rose-300 uppercase tracking-wider">
              Total Capital Lost to Mistakes
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-rose-400 font-mono tracking-tight mt-1">
              -${data?.grandTotalMistakeLoss?.toLocaleString("en-US", { minimumFractionDigits: 2 }) || "0.00"}
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400 max-w-xs sm:text-right">
          Eliminating these top mistake patterns would immediately increase portfolio net balance.
        </p>
      </div>

      {/* Breakdown Table */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <h2 className="text-lg font-bold text-white">Mistake Tag Financial Breakdown</h2>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">Loading mistake data...</div>
        ) : !data?.mistakes || data.mistakes.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No mistake tags recorded yet. Tag your trades with behavioral mistakes to track capital leakage.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Mistake Tag</th>
                  <th className="py-3 px-4">Tagged Trades</th>
                  <th className="py-3 px-4">Losing Trades</th>
                  <th className="py-3 px-4">Total Loss ($)</th>
                  <th className="py-3 px-4">Net Tag PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {data.mistakes.map((item: any) => (
                  <tr key={item.tagId} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold">
                      <span
                        style={{ backgroundColor: `${item.tagColor}20`, color: item.tagColor }}
                        className="px-3 py-1 rounded-lg border border-current text-xs"
                      >
                        {item.tagName}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono">{item.tradeCount}</td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono">{item.mistakeCount}</td>
                    <td className="py-3.5 px-4 font-bold text-rose-400 font-mono">
                      -${item.totalLoss.toFixed(2)}
                    </td>
                    <td
                      className={`py-3.5 px-4 font-bold font-mono ${
                        item.totalNetPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {item.totalNetPnL >= 0 ? "+" : ""}${item.totalNetPnL.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import TradeChart from "@/components/charts/TradeChart";
import { ArrowLeft, Tag as TagIcon, Check, Save, Award } from "lucide-react";
import Link from "next/link";
import { formatLocalDateTime, formatLocalTime } from "@/lib/utils/formatDate";

export default function TradeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tradeId = params.id as string;

  const [trade, setTrade] = useState<any>(null);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTradeDetail();
    fetchAllTags();
    fetchStrategies();
  }, [tradeId]);

  const fetchTradeDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trades/${tradeId}`);
      const data = await res.json();
      if (data.trade) {
        setTrade(data.trade);
        setNotes(data.trade.notes || "");
        setSelectedStrategyId(data.trade.strategyId || "");
        setSelectedTagIds(data.trade.tradeTags.map((tt: any) => tt.tag.id));
      }
    } catch (err) {
      console.error("Failed to load trade detail", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTags = async () => {
    const res = await fetch("/api/tags");
    const data = await res.json();
    if (data.tags) setAllTags(data.tags);
  };

  const fetchStrategies = async () => {
    const res = await fetch("/api/strategies");
    const data = await res.json();
    if (data.strategies) setStrategies(data.strategies);
  };

  const handleSaveTagsAndNotes = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/trades/${tradeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId: selectedStrategyId || null,
          tagIds: selectedTagIds,
          notes,
        }),
      });

      if (res.ok) {
        fetchTradeDetail();
      }
    } catch (err) {
      console.error("Failed to save changes", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto p-8 text-center text-slate-400">Loading trade detail...</div>;
  }

  if (!trade) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center text-slate-400">
        Trade not found. <Link href="/dashboard/trades" className="text-blue-400 hover:underline">Back to Journal</Link>
      </div>
    );
  }

  const isWin = trade.netPnL > 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-white tracking-tight">{trade.ticker}</h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  trade.direction === "LONG"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                {trade.direction}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Logged on {formatLocalDateTime(trade.entryDate)} | Account: {trade.tradingAccount?.name}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400 font-medium">Net Realized PnL</div>
          <div className={`text-2xl font-bold font-mono ${isWin ? "text-emerald-400" : "text-rose-400"}`}>
            {isWin ? "+" : ""}${trade.netPnL.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Section: Chart & Executions */}
        <div className="lg:col-span-2 space-y-6">
          {/* TradingView Chart Overlay */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-white">Execution Chart Overlay</h2>
            <TradeChart
              executions={trade.executions}
              stopLoss={trade.stopLoss}
              takeProfit={trade.takeProfit}
              entryPrice={trade.entryPrice}
            />
          </div>

          {/* Execution Child Fills Table */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-white">Execution Scaling Fills</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Price</th>
                    <th className="py-2.5 px-4">Qty</th>
                    <th className="py-2.5 px-4">Fee</th>
                    <th className="py-2.5 px-4">SHA256 Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {trade.executions?.map((e: any) => (
                    <tr key={e.id} className="hover:bg-slate-900/40">
                      <td className="py-2.5 px-4 text-slate-300 font-mono">
                        {formatLocalTime(e.timestamp)}
                      </td>
                      <td className="py-2.5 px-4 font-bold">
                        <span className={e.action === "BUY" ? "text-emerald-400" : "text-rose-400"}>
                          {e.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-white font-mono">${e.price.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-slate-300 font-mono">{e.quantity}</td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono">${e.fee.toFixed(2)}</td>
                      <td className="py-2.5 px-4 text-xs font-mono text-slate-500 truncate max-w-[120px]">
                        {e.executionHash}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar: Strategy Link & Qualitative Tags */}
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <TagIcon className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">Playbook & Tags</h2>
              </div>
              <button
                onClick={handleSaveTagsAndNotes}
                disabled={saving}
                className="flex items-center space-x-1 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save Trade"}</span>
              </button>
            </div>

            {/* Playbook Strategy Link */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1">
                  <Award className="w-4 h-4 text-amber-400 inline" />
                  <span>Linked Playbook Strategy</span>
                </label>
                <Link
                  href="/reports/setups"
                  target="_blank"
                  className="text-[11px] text-amber-400 hover:underline font-semibold"
                >
                  Setup Matrix ↗
                </Link>
              </div>
              <select
                value={selectedStrategyId}
                onChange={(e) => setSelectedStrategyId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-xl p-2.5 focus:outline-none focus:border-amber-500 font-medium"
              >
                <option value="">No Strategy Linked</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Qualitative Tags */}
            <div className="space-y-4 pt-2 border-t border-slate-800">
              {["MISTAKE", "SETUP", "EMOTION"].map((category) => {
                const categoryTags = allTags.filter((t) => t.type === category);
                if (categoryTags.length === 0) return null;

                return (
                  <div key={category} className="space-y-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {category} Tags
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categoryTags.map((t) => {
                        const isSelected = selectedTagIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedTagIds((prev) =>
                                isSelected ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                              );
                            }}
                            style={{
                              backgroundColor: isSelected ? `${t.color}30` : "transparent",
                              borderColor: t.color,
                              color: isSelected ? "#ffffff" : t.color,
                            }}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold border flex items-center space-x-1 transition-all"
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            <span>{t.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Behavioral Journal Notes
              </label>
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Log emotional state, mistakes, rules followed, and setup execution..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

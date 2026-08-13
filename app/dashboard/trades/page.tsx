"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Filter, Search, ArrowUpRight, ArrowDownRight, Trash2, X } from "lucide-react";
import { getContractMultiplier } from "@/lib/analytics/executions";
import { toLocalDatetimeInput, formatLocalDateTime } from "@/lib/utils/formatDate";

function TradesContent() {
  const searchParams = useSearchParams();
  const [trades, setTrades] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);

  // Filters
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Trade Form State (Gold XAUUSD Exclusive Defaults)
  const [formData, setFormData] = useState({
    tradingAccountId: "",
    strategyId: "",
    ticker: "XAUUSD",
    direction: "LONG",
    assetClass: "COMMODITY",
    entryDate: toLocalDatetimeInput(),
    initialRisk: "100",
    stopLoss: "",
    takeProfit: "",
    entryPrice: "",
    exitPrice: "",
    quantity: "1.00", // Standard / Mini Lot
    fees: "0",
    notes: "",
    selectedTagIds: [] as string[],
  });

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setShowLogModal(true);
    }
    const stratIdParam = searchParams.get("strategyId");
    if (stratIdParam) {
      setSelectedStrategy(stratIdParam);
    }
  }, [searchParams]);

  useEffect(() => {
    loadJournalData();
  }, [selectedAccount, selectedStrategy, selectedStatus]);

  const loadJournalData = async () => {
    setLoading(true);
    try {
      let tradesUrl = "/api/trades?";
      if (selectedAccount) tradesUrl += `tradingAccountId=${selectedAccount}&`;
      if (selectedStrategy) tradesUrl += `strategyId=${selectedStrategy}&`;
      if (selectedStatus) tradesUrl += `status=${selectedStatus}&`;

      const [accRes, stratRes, tagRes, tradesRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/strategies"),
        fetch("/api/tags"),
        fetch(tradesUrl),
      ]);

      const [accData, stratData, tagData, tradesData] = await Promise.all([
        accRes.json(),
        stratRes.json(),
        tagRes.json(),
        tradesRes.json(),
      ]);

      if (accData.accounts) {
        setAccounts(accData.accounts);
        if (accData.accounts.length > 0) {
          setFormData((prev) => ({ ...prev, tradingAccountId: accData.accounts[0].id }));
        }
      }
      if (stratData.strategies) setStrategies(stratData.strategies);
      if (tagData.tags) setTags(tagData.tags);
      if (tradesData.trades) setTrades(tradesData.trades);
    } catch (err) {
      console.error("Failed to load journal data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const entryP = parseFloat(formData.entryPrice || "0");
      const exitP = parseFloat(formData.exitPrice || "0");
      const qty = parseFloat(formData.quantity || "1");
      const fee = parseFloat(formData.fees || "0");

      const executions = [];
      if (entryP > 0) {
        executions.push({
          timestamp: formData.entryDate,
          action: formData.direction === "LONG" ? "BUY" : "SELL",
          price: entryP,
          quantity: qty,
          fee: fee / 2,
        });
      }
      if (exitP > 0) {
        executions.push({
          timestamp: new Date().toISOString(),
          action: formData.direction === "LONG" ? "SELL" : "BUY",
          price: exitP,
          quantity: qty,
          fee: fee / 2,
        });
      }

      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradingAccountId: formData.tradingAccountId,
          strategyId: formData.strategyId || null,
          ticker: formData.ticker,
          direction: formData.direction,
          assetClass: formData.assetClass,
          entryDate: formData.entryDate,
          initialRisk: formData.initialRisk,
          stopLoss: formData.stopLoss || null,
          takeProfit: formData.takeProfit || null,
          notes: formData.notes,
          executions,
          tagIds: formData.selectedTagIds,
        }),
      });

      if (res.ok) {
        setShowLogModal(false);
        loadJournalData();
      }
    } catch (err) {
      console.error("Failed to create trade", err);
    }
  };

  const handleDeleteTrade = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trade?")) return;
    const res = await fetch(`/api/trades/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadJournalData();
    }
  };

  const filteredTrades = trades.filter((t) =>
    t.ticker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Trading Journal</h1>
          <p className="text-sm text-slate-400 mt-1">Detailed log of executed trades, fills, and tags</p>
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Log New Trade</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-card rounded-xl p-4 border border-slate-800 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ticker (e.g. AAPL, BTCUSDT)..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none"
        >
          <option value="">All Accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStrategy}
          onChange={(e) => setSelectedStrategy(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none"
        >
          <option value="">All Strategies</option>
          {strategies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="CLOSED">CLOSED</option>
          <option value="OPEN">OPEN</option>
        </select>
      </div>

      {/* Trades Table */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800">
        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading trades...</div>
        ) : filteredTrades.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No trades match your search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Ticker</th>
                  <th className="py-3 px-4">Side</th>
                  <th className="py-3 px-4">Entry / Exit</th>
                  <th className="py-3 px-4">Qty</th>
                  <th className="py-3 px-4">Net PnL</th>
                  <th className="py-3 px-4">Return R</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredTrades.map((t) => {
                  const isLong = t.direction === "LONG";
                  const isWin = t.netPnL > 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                        {formatLocalDateTime(t.entryDate)}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        <Link href={`/dashboard/trades/${t.id}`} className="hover:text-blue-400">
                          {t.ticker}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            isLong
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span>{t.direction}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-mono">
                        ${t.entryPrice?.toFixed(2) || "-"} / ${t.exitPrice?.toFixed(2) || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-300">{t.quantity}</td>
                      <td
                        className={`py-3 px-4 font-bold font-mono ${
                          isWin ? "text-emerald-400" : t.netPnL < 0 ? "text-rose-400" : "text-slate-400"
                        }`}
                      >
                        {t.netPnL >= 0 ? "+" : ""}${t.netPnL.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {t.realizedR ? `${t.realizedR.toFixed(2)}R` : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {t.tradeTags?.map((tt: any) => (
                            <span
                              key={tt.tag.id}
                              style={{ backgroundColor: `${tt.tag.color}20`, color: tt.tag.color }}
                              className="px-2 py-0.5 rounded text-[11px] font-semibold border border-current"
                            >
                              {tt.tag.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <Link
                          href={`/dashboard/trades/${t.id}`}
                          className="text-xs text-blue-400 hover:underline font-medium"
                        >
                          Details
                        </Link>
                        <button
                          onClick={() => handleDeleteTrade(t.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Trade Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-xl rounded-2xl p-6 border border-slate-800 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white">Log Trade Record</h2>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrade} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Trading Account</label>
                  <select
                    value={formData.tradingAccountId}
                    onChange={(e) => setFormData({ ...formData, tradingAccountId: e.target.value })}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs text-slate-400">Playbook Strategy</label>
                    <Link
                      href="/reports/setups"
                      target="_blank"
                      className="text-[11px] text-amber-400 hover:underline font-semibold"
                    >
                      Manage in Setup Matrix ↗
                    </Link>
                  </div>
                  <select
                    value={formData.strategyId}
                    onChange={(e) => setFormData({ ...formData, strategyId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">No Strategy (Unlinked)</option>
                    {strategies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs text-slate-400">Asset Ticker</label>
                  <div className="flex items-center space-x-1.5 text-[11px]">
                    <span className="text-slate-500">Quick:</span>
                    {["XAUUSD", "EURUSD", "GBPUSD", "AUDUSD", "USDJPY"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData({ ...formData, ticker: t })}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition-colors ${
                          formData.ticker.toUpperCase() === t
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                            : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="XAUUSD / EURUSD"
                      value={formData.ticker}
                      onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono uppercase font-bold text-amber-400"
                    />
                  </div>

                  <div>
                    <select
                      value={formData.direction}
                      onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-semibold"
                    >
                      <option value="LONG">BUY (LONG)</option>
                      <option value="SHORT">SELL (SHORT)</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={formData.assetClass}
                      onChange={(e) => setFormData({ ...formData, assetClass: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                    >
                      <option value="COMMODITY">COMMODITY (Gold)</option>
                      <option value="FOREX">FOREX</option>
                      <option value="EQUITY">EQUITY</option>
                      <option value="CRYPTO">CRYPTO</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Entry Price</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 1.16000 / 4320"
                    value={formData.entryPrice}
                    onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Exit Price</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 1.17000 / 4440"
                    value={formData.exitPrice}
                    onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Lot Size (Lots)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white font-mono font-bold text-amber-400"
                  />
                  <span className="text-[10px] text-slate-500">
                    {formData.ticker.toUpperCase().includes("XAU") ? "1.00 lot = 100 oz" : "0.01 lot = 1,000 units"}
                  </span>
                </div>
              </div>

              {/* Live Multi-Asset PnL Estimator Box */}
              {(() => {
                const entryP = parseFloat(formData.entryPrice || "0");
                const exitP = parseFloat(formData.exitPrice || "0");
                const lotSize = parseFloat(formData.quantity || "0.01");
                const isLong = formData.direction === "LONG";
                const tickerNorm = (formData.ticker || "").toUpperCase();

                if (entryP > 0 && exitP > 0) {
                  const mult = getContractMultiplier(tickerNorm, exitP);
                  const points = isLong ? exitP - entryP : entryP - exitP;
                  const estPnL = points * (lotSize * mult);
                  const isWin = estPnL >= 0;

                  let moveText = "";
                  if (tickerNorm.includes("JPY")) {
                    const pips = (points * 100).toFixed(1);
                    moveText = `${pips} pips (~$${(0.10 * (100 / exitP) * (lotSize / 0.01)).toFixed(2)}/pip)`;
                  } else if (
                    tickerNorm.includes("EUR") ||
                    tickerNorm.includes("GBP") ||
                    tickerNorm.includes("AUD") ||
                    tickerNorm.includes("NZD")
                  ) {
                    const pips = (points * 10000).toFixed(1);
                    moveText = `${pips} pips ($${(10 * lotSize).toFixed(2)}/pip)`;
                  } else {
                    moveText = `${points >= 0 ? "+" : ""}${points.toFixed(2)} pts × ${lotSize} lot`;
                  }

                  return (
                    <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono font-bold ${
                      isWin
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }`}>
                      <div>
                        💰 Estimated {tickerNorm || "Trade"} PnL: {isWin ? "+" : ""}${estPnL.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {moveText} ({lotSize} lot)
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Qualitative Tags */}

              <div>
                <label className="block text-xs text-slate-400 mb-1">Qualitative Tags</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-900 border border-slate-800 rounded-lg max-h-28 overflow-y-auto">
                  {tags.map((t) => {
                    const isSelected = formData.selectedTagIds.includes(t.id);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => {
                          const newIds = isSelected
                            ? formData.selectedTagIds.filter((id) => id !== t.id)
                            : [...formData.selectedTagIds, t.id];
                          setFormData({ ...formData, selectedTagIds: newIds });
                        }}
                        style={{
                          backgroundColor: isSelected ? `${t.color}30` : "transparent",
                          borderColor: t.color,
                          color: isSelected ? "#ffffff" : t.color,
                        }}
                        className="px-2.5 py-1 rounded-md text-xs border font-medium transition-all"
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Notes / Journal Entry</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="What was your psychological state? What did you learn?"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm shadow-lg shadow-blue-600/20"
                >
                  Save Trade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TradesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading trade journal...</div>}>
      <TradesContent />
    </Suspense>
  );
}

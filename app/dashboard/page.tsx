"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import EquityCurveChart from "@/components/charts/EquityCurveChart";
import { calculateMetrics, PortfolioMetrics } from "@/lib/analytics/metrics";
import { formatLocalDateTime } from "@/lib/utils/formatDate";
import {
  Plus,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Settings,
  X,
  Check,
} from "lucide-react";

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [trades, setTrades] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Account Modal State
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountFormData, setAccountFormData] = useState({
    name: "",
    broker: "",
    initialBalance: "10000",
    currency: "USD",
  });
  const [savingAccount, setSavingAccount] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [selectedAccountId]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const url = selectedAccountId
        ? `/api/trades?tradingAccountId=${selectedAccountId}`
        : "/api/trades";

      const [accRes, tradesRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch(url),
      ]);

      const accData = await accRes.json();
      const tradesData = await tradesRes.json();

      if (accData.accounts) {
        setAccounts(accData.accounts);
        if (!selectedAccountId && accData.accounts.length > 0) {
          const defaultAcc = accData.accounts.find((a: any) => a.isDefault) || accData.accounts[0];
          if (defaultAcc) {
            setSelectedAccountId(defaultAcc.id);
            setAccountFormData({
              name: defaultAcc.name,
              broker: defaultAcc.broker,
              initialBalance: defaultAcc.initialBalance.toString(),
              currency: defaultAcc.currency || "USD",
            });
          }
        }
      }

      if (tradesData.trades) {
        setTrades(tradesData.trades);
        const computedMetrics = calculateMetrics(tradesData.trades);
        setMetrics(computedMetrics);
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const openEditAccountModal = () => {
    if (selectedAccount) {
      setAccountFormData({
        name: selectedAccount.name,
        broker: selectedAccount.broker,
        initialBalance: selectedAccount.initialBalance.toString(),
        currency: selectedAccount.currency || "USD",
      });
    }
    setShowAccountModal(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;
    setSavingAccount(true);

    try {
      const res = await fetch(`/api/accounts/${selectedAccountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountFormData.name,
          broker: accountFormData.broker,
          initialBalance: parseFloat(accountFormData.initialBalance || "10000"),
          currency: accountFormData.currency,
        }),
      });

      if (res.ok) {
        setShowAccountModal(false);
        await loadDashboardData();
      }
    } catch (err) {
      console.error("Failed to update account equity", err);
    } finally {
      setSavingAccount(false);
    }
  };

  // Generate equity curve data starting from account initialBalance
  const closedTrades = trades
    .filter((t) => t.status === "CLOSED")
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || a.exitDate || a.entryDate).getTime();
      const timeB = new Date(b.createdAt || b.exitDate || b.entryDate).getTime();
      return timeA - timeB;
    });

  const startingEquity = selectedAccount?.initialBalance || 10000;
  const equityData: any[] = [];

  if (closedTrades.length > 0) {
    const firstTradeTime = new Date(closedTrades[0].createdAt || closedTrades[0].entryDate).getTime();
    // Prepend baseline starting equity point 1 hour before first closed trade
    const baselineTime = new Date(firstTradeTime - 3600 * 1000).toISOString();
    equityData.push({
      time: baselineTime,
      pnl: 0,
      balance: startingEquity,
    });

    let currentBalance = startingEquity;
    for (const trade of closedTrades) {
      currentBalance += trade.netPnL;
      equityData.push({
        time: trade.createdAt || trade.exitDate || trade.entryDate,
        pnl: trade.netPnL,
        balance: currentBalance,
      });
    }
  }

  const totalPnL = metrics?.totalNetPnL || 0;
  const isPositive = totalPnL >= 0;
  const currentEquity = startingEquity + totalPnL;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Journal PnL</h1>
          <p className="text-sm text-slate-400 mt-1">Simple PnL Overview & Equity Graph</p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Account Selector */}
          <select
            value={selectedAccountId}
            onChange={(e) => {
              setSelectedAccountId(e.target.value);
              const acc = accounts.find((a) => a.id === e.target.value);
              if (acc) {
                setAccountFormData({
                  name: acc.name,
                  broker: acc.broker,
                  initialBalance: acc.initialBalance.toString(),
                  currency: acc.currency || "USD",
                });
              }
            }}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 font-medium"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} (${acc.initialBalance.toLocaleString()})
              </option>
            ))}
          </select>

          {/* Edit Equity Button */}
          <button
            onClick={openEditAccountModal}
            title="Edit Starting Equity & Account Details"
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl border border-slate-800 hover:border-amber-500/40 transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>

          <Link
            href="/dashboard/import"
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm font-medium rounded-xl border border-slate-800 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>Import CSV</span>
          </Link>

          <Link
            href="/dashboard/trades?new=true"
            className="flex items-center space-x-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Log Trade</span>
          </Link>
        </div>
      </div>

      {/* Main Hero PnL & Equity Card */}
      <div className="glass-card rounded-3xl p-8 border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-950 to-slate-900/80 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* PnL & Total Equity Breakdown */}
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400/90 flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-amber-400" />
              <span>Total Realized PnL</span>
            </div>
            <div
              className={`text-5xl font-black font-mono tracking-tight ${isPositive ? "text-emerald-400" : "text-rose-400"
                }`}
            >
              {isPositive ? "+" : ""}${totalPnL.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-400 flex items-center space-x-3 pt-1">
              <span>Starting Equity: <strong className="text-slate-200 font-mono">${startingEquity.toLocaleString()}</strong></span>
              <span>•</span>
              <span>Current Balance: <strong className="text-amber-400 font-mono">${currentEquity.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-2xl text-center">
              <div className="text-xs text-slate-400 font-medium">Win Rate</div>
              <div className="text-lg font-bold text-amber-400 font-mono">
                {metrics?.winRate.toFixed(1) || "0.0"}%
              </div>
            </div>

            <div className="px-4 py-2 bg-slate-900/80 border border-slate-800 rounded-2xl text-center">
              <div className="text-xs text-slate-400 font-medium">Total Trades</div>
              <div className="text-lg font-bold text-slate-200 font-mono">
                {metrics?.totalTrades || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Clean Equity Curve Graph */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Equity Curve Graph (${startingEquity.toLocaleString()} Base)
            </div>
            <button
              onClick={openEditAccountModal}
              className="text-xs text-amber-400 hover:underline font-semibold"
            >
              Change Starting Equity
            </button>
          </div>
          <EquityCurveChart
            data={equityData}
            initialBalance={startingEquity}
            height={320}
          />
        </div>
      </div>

      {/* Simple Recent Trades Table */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Recent Trades</h2>
          <Link href="/dashboard/trades" className="text-xs text-amber-400 hover:underline font-semibold">
            View All Trades →
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500 text-sm">Loading trades...</div>
        ) : trades.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            No trades logged yet. Click <span className="text-amber-400 font-semibold">Log Trade</span> to add your first trade.
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
                  <th className="py-3 px-4">Net PnL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {trades.slice(0, 5).map((t) => {
                  const isLong = t.direction === "LONG";
                  const isWin = t.netPnL > 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 px-4 text-slate-300 font-mono text-xs">
                        {formatLocalDateTime(t.entryDate)}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        <Link href={`/dashboard/trades/${t.id}`} className="hover:text-amber-400">
                          {t.ticker}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${isLong
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
                      <td
                        className={`py-3 px-4 font-bold font-mono ${isWin ? "text-emerald-400" : t.netPnL < 0 ? "text-rose-400" : "text-slate-400"
                          }`}
                      >
                        {t.netPnL >= 0 ? "+" : ""}${t.netPnL.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white">Edit Starting Equity Balance</h2>
              <button
                onClick={() => setShowAccountModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  value={accountFormData.name}
                  onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Starting Equity Balance ($)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={accountFormData.initialBalance}
                  onChange={(e) => setAccountFormData({ ...accountFormData, initialBalance: e.target.value })}
                  placeholder="e.g. 50000"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono font-bold text-base text-amber-400 focus:outline-none focus:border-amber-500"
                />
                <p className="text-xs text-slate-500 mt-1">
                  This sets your baseline capital for your Equity Growth Curve.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Broker Name
                  </label>
                  <input
                    type="text"
                    value={accountFormData.broker}
                    onChange={(e) => setAccountFormData({ ...accountFormData, broker: e.target.value })}
                    placeholder="MetaTrader / FTMO / IBKR"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Currency
                  </label>
                  <select
                    value={accountFormData.currency}
                    onChange={(e) => setAccountFormData({ ...accountFormData, currency: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAccountModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20"
                >
                  {savingAccount ? "Saving..." : "Save Balance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

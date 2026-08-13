"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Grid, Target, Award, Plus, Edit2, Trash2, X, Check } from "lucide-react";

export default function SetupMatrixPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Strategy Modal State
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [editingStrategyId, setEditingStrategyId] = useState<string | null>(null);
  const [strategyForm, setStrategyForm] = useState({
    name: "",
    description: "",
    rules: "",
    targetWinRate: "65",
    targetRR: "2.5",
  });

  // Tag Modal State
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagForm, setTagForm] = useState({
    name: "",
    color: "#f59e0b",
    type: "SETUP",
  });

  useEffect(() => {
    fetchSetups();
  }, []);

  const fetchSetups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/setups");
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Failed to load setup matrix", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Strategy CRUD Actions ---
  const handleOpenCreateStrategy = () => {
    setEditingStrategyId(null);
    setStrategyForm({
      name: "",
      description: "",
      rules: "",
      targetWinRate: "65",
      targetRR: "2.5",
    });
    setShowStrategyModal(true);
  };

  const handleOpenEditStrategy = (strat: any) => {
    setEditingStrategyId(strat.id);
    setStrategyForm({
      name: strat.name || "",
      description: strat.description || "",
      rules: strat.rules || "",
      targetWinRate: strat.targetWinRate ? strat.targetWinRate.toString() : "65",
      targetRR: strat.targetRR ? strat.targetRR.toString() : "2.5",
    });
    setShowStrategyModal(true);
  };

  const handleSaveStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingStrategyId ? `/api/strategies/${editingStrategyId}` : "/api/strategies";
      const method = editingStrategyId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: strategyForm.name,
          description: strategyForm.description,
          rules: strategyForm.rules,
          targetWinRate: parseFloat(strategyForm.targetWinRate || "0"),
          targetRR: parseFloat(strategyForm.targetRR || "0"),
        }),
      });

      if (res.ok) {
        setShowStrategyModal(false);
        fetchSetups();
      }
    } catch (err) {
      console.error("Failed to save strategy", err);
    }
  };

  const handleDeleteStrategy = async (id: string) => {
    if (!confirm("Are you sure you want to delete this strategy playbook?")) return;
    const res = await fetch(`/api/strategies/${id}`, { method: "DELETE" });
    if (res.ok) fetchSetups();
  };

  // --- Tag CRUD Actions ---
  const handleOpenCreateTag = () => {
    setEditingTagId(null);
    setTagForm({ name: "", color: "#f59e0b", type: "SETUP" });
    setShowTagModal(true);
  };

  const handleOpenEditTag = (tag: any) => {
    setEditingTagId(tag.id);
    setTagForm({
      name: tag.name || "",
      color: tag.color || "#f59e0b",
      type: tag.type || "SETUP",
    });
    setShowTagModal(true);
  };

  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTagId ? `/api/tags/${editingTagId}` : "/api/tags";
      const method = editingTagId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tagForm.name,
          color: tagForm.color,
          type: tagForm.type,
        }),
      });

      if (res.ok) {
        setShowTagModal(false);
        fetchSetups();
      }
    } catch (err) {
      console.error("Failed to save tag", err);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm("Are you sure you want to delete this setup tag?")) return;
    const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
    if (res.ok) fetchSetups();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 sm:p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Grid className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Playbook Strategy & Setup Matrix</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Create, benchmark, and edit custom XAUUSD Gold playbooks & qualitative tags
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            onClick={handleOpenCreateStrategy}
            className="flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Strategy</span>
          </button>

          <button
            onClick={handleOpenCreateTag}
            className="flex items-center space-x-2 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs sm:text-sm font-medium rounded-xl border border-slate-800 transition-all"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add Setup Tag</span>
          </button>
        </div>
      </div>

      {/* Strategies Table with Full CRUD */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Playbook Strategy Performance</span>
          </h2>
          <button
            onClick={handleOpenCreateStrategy}
            className="text-xs text-amber-400 hover:underline font-semibold flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Strategy</span>
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-sm">Loading strategy matrix...</div>
        ) : !data?.strategies || data.strategies.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No strategies defined yet. Click <span className="text-amber-400 font-bold">Add Strategy</span> to create your first Gold playbook.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Strategy Playbook</th>
                  <th className="py-3 px-4 whitespace-nowrap">Trades</th>
                  <th className="py-3 px-4 whitespace-nowrap">Win Rate</th>
                  <th className="py-3 px-4 whitespace-nowrap">Expectancy ($)</th>
                  <th className="py-3 px-4 whitespace-nowrap">Profit Factor</th>
                  <th className="py-3 px-4 whitespace-nowrap">Avg Realized R</th>
                  <th className="py-3 px-4 whitespace-nowrap">Net PnL</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {data.strategies.map((strat: any) => (
                  <tr key={strat.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Link
                        href={`/dashboard/trades?strategyId=${strat.id}`}
                        className="font-bold text-white hover:text-amber-400 transition-colors"
                      >
                        {strat.name} ↗
                      </Link>
                      {strat.targetWinRate && (
                        <div className="text-[11px] text-slate-400">
                          Target: {strat.targetWinRate}% WR | {strat.targetRR}R
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono whitespace-nowrap">
                      {strat.metrics.totalTrades}
                    </td>
                    <td className="py-3.5 px-4 text-cyan-400 font-bold font-mono whitespace-nowrap">
                      {strat.metrics.winRate.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-amber-400 font-bold font-mono whitespace-nowrap">
                      ${strat.metrics.expectancy.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold font-mono whitespace-nowrap">
                      {strat.metrics.profitFactor.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono whitespace-nowrap">
                      {strat.metrics.avgRealizedR.toFixed(2)}R
                    </td>
                    <td
                      className={`py-3.5 px-4 font-bold font-mono whitespace-nowrap ${
                        strat.metrics.totalNetPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {strat.metrics.totalNetPnL >= 0 ? "+" : ""}$
                      {strat.metrics.totalNetPnL.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEditStrategy(strat)}
                        className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                        title="Edit Strategy"
                      >
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => handleDeleteStrategy(strat.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete Strategy"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Setup Tags Breakdown with Full CRUD */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Target className="w-5 h-5 text-emerald-400" />
            <span>Qualitative Setup Tag Breakdown</span>
          </h2>
          <button
            onClick={handleOpenCreateTag}
            className="text-xs text-amber-400 hover:underline font-semibold flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Tag</span>
          </button>
        </div>

        {!data?.setupTags || data.setupTags.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No setup tags found. Click <span className="text-amber-400 font-bold">Add Setup Tag</span> to create custom trade tags.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">Setup Tag</th>
                  <th className="py-3 px-4 whitespace-nowrap">Trades</th>
                  <th className="py-3 px-4 whitespace-nowrap">Win Rate</th>
                  <th className="py-3 px-4 whitespace-nowrap">Expectancy ($)</th>
                  <th className="py-3 px-4 whitespace-nowrap">Profit Factor</th>
                  <th className="py-3 px-4 whitespace-nowrap">Net PnL</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {data.setupTags.map((tag: any) => (
                  <tr key={tag.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                      <span
                        style={{ backgroundColor: `${tag.color || "#f59e0b"}20`, color: tag.color || "#f59e0b" }}
                        className="inline-flex items-center whitespace-nowrap px-3 py-1 rounded-lg border border-current text-xs font-semibold"
                      >
                        {tag.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono whitespace-nowrap">{tag.metrics.totalTrades}</td>
                    <td className="py-3.5 px-4 text-cyan-400 font-bold font-mono whitespace-nowrap">
                      {tag.metrics.winRate.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 text-amber-400 font-bold font-mono whitespace-nowrap">
                      ${tag.metrics.expectancy.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-emerald-400 font-bold font-mono whitespace-nowrap">
                      {tag.metrics.profitFactor.toFixed(2)}
                    </td>
                    <td
                      className={`py-3.5 px-4 font-bold font-mono whitespace-nowrap ${
                        tag.metrics.totalNetPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {tag.metrics.totalNetPnL >= 0 ? "+" : ""}${tag.metrics.totalNetPnL.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEditTag(tag)}
                        className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                        title="Edit Tag"
                      >
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete Tag"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- Strategy Modal --- */}
      {showStrategyModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white">
                {editingStrategyId ? "Edit Playbook Strategy" : "Create New Playbook Strategy"}
              </h2>
              <button onClick={() => setShowStrategyModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStrategy} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Strategy Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asia Range Sweep & Reversal"
                  value={strategyForm.name}
                  onChange={(e) => setStrategyForm({ ...strategyForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Description / Playbook Rules
                </label>
                <textarea
                  rows={3}
                  placeholder="Define entry trigger, SL rules, liquidity sweeps..."
                  value={strategyForm.description}
                  onChange={(e) => setStrategyForm({ ...strategyForm, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Target Win Rate (%)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="65"
                    value={strategyForm.targetWinRate}
                    onChange={(e) => setStrategyForm({ ...strategyForm, targetWinRate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Target R:R Ratio
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="2.5"
                    value={strategyForm.targetRR}
                    onChange={(e) => setStrategyForm({ ...strategyForm, targetRR: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStrategyModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20"
                >
                  {editingStrategyId ? "Update Strategy" : "Create Strategy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Tag Modal --- */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md rounded-2xl p-6 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white">
                {editingTagId ? "Edit Qualitative Tag" : "Create New Qualitative Tag"}
              </h2>
              <button onClick={() => setShowTagModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTag} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Tag Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Asia Sweep or News FOMO"
                  value={tagForm.name}
                  onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Tag Category
                  </label>
                  <select
                    value={tagForm.type}
                    onChange={(e) => setTagForm({ ...tagForm, type: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="SETUP">SETUP</option>
                    <option value="MISTAKE">MISTAKE</option>
                    <option value="EMOTION">EMOTION</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Tag Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={tagForm.color}
                      onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                      className="w-10 h-10 rounded-lg cursor-pointer bg-slate-900 border border-slate-800"
                    />
                    <input
                      type="text"
                      value={tagForm.color}
                      onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTagModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20"
                >
                  {editingTagId ? "Update Tag" : "Create Tag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

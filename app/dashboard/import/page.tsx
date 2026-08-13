"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Upload, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { BrokerType } from "@/lib/parsers";

export default function CSVImportPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [broker, setBroker] = useState<BrokerType>("METATRADER");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    if (data.accounts) {
      setAccounts(data.accounts);
      if (data.accounts.length > 0) setSelectedAccountId(data.accounts[0].id);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedAccountId) {
      setError("Please select a file and trading account");
      return;
    }

    setError("");
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("broker", broker);
    formData.append("tradingAccountId", selectedAccountId);

    try {
      const res = await fetch("/api/trades/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to process CSV file");
      } else {
        setResult(data);
      }
    } catch (err: any) {
      setError("Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">CSV Ingestion & Deduplication</h1>
            <p className="text-sm text-slate-400 mt-1">
              Import broker statements with automatic SHA256 execution hash deduplication
            </p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-8 border border-slate-800 space-y-6">
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Target Trading Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.broker})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Broker Statement Format
              </label>
              <select
                value={broker}
                onChange={(e) => setBroker(e.target.value as BrokerType)}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="METATRADER">MetaTrader 4 / 5 (CSV)</option>
                <option value="IBKR">Interactive Brokers (Flex Query CSV)</option>
                <option value="BINANCE">Binance Spot / Futures (CSV)</option>
                <option value="BYBIT">Bybit Derivatives (CSV)</option>
                <option value="GENERIC">Generic / Custom CSV</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Upload Statement CSV File
            </label>
            <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-8 text-center bg-slate-900/40 transition-all">
              <input
                type="file"
                accept=".csv"
                required
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer space-y-3 block">
                <Upload className="w-10 h-10 text-blue-400 mx-auto" />
                <div className="text-sm font-medium text-slate-300">
                  {file ? (
                    <span className="text-emerald-400 font-bold">{file.name}</span>
                  ) : (
                    "Click to browse or drop CSV file here"
                  )}
                </div>
                <p className="text-xs text-slate-500">Supports standard broker CSV exports</p>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 space-y-2">
              <div className="flex items-center space-x-2 font-bold text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <span>{result.message}</span>
              </div>
              <div className="text-xs space-y-1 text-slate-300 pt-1">
                <div>• Imported Executions: {result.importedExecutions || 0}</div>
                <div>• Created Trades: {result.createdTrades || 0}</div>
                <div>• Skipped Duplicates (SHA256 Idempotent): {result.skippedDuplicates || result.skippedCount || 0}</div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            {result && (
              <button
                type="button"
                onClick={() => router.push("/dashboard/trades")}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-all flex items-center space-x-2"
              >
                <span>View Trade Journal</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              {loading ? "Processing CSV..." : "Process & Import Statement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

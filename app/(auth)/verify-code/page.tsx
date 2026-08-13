"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Mail, ArrowRight, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

function VerifyCodeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to verify code");
      } else {
        setSuccess(true);
        setMessage(data.message || "Email verified successfully!");
      }
    } catch (err: any) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) {
      setError("Please enter your email address to resend the code.");
      return;
    }

    setError("");
    setMessage("");
    setResending(true);

    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to resend code");
      } else {
        setMessage(data.message || "New 6-digit code sent to your inbox!");
      }
    } catch (err: any) {
      setError("Failed to resend verification code");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
        <div className="text-center">
          <div className="inline-flex p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Enter Verification Code</h1>
          <p className="text-sm text-slate-400 mt-1">
            We sent a 6-digit verification code to your email
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm text-center flex items-center justify-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm text-center flex items-center justify-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4 pt-2">
            <button
              onClick={() => router.push("/login")}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20"
            >
              <span>Proceed to Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@example.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="849201"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 text-center text-2xl font-mono tracking-widest font-black text-amber-400 focus:outline-none focus:border-amber-500 placeholder-slate-700"
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              <span>{loading ? "Verifying..." : "Verify & Activate Account"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-amber-400 font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                <span>{resending ? "Resending Code..." : "Didn't receive code? Resend Code"}</span>
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-sm text-slate-400 pt-2 border-t border-slate-800">
          Already verified?{" "}
          <Link href="/login" className="text-amber-400 hover:underline font-medium">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyCodePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>}>
      <VerifyCodeContent />
    </Suspense>
  );
}

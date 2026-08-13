"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Coins,
  LayoutDashboard,
  BookOpen,
  FileSpreadsheet,
  AlertTriangle,
  Grid,
  BarChart3,
  LogOut,
  User as UserIcon,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session?.user) return null;

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/trades", label: "Trade Journal", icon: BookOpen },
    { href: "/dashboard/import", label: "Import CSV", icon: FileSpreadsheet },
    { href: "/reports/mistakes", label: "Leakage Report", icon: AlertTriangle },
    { href: "/reports/setups", label: "Setup Matrix", icon: Grid },
    { href: "/reports/heatmap", label: "Heatmap", icon: BarChart3 },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-amber-500/20 bg-slate-950/90 backdrop-blur-md px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link href="/dashboard" className="flex items-center space-x-2 font-bold text-xl tracking-tight text-white">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/40 shadow-lg shadow-amber-500/10">
              <Coins className="w-5 h-5" />
            </div>
            <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent font-extrabold tracking-wide">
              Personal Journal
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-slate-300 bg-slate-900 border border-amber-500/20 px-3 py-1.5 rounded-lg">
            <UserIcon className="w-4 h-4 text-amber-400" />
            <span>{session.user.name || session.user.email}</span>
          </div>

          <button
            onClick={async () => {
              await signOut({ redirect: false });
              window.location.href = "/login";
            }}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-red-400 bg-slate-900 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 px-3 py-1.5 rounded-lg transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

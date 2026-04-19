"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, LayoutGrid, LogOut, User, ChevronDown, Wrench } from "lucide-react";

interface NavbarProps {
  username: string;
}

export default function Navbar({ username }: NavbarProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 bg-bg-secondary/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-accent-green/15 border border-accent-green/30 flex items-center justify-center group-hover:bg-accent-green/25 transition-colors">
            <Shield className="w-4 h-4 text-accent-green" />
          </div>
          <span className="font-bold text-text-primary text-sm">AI Security Lab</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover text-sm transition-colors"
          >
            <LayoutGrid className="w-4 h-4" />
            Labs
          </Link>
          <Link
            href="/dashboard/v2"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-hover text-sm transition-colors"
          >
            <Wrench className="w-4 h-4 text-accent-red" />
            <span className="text-accent-red">Live Agent</span>
          </Link>
        </nav>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-bg-hover transition-colors text-sm text-text-secondary"
          >
            <div className="w-6 h-6 rounded-full bg-accent-green/20 border border-accent-green/30 flex items-center justify-center">
              <span className="text-accent-green text-xs font-bold">{username[0]?.toUpperCase()}</span>
            </div>
            <span className="hidden sm:block">{username}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-3.5 h-3.5 text-text-secondary" />
                  <span className="text-text-secondary font-medium">{username}</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-text-secondary hover:text-text-red hover:bg-accent-red/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

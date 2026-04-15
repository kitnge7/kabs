"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Terminal, Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-green/10 border border-accent-green/20 mb-4">
          <Shield className="w-8 h-8 text-accent-green" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">AI Security Lab</h1>
        <p className="text-text-secondary mt-1 text-sm">Sign in to access the red team labs</p>
      </div>

      {/* Card */}
      <div className="bg-bg-card border border-border rounded-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="researcher@lab.local"
              required
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-text-primary placeholder-text-dim text-sm transition-colors focus:border-accent-green/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 pr-11 text-text-primary placeholder-text-dim text-sm transition-colors focus:border-accent-green/50"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-secondary transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-text-red text-sm bg-accent-red/10 border border-accent-red/20 rounded-lg px-4 py-3">
              <Terminal className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-green text-bg-primary font-semibold py-3 rounded-lg hover:bg-accent-green-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-text-dim">
          No account?{" "}
          <Link href="/signup" className="text-accent-green hover:text-accent-green-dim transition-colors">
            Create one
          </Link>
        </div>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-text-dim mt-6">
        For authorised security research and educational use only.
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, Loader2, Check, X } from "lucide-react";

function PwRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${ok ? "text-text-green" : "text-text-dim"}`}>
      {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const pw8 = password.length >= 8;
  const pwUpper = /[A-Z]/.test(password);
  const pwNum = /[0-9]/.test(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!pw8 || !pwUpper || !pwNum) {
      setError("Password does not meet requirements");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed");
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
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-green/10 border border-accent-green/20 mb-4">
          <Shield className="w-8 h-8 text-accent-green" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">Create Account</h1>
        <p className="text-text-secondary mt-1 text-sm">Join the AI Security Research Lab</p>
      </div>

      <div className="bg-bg-card border border-border rounded-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-text-primary placeholder-text-dim text-sm transition-colors focus:border-accent-green/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="researcher01"
              required
              pattern="[a-zA-Z0-9_\-]{3,20}"
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-text-primary placeholder-text-dim text-sm transition-colors focus:border-accent-green/50"
            />
            <p className="text-text-dim text-xs mt-1">3–20 characters (letters, numbers, _ or -)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 pr-11 text-text-primary placeholder-text-dim text-sm transition-colors focus:border-accent-green/50"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-secondary transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {password && (
              <div className="mt-2 space-y-1">
                <PwRule ok={pw8} label="At least 8 characters" />
                <PwRule ok={pwUpper} label="At least one uppercase letter" />
                <PwRule ok={pwNum} label="At least one number" />
              </div>
            )}
          </div>

          {error && (
            <div className="text-text-red text-sm bg-accent-red/10 border border-accent-red/20 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-green text-bg-primary font-semibold py-3 rounded-lg hover:bg-accent-green-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-text-dim">
          Already have an account?{" "}
          <Link href="/login" className="text-accent-green hover:text-accent-green-dim transition-colors">Sign in</Link>
        </div>
      </div>

      <p className="text-center text-xs text-text-dim mt-6">For authorised security research and educational use only.</p>
    </div>
  );
}

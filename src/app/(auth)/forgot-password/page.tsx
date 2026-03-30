"use client";

import { useState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/lib/supabase/actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await forgotPassword(email);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, var(--color-primary) 0, var(--color-primary) 1px, transparent 0, transparent 50%)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div
          className="rounded-xl p-8 flex flex-col gap-6"
          style={{
            backgroundColor: "var(--color-surface)",
            boxShadow: "var(--shadow-elevated)",
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-1 pb-2">
            <div className="flex items-center gap-2">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="1" y="11" width="4" height="10" rx="1" fill="#2F6FED" />
                <rect x="7" y="7"  width="4" height="14" rx="1" fill="#1F3E77" />
                <rect x="13" y="3" width="4" height="18" rx="1" fill="#9EDC4B" />
                <path d="M18 5 L21 2" stroke="#2F6FED" strokeWidth="2" strokeLinecap="round" />
                <path d="M19 2 L21 2 L21 4" stroke="#2F6FED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-lg font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
                AGP DONOR INTELLIGENCE
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Password Recovery
            </p>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-4 py-2">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "rgba(158,220,75,0.15)" }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M4 12l5 5L20 7" stroke="#5a8a1e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  Recovery email sent
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                  Check <span className="font-medium">{email}</span> for a password reset link. It expires in 1 hour.
                </p>
              </div>
              <Link
                href="/login"
                className="text-sm font-medium"
                style={{ color: "var(--color-secondary)" }}
              >
                ← Back to login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div
                  className="text-sm px-3 py-2 rounded-md"
                  style={{ backgroundColor: "#FEF2F2", color: "var(--color-error)", border: "1px solid #FECACA" }}
                >
                  {error}
                </div>
              )}

              <p className="text-sm text-center" style={{ color: "var(--color-text-muted)" }}>
                Enter your work email and we&apos;ll send a secure reset link.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="email"
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Work Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="email@organization.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-sm rounded-md border outline-none transition-all"
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: "var(--color-bg)",
                      color: "var(--color-text)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-secondary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-md text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-70"
                  style={{ backgroundColor: "var(--color-secondary)" }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Sending…
                    </>
                  ) : (
                    "Send Recovery Link"
                  )}
                </button>
              </form>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-xs"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  ← Back to login
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--color-text-muted)" }}>
          © 2024 AGP Donor Intelligence. Executive Confidential.
        </p>
      </div>
    </div>
  );
}

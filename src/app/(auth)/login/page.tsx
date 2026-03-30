"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Phase 1: any credentials accepted — simulate auth delay
    setTimeout(() => {
      sessionStorage.setItem("agp_session", "mock-user-001");
      router.push("/dashboard");
    }, 800);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      {/* Background texture — subtle geometric pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, var(--color-primary) 0, var(--color-primary) 1px, transparent 0, transparent 50%)`,
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Card */}
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
              <span
                className="text-lg font-bold tracking-tight"
                style={{ color: "var(--color-primary)" }}
              >
                AGP DONOR INTELLIGENCE
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Secure Institutional Access
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Work Email
              </label>
              <div className="relative">
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
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Security Credential
                </label>
                <button
                  type="button"
                  className="text-xs font-medium"
                  style={{ color: "var(--color-secondary)" }}
                >
                  Forgot?
                </button>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Maintain secure session
              </span>
            </label>

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
                  Authenticating…
                </>
              ) : (
                <>
                  Authenticate Securely
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="6" stroke="white" strokeWidth="1.5" />
                    <path d="M5 7h4M7 5l2 2-2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div
            className="flex items-center justify-center gap-1.5 pt-1"
            style={{ color: "var(--color-text-muted)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M3 5V3.5a3 3 0 016 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="text-xs">AES 256-bit layer encryption active</span>
          </div>
        </div>

        {/* Bottom links */}
        <div className="flex justify-center gap-4 mt-4">
          {["SSO Login", "Help Center", "Contact Support"].map((label) => (
            <button
              key={label}
              className="text-xs transition-colors"
              style={{ color: "var(--color-text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-secondary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--color-text-muted)" }}>
          © 2024 AGP Donor Intelligence. Executive Confidential.
        </p>
      </div>
    </div>
  );
}

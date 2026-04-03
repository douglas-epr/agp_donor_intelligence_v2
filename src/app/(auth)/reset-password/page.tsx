"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "loading" | "ready" | "success";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    const code = new URLSearchParams(window.location.search).get("code");

    if (!code) {
      // No recovery code — redirect away based on session state
      supabase.auth.getSession().then(({ data: { session } }) => {
        router.replace(session ? "/dashboard" : "/forgot-password");
      });
      return;
    }

    // PKCE flow: exchange the code for a session.
    // On success → show the password form.
    // NOTE: In PKCE flow, PASSWORD_RECOVERY event does NOT fire when calling
    // exchangeCodeForSession() manually. SIGNED_IN fires instead.
    // We rely on the promise result, not the auth event.
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error: exchangeError }) => {
        if (exchangeError) {
          router.replace("/forgot-password");
        } else {
          setStep("ready");
        }
      })
      .catch(() => router.replace("/forgot-password"));
  }, [router]);

  const passwordsMatch = password.length >= 8 && confirm.length > 0 && password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordsMatch) return;
    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
    } else {
      setStep("success");
      router.push("/dashboard");
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
              Set New Password
            </p>
          </div>

          {/* Loading */}
          {step === "loading" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="var(--color-secondary)" strokeWidth="4" />
                <path className="opacity-75" fill="var(--color-secondary)" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Verifying recovery link…
              </p>
            </div>
          )}

          {/* Success */}
          {step === "success" && (
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
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Password updated</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Redirecting to dashboard…</p>
              </div>
            </div>
          )}

          {/* Form — shown after successful code exchange */}
          {step === "ready" && (
            <>
              {error && (
                <div
                  className="text-sm px-3 py-2 rounded-md"
                  style={{ backgroundColor: "#FEF2F2", color: "var(--color-error)", border: "1px solid #FECACA" }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="password"
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    New Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-3 py-2.5 text-sm rounded-md border outline-none transition-all"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-secondary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="confirm"
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-sm rounded-md border outline-none transition-all"
                    style={{
                      borderColor: confirm && confirm !== password ? "var(--color-error)" : "var(--color-border)",
                      backgroundColor: "var(--color-bg)",
                      color: "var(--color-text)",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-secondary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = confirm && confirm !== password ? "var(--color-error)" : "var(--color-border)")}
                  />
                  {confirm && !passwordsMatch && (
                    <p className="text-xs" style={{ color: "var(--color-error)" }}>
                      {password.length < 8 ? "Password must be at least 8 characters" : "Passwords do not match"}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !passwordsMatch}
                  className="w-full py-2.5 rounded-md text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: "var(--color-secondary)" }}
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                        <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Updating…
                    </>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </form>
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

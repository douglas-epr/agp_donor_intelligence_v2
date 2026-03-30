"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "loading" | "ready" | "success" | "error";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();

    // Supabase embeds the recovery token in the URL hash.
    // onAuthStateChange picks up the PASSWORD_RECOVERY event after the
    // browser client exchanges the token for a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStep("ready");
      }
    });

    // If the user lands here without a recovery token (direct navigation),
    // redirect to forgot-password after a short delay.
    const timeout = setTimeout(() => {
      setStep((s) => {
        if (s === "loading") {
          router.replace("/forgot-password");
          return "error";
        }
        return s;
      });
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      setStep("success");
      setTimeout(() => router.push("/dashboard"), 2000);
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
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  Password updated
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                  Redirecting to dashboard…
                </p>
              </div>
            </div>
          )}

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
                    style={{
                      borderColor: "var(--color-border)",
                      backgroundColor: "var(--color-bg)",
                      color: "var(--color-text)",
                    }}
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
                    Confirm Password
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
                      Updating…
                    </>
                  ) : (
                    "Set New Password"
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

"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/supabase/actions";

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setEmail(user.email ?? "");
      setFullName((user.user_metadata?.full_name as string) || "");
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    const result = await updateProfile(fullName);
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  const initials = getInitials(fullName || email.split("@")[0] || "?");

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Profile</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          Manage your display name and account information.
        </p>
      </div>

      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
      >
        {/* Avatar */}
        <div className="flex items-center gap-5 mb-6 pb-6" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shrink-0"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            {loading ? "…" : initials}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>{fullName || "—"}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{email}</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              Avatar is generated from your initials
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-md text-sm" style={{ backgroundColor: "#FEF2F2", color: "var(--color-error)", border: "1px solid #FECACA" }}>
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 px-3 py-2 rounded-md text-sm" style={{ backgroundColor: "rgba(158,220,75,0.1)", color: "#5a8a1e", border: "1px solid rgba(158,220,75,0.4)" }}>
            Profile updated successfully.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
              disabled={loading}
              className="w-full px-3 py-2.5 text-sm rounded-md border outline-none transition-all"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-secondary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2.5 text-sm rounded-md border"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text-muted)", cursor: "not-allowed" }}
            />
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              To change your email, go to <a href="/settings" style={{ color: "var(--color-secondary)" }}>Settings</a>.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || loading}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity disabled:opacity-60 self-start"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

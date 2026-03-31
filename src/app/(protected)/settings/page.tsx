"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateEmail, updatePassword, saveAISettings } from "@/lib/supabase/actions";
import type { AIProvider } from "@/lib/supabase/types";

type AIRow = { type: AIProvider; model: string; api_key: string; selected: boolean };
const PROVIDERS: AIProvider[] = ["Claude", "OpenAI", "Gemini"];
const DEFAULT_MODELS: Record<AIProvider, string> = {
  Claude: "claude-sonnet-4-6",
  OpenAI: "gpt-4o",
  Gemini: "gemini-1.5-pro",
};

export default function SettingsPage() {
  // Account section
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailMsg, setEmailMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // AI section
  const [aiRows, setAiRows] = useState<AIRow[]>(
    PROVIDERS.map((type) => ({ type, model: DEFAULT_MODELS[type], api_key: "", selected: false }))
  );
  const [aiMsg, setAiMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [aiSaving, setAiSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("ai_settings")
      .select("*")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAiRows(
            PROVIDERS.map((type) => {
              const existing = data.find((r) => r.type === type);
              return {
                type,
                model: existing?.model || DEFAULT_MODELS[type],
                api_key: existing?.api_key || "",
                selected: existing?.selected ?? false,
              };
            })
          );
        }
        setLoading(false);
      });
  }, []);

  function selectAI(type: AIProvider) {
    setAiRows((prev) => prev.map((r) => ({ ...r, selected: r.type === type })));
  }

  function updateAIRow(type: AIProvider, field: "model" | "api_key", value: string) {
    setAiRows((prev) => prev.map((r) => (r.type === type ? { ...r, [field]: value } : r)));
  }

  async function handleEmailSave(e: React.FormEvent) {
    e.preventDefault();
    setEmailSaving(true);
    setEmailMsg(null);
    const result = await updateEmail(newEmail);
    setEmailMsg(result?.error ? { type: "error", text: result.error } : { type: "success", text: "Confirmation sent to new email address." });
    setEmailSaving(false);
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setPwMsg({ type: "error", text: "Passwords do not match." }); return; }
    if (newPassword.length < 8) { setPwMsg({ type: "error", text: "Password must be at least 8 characters." }); return; }
    setPwSaving(true);
    setPwMsg(null);
    const result = await updatePassword(newPassword);
    setPwMsg(result?.error ? { type: "error", text: result.error } : { type: "success", text: "Password updated successfully." });
    if (!result?.error) { setNewPassword(""); setConfirmPassword(""); }
    setPwSaving(false);
  }

  async function handleAISave(e: React.FormEvent) {
    e.preventDefault();
    setAiSaving(true);
    setAiMsg(null);
    const result = await saveAISettings(aiRows);
    setAiMsg(result?.error ? { type: "error", text: result.error } : { type: "success", text: "AI settings saved." });
    setAiSaving(false);
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>Manage your account security and AI configuration.</p>
      </div>

      {/* ── Account Security ──────────────────────────────────────────── */}
      <div className="rounded-xl p-6 flex flex-col gap-5" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--color-text)" }}>Account Security</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Update your login credentials securely.</p>
        </div>

        {/* Change Email */}
        <form onSubmit={handleEmailSave} className="flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>New Email Address</label>
          {emailMsg && (
            <div className="px-3 py-2 rounded-md text-sm" style={{ backgroundColor: emailMsg.type === "error" ? "#FEF2F2" : "rgba(158,220,75,0.1)", color: emailMsg.type === "error" ? "var(--color-error)" : "#5a8a1e", border: `1px solid ${emailMsg.type === "error" ? "#FECACA" : "rgba(158,220,75,0.4)"}` }}>
              {emailMsg.text}
            </div>
          )}
          <div className="flex gap-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="new@email.com"
              required
              className="flex-1 px-3 py-2.5 text-sm rounded-md border outline-none transition-all"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-secondary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
            />
            <button type="submit" disabled={emailSaving} className="px-4 py-2.5 text-sm font-semibold text-white rounded-md transition-opacity disabled:opacity-60 shrink-0" style={{ backgroundColor: "var(--color-secondary)" }}>
              {emailSaving ? "Saving…" : "Update Email"}
            </button>
          </div>
        </form>

        <div style={{ borderTop: "1px solid var(--color-border)" }} />

        {/* Change Password */}
        <form onSubmit={handlePasswordSave} className="flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Change Password</label>
          {pwMsg && (
            <div className="px-3 py-2 rounded-md text-sm" style={{ backgroundColor: pwMsg.type === "error" ? "#FEF2F2" : "rgba(158,220,75,0.1)", color: pwMsg.type === "error" ? "var(--color-error)" : "#5a8a1e", border: `1px solid ${pwMsg.type === "error" ? "#FECACA" : "rgba(158,220,75,0.4)"}` }}>
              {pwMsg.text}
            </div>
          )}
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min. 8 characters)"
            required
            minLength={8}
            className="w-full px-3 py-2.5 text-sm rounded-md border outline-none transition-all"
            style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-secondary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            className="w-full px-3 py-2.5 text-sm rounded-md border outline-none transition-all"
            style={{ borderColor: confirmPassword && confirmPassword !== newPassword ? "var(--color-error)" : "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-secondary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = confirmPassword && confirmPassword !== newPassword ? "var(--color-error)" : "var(--color-border)")}
          />
          <button type="submit" disabled={pwSaving} className="px-5 py-2.5 text-sm font-semibold text-white rounded-md transition-opacity disabled:opacity-60 self-start" style={{ backgroundColor: "var(--color-secondary)" }}>
            {pwSaving ? "Saving…" : "Update Password"}
          </button>
        </form>
      </div>

      {/* ── AI Configuration ──────────────────────────────────────────── */}
      <div className="rounded-xl p-6 flex flex-col gap-5" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--color-text)" }}>AI Configuration</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Configure your AI providers. Select one to use in AI Explorer.</p>
        </div>

        {aiMsg && (
          <div className="px-3 py-2 rounded-md text-sm" style={{ backgroundColor: aiMsg.type === "error" ? "#FEF2F2" : "rgba(158,220,75,0.1)", color: aiMsg.type === "error" ? "var(--color-error)" : "#5a8a1e", border: `1px solid ${aiMsg.type === "error" ? "#FECACA" : "rgba(158,220,75,0.4)"}` }}>
            {aiMsg.text}
          </div>
        )}

        <form onSubmit={handleAISave} className="flex flex-col gap-4">
          {aiRows.map((row) => (
            <div
              key={row.type}
              className="rounded-lg p-4 flex flex-col gap-3 transition-all"
              style={{
                border: `1px solid ${row.selected ? "var(--color-secondary)" : "var(--color-border)"}`,
                backgroundColor: row.selected ? "rgba(47,111,237,0.04)" : "var(--color-bg)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => selectAI(row.type)}
                    className="flex items-center gap-2.5 font-semibold text-sm"
                    style={{ color: row.selected ? "var(--color-secondary)" : "var(--color-text)" }}
                  >
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{ borderColor: row.selected ? "var(--color-secondary)" : "var(--color-border)" }}
                    >
                      {row.selected && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-secondary)" }} />}
                    </div>
                    {row.type}
                  </button>
                </div>
                {row.selected && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(47,111,237,0.12)", color: "var(--color-secondary)" }}>
                    Active
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>Model</label>
                  <input
                    type="text"
                    value={row.model}
                    onChange={(e) => updateAIRow(row.type, "model", e.target.value)}
                    placeholder={DEFAULT_MODELS[row.type]}
                    disabled={loading}
                    className="px-3 py-2 text-sm rounded-md border outline-none transition-all"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-secondary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>API Key</label>
                  <input
                    type="password"
                    value={row.api_key}
                    onChange={(e) => updateAIRow(row.type, "api_key", e.target.value)}
                    placeholder="sk-..."
                    disabled={loading}
                    className="px-3 py-2 text-sm rounded-md border outline-none transition-all"
                    style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-secondary)")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
                  />
                </div>
              </div>
            </div>
          ))}

          <button type="submit" disabled={aiSaving || loading} className="px-5 py-2.5 text-sm font-semibold text-white rounded-md transition-opacity disabled:opacity-60 self-start" style={{ backgroundColor: "var(--color-secondary)" }}>
            {aiSaving ? "Saving…" : "Save AI Settings"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { savePrompt, saveAISettings, saveChatMessage } from "@/lib/supabase/actions";
import { useUploadContext } from "@/context/UploadContext";
import type { AIProvider } from "@/lib/supabase/types";

type Message = { role: "user" | "assistant"; content: string; streaming?: boolean };

const EXAMPLE_QUESTIONS = [
  "Which campaign had the highest average gift?",
  "Show me lapsed donors from the Major Gifts segment",
  "What is the retention trend across segments?",
  "Which channel drives the most revenue?",
  "Compare current year vs previous year giving",
];

const PROVIDERS: AIProvider[] = ["Claude", "OpenAI", "Gemini"];
const DEFAULT_MODELS: Record<AIProvider, string> = {
  Claude: "claude-sonnet-4-6",
  OpenAI: "gpt-4o",
  Gemini: "gemini-1.5-pro",
};

type ChangeModelPopupProps = {
  currentProvider: string;
  onClose: () => void;
  onChanged: (provider: string) => void;
};

function ChangeModelPopup({ currentProvider, onClose, onChanged }: ChangeModelPopupProps) {
  type Row = { id: string; type: AIProvider; model: string; selected: boolean };
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("ai_settings")
        .select("id, type, model, api_key, selected")
        .eq("user_id", user.id);
      if (data) {
        // Only show rows that have both model and api_key filled
        const configured = data.filter((r) => r.model?.trim() && r.api_key?.trim());
        setRows(configured.map((r) => ({ id: r.id, type: r.type as AIProvider, model: r.model, selected: r.selected })));
        const cur = configured.find((r) => r.selected);
        if (cur) setSelectedId(cur.id);
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    // Load all settings to preserve non-configured rows
    const { data: all } = await supabase.from("ai_settings").select("*").eq("user_id", user.id);
    if (all) {
      const updated = all.map((r) => ({
        type: r.type as AIProvider,
        model: r.model,
        api_key: r.api_key,
        selected: r.id === selectedId,
      }));
      await saveAISettings(updated);
    }
    const selected = rows.find((r) => r.id === selectedId);
    if (selected) onChanged(`${selected.type} · ${selected.model}`);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div
        className="w-full max-w-sm rounded-xl p-5 flex flex-col gap-4"
        style={{ backgroundColor: "var(--color-surface)", boxShadow: "var(--shadow-elevated)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Change AI Model</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Switch to a different configured provider</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--color-text-muted)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--color-text-muted)" }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--color-text-muted)" }}>
            No other providers configured. Go to <a href="/settings" style={{ color: "var(--color-secondary)" }}>Settings</a> to add one.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedId(row.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all"
                style={{
                  border: `1px solid ${selectedId === row.id ? "var(--color-secondary)" : "var(--color-border)"}`,
                  backgroundColor: selectedId === row.id ? "rgba(47,111,237,0.05)" : "var(--color-bg)",
                }}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: selectedId === row.id ? "var(--color-secondary)" : "var(--color-border)" }}
                >
                  {selectedId === row.id && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-secondary)" }} />}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: selectedId === row.id ? "var(--color-secondary)" : "var(--color-text)" }}>
                    {row.type}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{row.model}</p>
                </div>
                {`${row.type} · ${row.model}` === currentProvider && (
                  <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(47,111,237,0.1)", color: "var(--color-secondary)" }}>
                    Current
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedId || rows.length === 0}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            {saving ? "Switching…" : "Switch Model"}
          </button>
        </div>
      </div>
    </div>
  );
}

type AIConfigPopupProps = {
  onClose: () => void;
  onSaved: (provider: string) => void;
};

function AIConfigPopup({ onClose, onSaved }: AIConfigPopupProps) {
  const [aiRows, setAiRows] = useState(
    PROVIDERS.map((type) => ({ type, model: DEFAULT_MODELS[type], api_key: "", selected: false }))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function canSelect(type: AIProvider) {
    const row = aiRows.find((r) => r.type === type);
    return !!(row?.model.trim() && row?.api_key.trim());
  }

  function selectAI(type: AIProvider) {
    if (!canSelect(type)) return;
    setAiRows((prev) => prev.map((r) => ({ ...r, selected: r.type === type })));
  }

  async function handleSave() {
    const selected = aiRows.find((r) => r.selected);
    if (!selected) { setMsg({ type: "error", text: "Select an AI provider first." }); return; }
    setSaving(true);
    setMsg(null);

    const result = await saveAISettings(aiRows);
    if (result?.error) { setMsg({ type: "error", text: result.error }); setSaving(false); return; }

    // Validate the key
    const validateRes = await fetch("/api/validate-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: selected.type, model: selected.model, api_key: selected.api_key }),
    });
    const validateData = await validateRes.json();
    if (!validateData.valid) {
      setMsg({ type: "error", text: validateData.error ?? "API key validation failed. Please check your credentials." });
      const unselected = aiRows.map((r) => ({ ...r, selected: false }));
      await saveAISettings(unselected);
      setAiRows(unselected);
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved(`${selected.type} · ${selected.model}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div
        className="w-full max-w-lg rounded-xl p-6 flex flex-col gap-4"
        style={{ backgroundColor: "var(--color-surface)", boxShadow: "var(--shadow-elevated)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>Configure AI Provider</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Enter your API key and select a provider to enable AI Explorer.</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--color-text-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {msg && (
          <div
            className="px-3 py-2 rounded-md text-sm"
            style={{
              backgroundColor: msg.type === "error" ? "#FEF2F2" : "rgba(158,220,75,0.1)",
              color: msg.type === "error" ? "var(--color-error)" : "#5a8a1e",
              border: `1px solid ${msg.type === "error" ? "#FECACA" : "rgba(158,220,75,0.4)"}`,
            }}
          >
            {msg.text}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {aiRows.map((row) => {
            const selectable = canSelect(row.type);
            return (
              <div
                key={row.type}
                className="rounded-lg p-4 flex flex-col gap-3 transition-all"
                style={{
                  border: `1px solid ${row.selected ? "var(--color-secondary)" : "var(--color-border)"}`,
                  backgroundColor: row.selected ? "rgba(47,111,237,0.04)" : "var(--color-bg)",
                }}
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => selectAI(row.type)}
                    disabled={!selectable}
                    className="flex items-center gap-2.5 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
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
                      onChange={(e) => setAiRows((prev) => prev.map((r) => r.type === row.type ? { ...r, model: e.target.value } : r))}
                      placeholder={DEFAULT_MODELS[row.type]}
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
                      onChange={(e) => setAiRows((prev) => prev.map((r) => r.type === row.type ? { ...r, api_key: e.target.value } : r))}
                      placeholder="sk-..."
                      className="px-3 py-2 text-sm rounded-md border outline-none transition-all"
                      style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text)" }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-secondary)")}
                      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            {saving ? "Saving…" : "Save AI Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AiExplorerPage() {
  const { selectedUploadId, setSelectedUploadId } = useUploadContext();
  const [mounted, setMounted] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [showChangeModel, setShowChangeModel] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentName, setAgentName] = useState("AGP Donor Intelligence Agent");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [uploadFilename, setUploadFilename] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    // Sync ?upload= URL param to context on mount
    const uploadParam = new URLSearchParams(window.location.search).get("upload");
    if (uploadParam) setSelectedUploadId(uploadParam);

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setAiLoaded(true); return; }

      // Load agent prompt
      const { data: promptRow } = await supabase
        .from("prompts")
        .select("name, description")
        .eq("user_id", user.id)
        .single();

      if (promptRow) {
        setAgentName(promptRow.name);
        setEditName(promptRow.name);
        setEditDescription(promptRow.description);
      } else {
        setEditName("AGP Donor Intelligence Agent");
        setEditDescription("You are an expert nonprofit fundraising analyst for Allegiance Group + Pursuant (AGP). Answer questions about donor data accurately and concisely. Always base answers on the data context provided — never hallucinate statistics.");
      }

      // Load active provider
      const { data: aiRow } = await supabase
        .from("ai_settings")
        .select("type, model")
        .eq("user_id", user.id)
        .eq("selected", true)
        .single();

      if (aiRow) setActiveProvider(`${aiRow.type} · ${aiRow.model}`);
      setAiLoaded(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load upload filename + chat history whenever selected upload changes
  useEffect(() => {
    setMessages([]);
    setUploadFilename(null);
    if (!selectedUploadId) return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: upload } = await supabase
        .from("uploads").select("filename").eq("id", selectedUploadId).single();
      if (upload) setUploadFilename(upload.filename);

      const { data: rows } = await supabase
        .from("chat")
        .select("role, message")
        .eq("user_id", user.id)
        .eq("upload_id", selectedUploadId)
        .order("created_at", { ascending: true });
      if (rows) {
        setMessages(rows.map(r => ({ role: r.role as "user" | "assistant", content: r.message })));
      }
    });
  }, [selectedUploadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = { role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);

    const assistantMsg: Message = { role: "assistant", content: "", streaming: true };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          uploadId: selectedUploadId ?? undefined,
          history: messages
            .filter(m => !m.streaming)
            .slice(-20)
            .map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: `Error: ${err.error ?? "Something went wrong. Please check your AI settings."}` },
        ]);
        setLoading(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: full, streaming: true },
        ]);
      }

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: full, streaming: false },
      ]);
      // Persist both messages to chat history (fire-and-forget)
      saveChatMessage("user", question, selectedUploadId ?? null);
      saveChatMessage("assistant", full, selectedUploadId ?? null);
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleEditSave() {
    setEditSaving(true);
    setEditMsg("");
    const result = await savePrompt(editName, editDescription);
    if (result?.error) {
      setEditMsg(result.error);
    } else {
      setAgentName(editName);
      setEditMsg("Saved!");
      setTimeout(() => { setShowEditModal(false); setEditMsg(""); }, 1000);
    }
    setEditSaving(false);
  }

  // Gate: no upload selected
  if (mounted && !selectedUploadId) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="text-center max-w-sm">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: "rgba(47,111,237,0.08)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 16v-8M8 12l4-4 4 4" stroke="var(--color-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="var(--color-secondary)" strokeWidth="1.5" />
            </svg>
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--color-text)" }}>No dataset selected</h2>
          <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
            Upload a CSV and select it as your active dataset to start asking questions about your donor data.
          </p>
          <a
            href="/upload"
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg inline-block"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            Go to Upload →
          </a>
        </div>
      </div>
    );
  }

  // Gate: no AI provider configured
  if (mounted && aiLoaded && !activeProvider) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="text-center max-w-sm">
          <div
            className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: "rgba(47,111,237,0.08)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="var(--color-secondary)" strokeWidth="1.5" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="var(--color-secondary)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--color-text)" }}>No AI provider configured</h2>
          <p className="text-sm mb-5" style={{ color: "var(--color-text-muted)" }}>
            Configure an AI provider to start asking questions about your donor data.
          </p>
          <button
            onClick={() => setShowAIConfig(true)}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg inline-block"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            Configure AI Provider
          </button>
        </div>
        {showAIConfig && (
          <AIConfigPopup
            onClose={() => setShowAIConfig(false)}
            onSaved={(provider) => { setActiveProvider(provider); setShowAIConfig(false); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ maxHeight: "calc(100vh - 52px - 48px)" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>AI Data Explorer</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
            <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>{agentName}</span>
            {activeProvider && (
              <>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(47,111,237,0.1)", color: "var(--color-secondary)" }}>
                  {activeProvider}
                </span>
                <button
                  onClick={() => setShowChangeModel(true)}
                  className="text-xs px-2 py-0.5 rounded-full border transition-colors"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", backgroundColor: "transparent" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-secondary)"; e.currentTarget.style.color = "var(--color-secondary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                >
                  Change
                </button>
              </>
            )}
            {uploadFilename && (
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(158,220,75,0.12)", color: "#5a8a1e" }}>
                {uploadFilename}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowEditModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", backgroundColor: "var(--color-surface)" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-secondary)"; e.currentTarget.style.color = "var(--color-secondary)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M9 2l2 2L4 11H2V9L9 2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Edit Agent
        </button>
      </div>

      {/* Chat area */}
      <div
        className="flex-1 rounded-xl flex flex-col overflow-hidden"
        style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: "rgba(47,111,237,0.1)" }}
                >
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="11" r="9" stroke="var(--color-secondary)" strokeWidth="1.5" />
                    <path d="M7.5 13C7.5 13 8.8 15 11 15s3.5-2 3.5-2" stroke="var(--color-secondary)" strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="8.5" cy="9" r="1" fill="var(--color-secondary)" />
                    <circle cx="13.5" cy="9" r="1" fill="var(--color-secondary)" />
                  </svg>
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Ask anything about your donor data</p>
                <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
                  The AI interprets your question against real data — no hallucinations.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="px-3 py-1.5 text-xs rounded-full border transition-colors text-left"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", backgroundColor: "var(--color-bg)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-secondary)"; e.currentTarget.style.color = "var(--color-secondary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mr-2.5 mt-0.5"
                  style={{ backgroundColor: "rgba(47,111,237,0.12)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="var(--color-secondary)" strokeWidth="1.2" />
                    <circle cx="5" cy="5.5" r="0.7" fill="var(--color-secondary)" />
                    <circle cx="9" cy="5.5" r="0.7" fill="var(--color-secondary)" />
                    <path d="M4.5 8.5C4.5 8.5 5.5 10 7 10s2.5-1.5 2.5-1.5" stroke="var(--color-secondary)" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
              )}
              <div
                className="max-w-[75%] rounded-xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: msg.role === "user" ? "var(--color-secondary)" : "var(--color-bg)",
                  color: msg.role === "user" ? "#fff" : "var(--color-text)",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.content}
                {msg.streaming && (
                  <span className="inline-block w-1.5 h-4 ml-0.5 align-middle animate-pulse" style={{ backgroundColor: "currentColor", opacity: 0.6 }} />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 shrink-0" style={{ borderTop: "1px solid var(--color-border)" }}>
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about campaigns, donors, trends…"
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm rounded-xl border outline-none transition-all"
              style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-secondary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "var(--color-secondary)" }}
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M2 7.5h11M8.5 3l4 4.5-4 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </form>
          <p className="text-xs mt-2 text-center" style={{ color: "var(--color-text-muted)" }}>
            AI responses are grounded in your uploaded donor data.
          </p>
        </div>
      </div>

      {/* Change Model Modal */}
      {showChangeModel && activeProvider && (
        <ChangeModelPopup
          currentProvider={activeProvider}
          onClose={() => setShowChangeModel(false)}
          onChanged={(provider) => { setActiveProvider(provider); setShowChangeModel(false); }}
        />
      )}

      {/* Edit Agent Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
          <div
            className="w-full max-w-md rounded-xl p-6 flex flex-col gap-4"
            style={{ backgroundColor: "var(--color-surface)", boxShadow: "var(--shadow-elevated)" }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold" style={{ color: "var(--color-text)" }}>Edit Agent Prompt</h2>
              <button onClick={() => setShowEditModal(false)} style={{ color: "var(--color-text-muted)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {editMsg && (
              <p className="text-sm px-3 py-2 rounded-md" style={{ backgroundColor: editMsg === "Saved!" ? "rgba(158,220,75,0.1)" : "#FEF2F2", color: editMsg === "Saved!" ? "#5a8a1e" : "var(--color-error)" }}>
                {editMsg}
              </p>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Agent Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="px-3 py-2.5 text-sm rounded-md border outline-none"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-secondary)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Agent Description (System Prompt)</label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={5}
                className="px-3 py-2.5 text-sm rounded-md border outline-none resize-none"
                style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-secondary)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
              />
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                The agent will follow this prompt when answering all questions.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm rounded-lg border"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
                style={{ backgroundColor: "var(--color-secondary)" }}
              >
                {editSaving ? "Saving…" : "Save Prompt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

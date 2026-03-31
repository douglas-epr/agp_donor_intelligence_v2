"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateUploadFilename, deleteUpload } from "@/lib/supabase/actions";
import { useUploadContext } from "@/context/UploadContext";
import { DonorSegment, GiftChannel, GiftRegion, RowStatus } from "@/lib/constants/enums";
import type { ParsedRow } from "@/mocks/types";

const VALID_SEGMENTS = Object.values(DonorSegment);
const VALID_CHANNELS = Object.values(GiftChannel);
const VALID_REGIONS  = Object.values(GiftRegion);

function validateRow(raw: Record<string, string>, index: number): ParsedRow {
  const warnings: string[] = [];
  let status: "valid" | "warning" | "rejected" = RowStatus.VALID;

  const donor_id   = raw.donor_id?.trim()   || raw["donor_id"]?.trim()   || "";
  const donor_name = raw.donor_name?.trim() || raw["donor_name"]?.trim() || "";
  const segment    = raw.segment?.trim()    || "";
  const gift_date  = raw.gift_date?.trim()  || raw["gift_date"]?.trim()  || "";
  const gift_amount_raw = raw.gift_amount?.trim() || raw["gift_amount"]?.trim() || "";
  const campaign   = raw.campaign?.trim()   || "";
  const channel    = raw.channel?.trim()    || "";
  const region     = raw.region?.trim()     || "";

  if (!donor_id || !donor_name) {
    warnings.push("Missing donor_id or donor_name");
    status = RowStatus.WARNING;
  }

  if (!gift_date || isNaN(Date.parse(gift_date))) {
    return {
      id: `row-${index}`,
      donor_id:    donor_id || `UNKNOWN-${index}`,
      donor_name:  donor_name || "Unknown",
      segment:     (VALID_SEGMENTS.includes(segment as DonorSegment) ? segment : DonorSegment.GENERAL) as DonorSegment,
      gift_date,
      gift_amount: 0,
      campaign,
      channel:     (VALID_CHANNELS.includes(channel as GiftChannel) ? channel : GiftChannel.ONLINE) as GiftChannel,
      region:      (VALID_REGIONS.includes(region as GiftRegion)    ? region  : GiftRegion.NORTHEAST) as GiftRegion,
      status:      RowStatus.REJECTED,
      rejection_reason: "Malformed or missing gift_date",
    };
  }

  // Normalize to ISO YYYY-MM-DD so PostgreSQL DATE column accepts it
  const normalized_date = new Date(Date.parse(gift_date)).toISOString().split("T")[0];

  const gift_amount = parseFloat(gift_amount_raw.replace(/[$,]/g, ""));
  if (isNaN(gift_amount) || gift_amount < 0) {
    return {
      id: `row-${index}`,
      donor_id:    donor_id || `UNKNOWN-${index}`,
      donor_name:  donor_name || "Unknown",
      segment:     DonorSegment.GENERAL,
      gift_date:   normalized_date,
      gift_amount: 0,
      campaign,
      channel:     GiftChannel.ONLINE,
      region:      GiftRegion.NORTHEAST,
      status:      RowStatus.REJECTED,
      rejection_reason: "Non-numeric or negative gift_amount",
    };
  }

  if (segment && !VALID_SEGMENTS.includes(segment as DonorSegment)) {
    warnings.push(`Unknown segment "${segment}" — defaulted to General`);
    status = RowStatus.WARNING;
  }
  if (channel && !VALID_CHANNELS.includes(channel as GiftChannel)) {
    warnings.push(`Unknown channel "${channel}"`);
    status = RowStatus.WARNING;
  }

  return {
    id: `row-${index}`,
    donor_id:    donor_id || `UNKNOWN-${index}`,
    donor_name:  donor_name || "Unknown",
    segment:     (VALID_SEGMENTS.includes(segment as DonorSegment) ? segment : DonorSegment.GENERAL) as DonorSegment,
    gift_date:   normalized_date,
    gift_amount,
    campaign:    campaign || "General",
    channel:     (VALID_CHANNELS.includes(channel as GiftChannel) ? channel : GiftChannel.ONLINE) as GiftChannel,
    region:      (VALID_REGIONS.includes(region as GiftRegion)    ? region  : GiftRegion.NORTHEAST) as GiftRegion,
    status,
    rejection_reason: warnings.length > 0 ? warnings.join("; ") : undefined,
  };
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() ?? ""]));
  });
}

type Step = "idle" | "parsed" | "importing" | "done";

type UploadRow = {
  id: string;
  filename: string;
  row_count: number;
  status: string;
  uploaded_at: string;
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function UploadPage() {
  const router = useRouter();
  const { selectedUploadId, setSelectedUploadId } = useUploadContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep]           = useState<Step>("idle");
  const [rows, setRows]           = useState<ParsedRow[]>([]);
  const [filename, setFilename]   = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError]         = useState("");

  // History list state
  const [uploads, setUploads]         = useState<UploadRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const validRows    = rows.filter((r) => r.status !== RowStatus.REJECTED);
  const rejectedRows = rows.filter((r) => r.status === RowStatus.REJECTED);

  useEffect(() => {
    // Sync ?upload= URL param to context so correct row highlights as active
    const uploadParam = new URLSearchParams(window.location.search).get("upload");
    if (uploadParam && uploadParam !== selectedUploadId) {
      setSelectedUploadId(uploadParam);
    }
    loadUploads();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadUploads() {
    setHistoryLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("uploads")
      .select("id, filename, row_count, status, uploaded_at")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });
    if (data) {
      setUploads(data);
      // Auto-select the most recent if nothing is selected
      if (!selectedUploadId && data.length > 0) {
        setSelectedUploadId(data[0].id);
      }
    }
    setHistoryLoading(false);
  }

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) { setError("Please upload a .csv file"); return; }
    setFilename(file.name);
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rawRows = parseCSV(text);
      const parsed  = rawRows.map((r, i) => validateRow(r, i));
      setRows(parsed);
      setStep("parsed");
    };
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleConfirm() {
    setImporting(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated"); setImporting(false); return; }

    const { data: upload, error: uploadErr } = await supabase
      .from("uploads")
      .insert({
        user_id:        user.id,
        filename,
        row_count:      validRows.length,
        rejected_count: rejectedRows.length,
        status:         "processing" as string,
      })
      .select("id")
      .single();

    if (uploadErr || !upload) {
      setError("Failed to create upload record: " + uploadErr?.message);
      setImporting(false);
      return;
    }

    const insertRows = validRows.map((r) => ({
      upload_id:   upload.id,
      user_id:     user.id,
      donor_id:    r.donor_id,
      donor_name:  r.donor_name,
      segment:     r.segment,
      gift_date:   r.gift_date,
      gift_amount: r.gift_amount,
      campaign:    r.campaign,
      channel:     r.channel,
      region:      r.region,
      is_valid:    true,
    }));

    const BATCH = 100;
    for (let i = 0; i < insertRows.length; i += BATCH) {
      const { error: insertErr } = await supabase
        .from("donor_gifts")
        .insert(insertRows.slice(i, i + BATCH));
      if (insertErr) {
        setError("Insert failed at batch " + i + ": " + insertErr.message);
        setImporting(false);
        return;
      }
    }

    await supabase.from("uploads").update({ status: "complete" }).eq("id", upload.id);

    // Select the new upload as active session
    setSelectedUploadId(upload.id);
    router.push("/dashboard?upload=" + upload.id);
  }

  async function saveFilename(id: string) {
    if (!editingName.trim()) return;
    const result = await updateUploadFilename(id, editingName.trim());
    if (!result?.error) {
      setUploads((prev) => prev.map((u) => u.id === id ? { ...u, filename: editingName.trim() } : u));
    }
    setEditingId(null);
  }

  function selectUpload(id: string) {
    setSelectedUploadId(id);
    router.push("/dashboard?upload=" + id);
  }

  async function handleDeleteUpload(id: string) {
    const result = await deleteUpload(id);
    if (result?.error) { setError(result.error); return; }
    setUploads((prev) => prev.filter((u) => u.id !== id));
    if (selectedUploadId === id) setSelectedUploadId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
          CSV Upload &amp; Parsing
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          Institutional grade data ingestion and validation engine.
        </p>
      </div>

      {error && (
        <div className="text-sm px-4 py-3 rounded-lg" style={{ backgroundColor: "#FEF2F2", color: "var(--color-error)", border: "1px solid #FECACA" }}>
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6 items-start">
        {/* ── Left: Drop zone + summary ──────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div
            className="rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors"
            style={{ border: "2px dashed var(--color-border)", backgroundColor: "var(--color-surface)" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--color-secondary)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          >
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="17" stroke="var(--color-border)" strokeWidth="2" />
              <path d="M18 10v10M13 15l5-5 5 5" stroke="var(--color-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M11 24h14" stroke="var(--color-border)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Drop donor CSV here</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>or click to browse local files</p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Max file size: 50MB</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          {step === "parsed" && (
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Validation Summary</p>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(158,220,75,0.15)", color: "#5a8a1e" }}>Live Scan</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: "rgba(158,220,75,0.08)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(158,220,75,0.3)" }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#5a8a1e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <p className="text-sm" style={{ color: "var(--color-text)" }}>Valid Rows</p>
                </div>
                <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{validRows.length.toLocaleString()}</p>
              </div>
              <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.06)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.15)" }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 3l4 4M7 3l-4 4" stroke="var(--color-error)" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </div>
                  <p className="text-sm" style={{ color: "var(--color-text)" }}>Rejected Rows</p>
                </div>
                <p className="text-sm font-bold" style={{ color: "var(--color-error)" }}>{rejectedRows.length}</p>
              </div>
              <button
                onClick={handleConfirm}
                disabled={importing || validRows.length === 0}
                className="w-full py-2.5 text-sm font-semibold text-white rounded-lg flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                {importing ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                      <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Importing…
                  </>
                ) : <>Confirm Import →</>}
              </button>
            </div>
          )}
        </div>

        {/* ── Right: Data preview table ──────────────────────────────── */}
        <div className="col-span-2 rounded-xl overflow-hidden" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}>
          <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="12" rx="2" stroke="var(--color-secondary)" strokeWidth="1.3" />
              <path d="M1 5h12M5 5v7" stroke="var(--color-secondary)" strokeWidth="1.3" />
            </svg>
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Data Preview{rows.length > 0 ? ` (Top 10 Rows)` : ""}
            </p>
            {rows.length > 0 && (
              <p className="text-xs ml-auto" style={{ color: "var(--color-text-muted)" }}>
                Showing 10 of {rows.length.toLocaleString()} rows detected
              </p>
            )}
          </div>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16" style={{ color: "var(--color-text-muted)" }}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="2" y="2" width="28" height="28" rx="4" stroke="var(--color-border)" strokeWidth="1.5" />
                <path d="M2 10h28M10 10v20" stroke="var(--color-border)" strokeWidth="1.5" />
              </svg>
              <p className="text-sm">Upload a CSV file to preview data</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ backgroundColor: "var(--color-bg)" }}>
                    {["Donor ID","Name","Segment","Date","Amount","Status"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row) => (
                    <tr key={row.id} style={{ borderTop: "1px solid var(--color-border)", backgroundColor: row.status === RowStatus.REJECTED ? "rgba(239,68,68,0.04)" : "transparent" }}>
                      <td className="px-4 py-2.5 font-mono" style={{ color: "var(--color-text-muted)" }}>{row.donor_id}</td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: "var(--color-text)" }}>{row.donor_name}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: row.segment === "Major Gifts" ? "rgba(47,111,237,0.1)" : "rgba(31,62,119,0.08)", color: row.segment === "Major Gifts" ? "var(--color-secondary)" : "var(--color-primary)" }}>
                          {row.segment}
                        </span>
                      </td>
                      <td className="px-4 py-2.5" style={{ color: row.status === RowStatus.REJECTED ? "var(--color-error)" : "var(--color-text)" }}>{row.gift_date || "NULL_DATE"}</td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: "var(--color-text)" }}>${row.gift_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2.5">
                        {row.status === RowStatus.REJECTED ? (
                          <span title={row.rejection_reason}>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="var(--color-error)" /><path d="M8 5v3M8 10v1" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
                          </span>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="rgba(158,220,75,0.8)" /><path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Previous Uploads ──────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-card)" }}>
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="var(--color-secondary)" strokeWidth="1.3" />
            <path d="M7 4v3l2 2" stroke="var(--color-secondary)" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Previous Uploads</p>
          <p className="text-xs ml-auto" style={{ color: "var(--color-text-muted)" }}>Select a dataset to use across Dashboard &amp; AI Explorer</p>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-10" style={{ color: "var(--color-text-muted)" }}>
            <p className="text-sm">Loading…</p>
          </div>
        ) : uploads.length === 0 ? (
          <div className="flex items-center justify-center py-10" style={{ color: "var(--color-text-muted)" }}>
            <p className="text-sm">No uploads yet. Import a CSV above to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--color-bg)" }}>
                {["", "Filename", "Rows", "Status", "Uploaded", "", ""].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uploads.map((u) => {
                const isActive = selectedUploadId === u.id;
                return (
                  <tr
                    key={u.id}
                    className="group"
                    style={{
                      borderTop: "1px solid var(--color-border)",
                      backgroundColor: isActive ? "rgba(47,111,237,0.04)" : "transparent",
                    }}
                  >
                    {/* Active indicator */}
                    <td className="px-4 py-3 w-8">
                      <div
                        className="w-3 h-3 rounded-full border-2"
                        style={{
                          borderColor: isActive ? "var(--color-secondary)" : "var(--color-border)",
                          backgroundColor: isActive ? "var(--color-secondary)" : "transparent",
                        }}
                      />
                    </td>

                    {/* Filename (inline edit) */}
                    <td className="px-4 py-3 max-w-xs">
                      {editingId === u.id ? (
                        <input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => saveFilename(u.id)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveFilename(u.id); if (e.key === "Escape") setEditingId(null); }}
                          className="w-full px-2 py-1 text-sm rounded border outline-none"
                          style={{ borderColor: "var(--color-secondary)", backgroundColor: "var(--color-bg)", color: "var(--color-text)" }}
                        />
                      ) : (
                        <div className="flex items-center gap-2 group">
                          <span className="font-medium truncate" style={{ color: isActive ? "var(--color-secondary)" : "var(--color-text)" }}>
                            {u.filename}
                          </span>
                          <button
                            onClick={() => { setEditingId(u.id); setEditingName(u.filename); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            title="Rename"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M8.5 1.5l2 2L4 10H2v-2l6.5-6.5Z" stroke="var(--color-secondary)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Row count */}
                    <td className="px-4 py-3" style={{ color: "var(--color-text-muted)" }}>
                      {u.row_count.toLocaleString()}
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: u.status === "complete" ? "rgba(158,220,75,0.15)" : u.status === "error" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
                          color: u.status === "complete" ? "#5a8a1e" : u.status === "error" ? "var(--color-error)" : "#92400e",
                        }}
                      >
                        {u.status}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {formatDateTime(u.uploaded_at)}
                    </td>

                    {/* Select button */}
                    <td className="px-4 py-3">
                      {isActive ? (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: "rgba(47,111,237,0.12)", color: "var(--color-secondary)" }}>
                          Active
                        </span>
                      ) : (
                        <button
                          onClick={() => selectUpload(u.id)}
                          className="text-xs font-medium px-3 py-1 rounded-md transition-colors"
                          style={{ backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-secondary)"; e.currentTarget.style.color = "var(--color-secondary)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                        >
                          Select
                        </button>
                      )}
                    </td>

                    {/* Delete */}
                    <td className="px-4 py-3 w-8">
                      <button
                        onClick={() => handleDeleteUpload(u.id)}
                        title="Delete upload"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: "var(--color-text-muted)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-error)")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7.5h6.6L11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

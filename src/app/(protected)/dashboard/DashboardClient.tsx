"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUploadContext } from "@/context/UploadContext";
import type { DashboardAggregates } from "@/mocks/types";

type UploadRow = { id: string; filename: string; row_count: number; created_at: string };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Props = DashboardAggregates & {
  activeUploadId: string | null;
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n.toLocaleString()}`;
}

export default function DashboardClient({
  kpis, byCampaign, bySegment, byChannel, giftsByMonth, activeUploadId,
}: Props) {
  const maxCampaignTotal = byCampaign[0]?.totalRaised ?? 1;
  const maxChannelTotal  = byChannel[0]?.totalRaised ?? 1;
  const router = useRouter();
  const { setSelectedUploadId } = useUploadContext();
  const [showHistorical, setShowHistorical] = useState(false);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);

  // Sync context with active URL param
  useEffect(() => {
    if (activeUploadId) setSelectedUploadId(activeUploadId);
  }, [activeUploadId, setSelectedUploadId]);

  async function openHistorical() {
    setShowHistorical(true);
    if (uploads.length > 0) return;
    setUploadsLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("uploads")
      .select("id, filename, row_count, created_at")
      .eq("user_id", user.id)
      .eq("status", "complete")
      .order("created_at", { ascending: false });
    if (data) setUploads(data);
    setUploadsLoading(false);
  }

  function selectUpload(id: string) {
    setSelectedUploadId(id);
    setShowHistorical(false);
    router.push("/dashboard?upload=" + id);
  }

  function clearSelection() {
    setSelectedUploadId(null);
    router.push("/dashboard");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Historical modal */}
      {showHistorical && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowHistorical(false); }}
        >
          <div
            className="rounded-xl w-[480px] max-h-[70vh] flex flex-col overflow-hidden"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
              <div>
                <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>Select Dataset</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Choose a previous upload to view its data</p>
              </div>
              <button
                onClick={() => setShowHistorical(false)}
                className="w-7 h-7 flex items-center justify-center rounded-md"
                style={{ color: "var(--color-text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {uploadsLoading ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>Loading…</p>
              ) : uploads.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>No completed uploads found.</p>
              ) : (
                uploads.map((u) => {
                  const isActive = u.id === activeUploadId;
                  return (
                    <button
                      key={u.id}
                      onClick={() => selectUpload(u.id)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors"
                      style={{
                        backgroundColor: isActive ? "rgba(47,111,237,0.08)" : "transparent",
                        border: isActive ? "1px solid rgba(47,111,237,0.3)" : "1px solid transparent",
                        marginBottom: 4,
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "var(--color-bg)"; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: isActive ? "var(--color-secondary)" : "var(--color-text)" }}>
                          {u.filename}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                          {u.row_count.toLocaleString()} rows · {formatDate(u.created_at)}
                        </p>
                      </div>
                      {isActive && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: "rgba(47,111,237,0.12)", color: "var(--color-secondary)" }}>
                          Active
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Executive Summary</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Institutional Intelligence · {activeUploadId ? "Historical View" : "Live Data"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={clearSelection}
            className="px-4 py-1.5 text-sm font-medium rounded-md text-white"
            style={{ backgroundColor: !activeUploadId ? "var(--color-secondary)" : "var(--color-border)", color: !activeUploadId ? "white" : "var(--color-text-muted)" }}
          >
            Live View
          </button>
          <button
            onClick={openHistorical}
            className="px-4 py-1.5 text-sm font-medium rounded-md border"
            style={{
              borderColor: activeUploadId ? "var(--color-secondary)" : "var(--color-border)",
              color: activeUploadId ? "var(--color-secondary)" : "var(--color-text-muted)",
              backgroundColor: activeUploadId ? "rgba(47,111,237,0.06)" : "transparent",
            }}
          >
            Historical
          </button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Raised",    value: fmt(kpis.totalRaised),   sub: kpis.totalRaised > 0 ? "from all gifts" : "No data yet" },
          { label: "Average Gift",    value: fmt(kpis.averageGift),   sub: "per transaction" },
          { label: "Donor Count",     value: kpis.donorCount.toLocaleString(), sub: "unique donors" },
          { label: "Retention Rate",  value: `${Math.round(kpis.retentionRate * 100)}%`, sub: "gave more than once" },
        ].map(({ label, value, sub }) => (
          <div key={label} className="rounded-xl p-5 flex flex-col gap-2" style={{ backgroundColor: "var(--color-surface)", boxShadow: "var(--shadow-card)", border: "1px solid var(--color-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>{label}</p>
            <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{value}</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Charts Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Gifts Over Time */}
        <div className="col-span-2 rounded-xl p-5" style={{ backgroundColor: "var(--color-surface)", boxShadow: "var(--shadow-card)", border: "1px solid var(--color-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Gifts Over Time</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Monthly revenue trend</p>
            </div>
            <div className="flex gap-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-2 rounded-sm" style={{ backgroundColor: "var(--color-secondary)" }} />
                Current Year
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-2 rounded-sm" style={{ backgroundColor: "var(--color-border)" }} />
                Previous Year
              </span>
            </div>
          </div>
          {giftsByMonth.length === 0 ? (
            <div className="flex items-center justify-center h-48" style={{ color: "var(--color-text-muted)" }}>
              <p className="text-sm">Upload a CSV to see gift trends</p>
            </div>
          ) : (
            <div className="flex items-end gap-1.5 h-48">
              {giftsByMonth.map(({ month, currentYear, previousYear }) => {
                const maxVal = Math.max(...giftsByMonth.map((m) => Math.max(m.currentYear, m.previousYear)), 1);
                const curH  = Math.max((currentYear  / maxVal) * 100, 2);
                const prevH = Math.max((previousYear / maxVal) * 100, 2);
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-0.5 items-end" style={{ height: 160 }}>
                      <div
                        className="flex-1 rounded-t-sm transition-all cursor-default"
                        style={{ height: `${prevH}%`, backgroundColor: "var(--color-border)" }}
                        title={`${month} prev yr: ${fmt(previousYear)}`}
                      />
                      <div
                        className="flex-1 rounded-t-sm transition-all cursor-default"
                        style={{ height: `${curH}%`, backgroundColor: "var(--color-secondary)" }}
                        title={`${month}: ${fmt(currentYear)}`}
                      />
                    </div>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)", fontSize: "0.65rem" }}>{month}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Segment Breakdown */}
        <div className="rounded-xl p-5" style={{ backgroundColor: "var(--color-surface)", boxShadow: "var(--shadow-card)", border: "1px solid var(--color-border)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Segment Breakdown</p>
          <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>Donor distribution by level</p>
          {bySegment.length === 0 ? (
            <div className="flex items-center justify-center h-32" style={{ color: "var(--color-text-muted)" }}>
              <p className="text-sm">No data yet</p>
            </div>
          ) : (() => {
            const SEGMENT_COLORS = ["#2F6FED","#1F3E77","#9EDC4B","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];
            let cumulative = 0;
            const stops = bySegment.map((s, i) => {
              const start = cumulative;
              cumulative += s.percentage;
              return `${SEGMENT_COLORS[i % SEGMENT_COLORS.length]} ${start}% ${cumulative}%`;
            });
            return (
              <>
                <div className="flex justify-center mb-4">
                  <div className="relative w-28 h-28">
                    <div className="w-full h-full rounded-full" style={{ background: `conic-gradient(${stops.join(", ")})` }} />
                    <div className="absolute inset-3 rounded-full flex flex-col items-center justify-center" style={{ backgroundColor: "var(--color-surface)" }}>
                      <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>{kpis.donorCount.toLocaleString()}</p>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Total</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {bySegment.map(({ segment, count, percentage }, i) => (
                    <div key={segment} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }} />
                        <span className="text-xs truncate" style={{ color: "var(--color-text)" }}>{segment}</span>
                      </div>
                      <span className="text-xs font-medium shrink-0 ml-2" style={{ color: "var(--color-text-muted)" }}>{count} · {percentage}%</span>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* ── Campaign + Channel Row ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Campaign Performance */}
        <div className="rounded-xl p-5" style={{ backgroundColor: "var(--color-surface)", boxShadow: "var(--shadow-card)", border: "1px solid var(--color-border)" }}>
          <div className="mb-4">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Campaign Performance</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Revenue by initiative</p>
          </div>
          {byCampaign.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>No campaigns found</p>
          ) : (
            <div className="flex flex-col gap-3">
              {byCampaign.slice(0, 6).map(({ campaign, totalRaised }) => (
                <div key={campaign} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate mr-2" style={{ color: "var(--color-text)" }}>{campaign}</p>
                    <p className="text-sm font-semibold shrink-0" style={{ color: "var(--color-text)" }}>{fmt(totalRaised)}</p>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-bg)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(totalRaised / maxCampaignTotal) * 100}%`, backgroundColor: "var(--color-primary)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Channel Performance */}
        <div className="rounded-xl p-5" style={{ backgroundColor: "var(--color-surface)", boxShadow: "var(--shadow-card)", border: "1px solid var(--color-border)" }}>
          <div className="mb-4">
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Channel Performance</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Revenue by acquisition channel</p>
          </div>
          {byChannel.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>No channel data found</p>
          ) : (
            <div className="flex flex-col gap-3">
              {byChannel.map(({ channel, totalRaised, percentage }) => (
                <div key={channel} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{channel}</p>
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{fmt(totalRaised)} · {percentage}%</p>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-bg)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(totalRaised / maxChannelTotal) * 100}%`, backgroundColor: "var(--color-accent)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-center pb-2" style={{ color: "var(--color-text-muted)" }}>
        AGP Donor Intelligence · Executive Confidential ·{" "}
        <a href="/upload" style={{ color: "var(--color-secondary)" }}>Upload new dataset →</a>
      </p>
    </div>
  );
}

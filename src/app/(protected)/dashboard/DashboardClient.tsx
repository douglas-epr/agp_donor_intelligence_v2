"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteUpload } from "@/lib/supabase/actions";
import { useUploadContext } from "@/context/UploadContext";
import type { DashboardAggregates } from "@/mocks/types";

type UploadRow = { id: string; filename: string; row_count: number; uploaded_at: string };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
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
  const contentRef = useRef<HTMLDivElement>(null);
  const [showHistorical, setShowHistorical] = useState(false);
  const [uploadFilename, setUploadFilename] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);

  // Sync context with active URL param; auto-select latest if nothing active
  useEffect(() => {
    if (activeUploadId) {
      setSelectedUploadId(activeUploadId);
    } else {
      // No upload in URL — fetch latest and redirect
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) return;
        const { data } = await supabase
          .from("uploads")
          .select("id")
          .eq("user_id", user.id)
          .order("uploaded_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.id) {
          setSelectedUploadId(data.id);
          router.replace("/dashboard?upload=" + data.id);
        }
      });
    }
  }, [activeUploadId, setSelectedUploadId]); // router is stable — omitted intentionally

  useEffect(() => {
    if (!activeUploadId) { setUploadFilename(null); return; }
    createClient()
      .from("uploads").select("filename").eq("id", activeUploadId).single()
      .then(({ data }) => { if (data) setUploadFilename(data.filename); });
  }, [activeUploadId]);

  async function openHistorical() {
    setShowHistorical(true);
    if (uploads.length > 0) return;
    setUploadsLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("uploads")
      .select("id, filename, row_count, uploaded_at")
      .eq("user_id", user.id)
      .order("uploaded_at", { ascending: false });
    if (data) setUploads(data);
    setUploadsLoading(false);
  }

  function selectUpload(id: string) {
    setSelectedUploadId(id);
    setShowHistorical(false);
    router.push("/dashboard?upload=" + id);
  }

  async function handleDeleteUpload(id: string) {
    await deleteUpload(id);
    setUploads((prev) => prev.filter((u) => u.id !== id));
    if (id === activeUploadId) {
      setSelectedUploadId(null);
      setShowHistorical(false);
      router.replace("/dashboard");
    }
  }

  async function downloadReport() {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = pdf.internal.pageSize.getWidth();   // 297
    const H = pdf.internal.pageSize.getHeight();  // 210

    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });

    function hexRgb(hex: string): [number, number, number] {
      return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
    }

    function fmtTick(n: number) {
      if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
      if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
      return `$${n}`;
    }

    const SEG_COLORS  = ["#2F6FED","#1F3E77","#9EDC4B","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];
    const CHAN_COLORS = ["#2F6FED","#9EDC4B","#F59E0B","#8B5CF6","#06B6D4"];

    // ── Shared helpers ────────────────────────────────────────────────────────
    function pageHeader(subtitle: string) {
      pdf.setFillColor(31, 62, 119); pdf.rect(0, 0, W, 16, "F");
      pdf.setFillColor(47, 111, 237); pdf.rect(0, 14.5, W, 1.5, "F");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255); pdf.text("AGP Donor Intelligence", 14, 9);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
      pdf.setTextColor(150, 185, 245); pdf.text(subtitle, 14, 13.5);
      pdf.setTextColor(255, 255, 255); pdf.text(dateStr, W - 14, 9, { align: "right" });
      pdf.setFontSize(7); pdf.setTextColor(150, 185, 245);
      pdf.text("Executive Confidential", W - 14, 13.5, { align: "right" });
    }

    function pageFooter(pg: number) {
      pdf.setFillColor(245, 247, 250); pdf.rect(0, H - 9, W, 9, "F");
      pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.25);
      pdf.line(14, H - 9, W - 14, H - 9);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5);
      pdf.setTextColor(107, 114, 128);
      pdf.text("Allegiance Group + Pursuant (AGP)  ·  Confidential", 14, H - 3.5);
      pdf.setTextColor(47, 111, 237);
      pdf.text("AGP Donor Intelligence", W / 2, H - 3.5, { align: "center" });
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Page ${pg} of 3`, W - 14, H - 3.5, { align: "right" });
    }

    function card(x: number, y: number, w: number, h: number) {
      pdf.setFillColor(215, 220, 232); pdf.roundedRect(x + 0.6, y + 0.8, w, h, 2.5, 2.5, "F");
      pdf.setFillColor(255, 255, 255); pdf.roundedRect(x, y, w, h, 2.5, 2.5, "F");
      pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.25);
      pdf.roundedRect(x, y, w, h, 2.5, 2.5, "D");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PAGE 1 — COVER
    // ═══════════════════════════════════════════════════════════════════════════
    pdf.setFillColor(31, 62, 119); pdf.rect(0, 0, W, H, "F");

    // Decorative circles — top-right
    pdf.setFillColor(45, 75, 145);  pdf.circle(W + 10, -8, 95, "F");
    pdf.setFillColor(38, 65, 130);  pdf.circle(W + 10, -8, 62, "F");
    pdf.setFillColor(31, 62, 119);  pdf.circle(W + 10, -8, 38, "F");
    // Decorative circles — bottom-left
    pdf.setFillColor(45, 75, 145);  pdf.circle(-12, H + 8, 70, "F");
    pdf.setFillColor(38, 65, 130);  pdf.circle(-12, H + 8, 44, "F");

    // Logo bars (centered: three columns height = 14/20/28)
    const bx = 137, by = 82;
    pdf.setFillColor(47, 111, 237); pdf.rect(bx,      by - 14, 8, 14, "F");
    pdf.setFillColor(60, 100, 200); pdf.rect(bx + 10, by - 20, 8, 20, "F");
    pdf.setFillColor(158, 220, 75); pdf.rect(bx + 20, by - 28, 8, 28, "F");
    // Trend line
    pdf.setDrawColor(47, 111, 237); pdf.setLineWidth(1.8);
    pdf.line(bx + 4, by - 14, bx + 14, by - 20);
    pdf.line(bx + 14, by - 20, bx + 24, by - 28);
    // Arrowhead
    pdf.setFillColor(47, 111, 237);
    pdf.triangle(bx + 28, by - 28, bx + 23, by - 34, bx + 22, by - 27, "F");

    // Title & subtitle
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(24);
    pdf.setTextColor(255, 255, 255);
    pdf.text("AGP DONOR INTELLIGENCE", W / 2, 101, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(12);
    pdf.setTextColor(160, 190, 245);
    pdf.text("Executive Summary Report", W / 2, 113, { align: "center" });
    pdf.setFontSize(9); pdf.setTextColor(120, 155, 220);
    pdf.text(dateStr, W / 2, 123, { align: "center" });

    // Divider
    pdf.setDrawColor(60, 90, 160); pdf.setLineWidth(0.5);
    pdf.line(55, 130, W - 55, 130);

    // KPI strip
    const kpiItems = [
      { label: "TOTAL RAISED",   value: fmt(kpis.totalRaised) },
      { label: "AVERAGE GIFT",   value: fmt(kpis.averageGift) },
      { label: "DONOR COUNT",    value: kpis.donorCount.toLocaleString() },
      { label: "RETENTION RATE", value: `${Math.round(kpis.retentionRate * 100)}%` },
    ];
    const cW = 55, cH = 38, cGap = 7;
    const cX0 = (W - 4 * cW - 3 * cGap) / 2;
    kpiItems.forEach(({ label, value }, i) => {
      const cx = cX0 + i * (cW + cGap), cy = 135;
      pdf.setFillColor(42, 72, 148); pdf.roundedRect(cx, cy, cW, cH, 3, 3, "F");
      pdf.setDrawColor(65, 100, 180); pdf.setLineWidth(0.4);
      pdf.roundedRect(cx, cy, cW, cH, 3, 3, "D");
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(6);
      pdf.setTextColor(135, 170, 230);
      pdf.text(label, cx + cW / 2, cy + 9, { align: "center" });
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(17);
      pdf.setTextColor(255, 255, 255);
      pdf.text(value, cx + cW / 2, cy + 25, { align: "center" });
    });

    // Cover footer
    pdf.setDrawColor(60, 90, 160); pdf.setLineWidth(0.3);
    pdf.line(14, H - 9, W - 14, H - 9);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5);
    pdf.setTextColor(105, 140, 205);
    pdf.text("Allegiance Group + Pursuant (AGP)  ·  Confidential", 14, H - 4);
    pdf.setTextColor(80, 120, 195);
    pdf.text("AGP Donor Intelligence", W / 2, H - 4, { align: "center" });
    pdf.setTextColor(105, 140, 205);
    pdf.text("Page 1 of 3", W - 14, H - 4, { align: "right" });

    // ═══════════════════════════════════════════════════════════════════════════
    // PAGE 2 — GIFTS OVER TIME
    // ═══════════════════════════════════════════════════════════════════════════
    pdf.addPage();
    pdf.setFillColor(245, 247, 250); pdf.rect(0, 0, W, H, "F");
    pageHeader("Gifts Over Time Analysis");
    pageFooter(2);

    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
    pdf.setTextColor(31, 62, 119); pdf.text("Gifts Over Time", 14, 26);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text("Monthly revenue comparison · Current vs. Previous Year", 14, 32);

    const ccX = 14, ccY = 36, ccW = W - 28, ccH = H - 36 - 11;
    card(ccX, ccY, ccW, ccH);

    // Legend
    const lgX = ccX + ccW - 66, lgY = ccY + 7;
    pdf.setFillColor(47, 111, 237); pdf.rect(lgX, lgY, 8, 4, "F");
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128); pdf.text("Current Year", lgX + 10, lgY + 3.5);
    pdf.setFillColor(210, 218, 235); pdf.rect(lgX + 44, lgY, 8, 4, "F");
    pdf.text("Previous Year", lgX + 54, lgY + 3.5);

    // Chart draw area
    const yaW = 26, xPad = 8;
    const bax = ccX + yaW + 6;
    const baw = ccW - yaW - 6 - xPad;
    const bat = ccY + 8;
    const bab = ccY + ccH - 12;
    const bah = bab - bat;

    const maxVal = giftsByMonth.length > 0
      ? Math.max(...giftsByMonth.map(m => Math.max(m.currentYear, m.previousYear)), 1)
      : 10000;

    // Grid lines + Y labels
    [0, 0.25, 0.5, 0.75, 1].forEach(tick => {
      const gy = bab - tick * bah;
      pdf.setDrawColor(228, 234, 245); pdf.setLineWidth(0.2);
      pdf.line(bax, gy, bax + baw, gy);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5);
      pdf.setTextColor(107, 114, 128);
      pdf.text(fmtTick(tick * maxVal), bax - 3, gy + 1.5, { align: "right" });
    });

    // X axis
    pdf.setDrawColor(210, 218, 235); pdf.setLineWidth(0.4);
    pdf.line(bax, bab, bax + baw, bab);

    // Bars
    const nM = giftsByMonth.length || 12;
    const gw = baw / nM;
    const bw = Math.min(gw * 0.36, 9);
    const barGap = Math.min(gw * 0.05, 2);

    giftsByMonth.forEach(({ month, currentYear, previousYear }, i) => {
      const gcx = bax + i * gw + gw / 2;
      const pH  = maxVal > 0 ? Math.max((previousYear / maxVal) * bah, 0) : 0;
      const cH2 = maxVal > 0 ? Math.max((currentYear  / maxVal) * bah, 0) : 0;
      if (pH  > 0) { pdf.setFillColor(210, 218, 235); pdf.rect(gcx - bw - barGap / 2, bab - pH,  bw, pH,  "F"); }
      if (cH2 > 0) { pdf.setFillColor(47, 111, 237);  pdf.rect(gcx + barGap / 2,      bab - cH2, bw, cH2, "F"); }
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(6);
      pdf.setTextColor(107, 114, 128); pdf.text(month, gcx, bab + 6, { align: "center" });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // PAGE 3 — PERFORMANCE METRICS
    // ═══════════════════════════════════════════════════════════════════════════
    pdf.addPage();
    pdf.setFillColor(245, 247, 250); pdf.rect(0, 0, W, H, "F");
    pageHeader("Performance Analysis");
    pageFooter(3);

    pdf.setFont("helvetica", "bold"); pdf.setFontSize(11);
    pdf.setTextColor(31, 62, 119); pdf.text("Performance Metrics", 14, 26);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text("Campaign, channel, and segment breakdown", 14, 32);

    const colGap = 5;
    const ry = 36, rH = H - ry - 11;
    const lW = (W - 28 - colGap) * 0.52;
    const rColW = W - 28 - colGap - lW;
    const lX = 14, rX = lX + lW + colGap;
    const rTopH = Math.floor(rH * 0.48);
    const rBotH = rH - rTopH - colGap;

    // ── Campaign Performance (left) ──────────────────────────────────────────
    card(lX, ry, lW, rH);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
    pdf.setTextColor(17, 24, 39); pdf.text("Campaign Performance", lX + 8, ry + 11);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128); pdf.text("Revenue by initiative", lX + 8, ry + 17);

    const maxCamp = byCampaign[0]?.totalRaised ?? 1;
    const campPx = 8, campTrackW = lW - campPx * 2 - 28;
    const campStartY = ry + 22;
    const campRowH = Math.min((rH - 26) / Math.max(byCampaign.length, 1), 20);

    byCampaign.slice(0, 7).forEach(({ campaign, totalRaised }, i) => {
      const y = campStartY + i * campRowH;
      const fillW = (totalRaised / maxCamp) * campTrackW;
      const name = campaign.length > 26 ? campaign.slice(0, 26) + "…" : campaign;
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
      pdf.setTextColor(17, 24, 39); pdf.text(name, lX + campPx, y + 5);
      pdf.setFillColor(245, 247, 250); pdf.roundedRect(lX + campPx, y + 7.5, campTrackW, 4, 1, 1, "F");
      if (fillW > 0.5) { pdf.setFillColor(31, 62, 119); pdf.roundedRect(lX + campPx, y + 7.5, fillW, 4, 1, 1, "F"); }
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
      pdf.setTextColor(31, 62, 119); pdf.text(fmt(totalRaised), lX + lW - campPx, y + 10.5, { align: "right" });
    });

    // ── Channel Performance (right top) ──────────────────────────────────────
    card(rX, ry, rColW, rTopH);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
    pdf.setTextColor(17, 24, 39); pdf.text("Channel Performance", rX + 8, ry + 11);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128); pdf.text("Revenue by acquisition channel", rX + 8, ry + 17);

    const maxChan = byChannel[0]?.totalRaised ?? 1;
    const chanPx = 8, dotR = 2.5;
    const chanNameX = rX + chanPx + dotR * 2 + 2;
    const chanTrackW = rColW - chanPx * 2 - dotR * 2 - 2 - 18;
    const chanStartY = ry + 22;
    const chanRowH = Math.min((rTopH - 26) / Math.max(byChannel.length, 1), 17);

    byChannel.forEach(({ channel, totalRaised, percentage }, i) => {
      const y = chanStartY + i * chanRowH;
      const fillW = (totalRaised / maxChan) * chanTrackW;
      const [cr, cg, cb] = hexRgb(CHAN_COLORS[i % CHAN_COLORS.length]);
      pdf.setFillColor(cr, cg, cb); pdf.circle(rX + chanPx + dotR, y + 4, dotR, "F");
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
      pdf.setTextColor(17, 24, 39); pdf.text(channel, chanNameX, y + 5.5);
      pdf.setFillColor(245, 247, 250); pdf.roundedRect(chanNameX, y + 8, chanTrackW, 3.5, 1, 1, "F");
      if (fillW > 0.5) { pdf.setFillColor(cr, cg, cb); pdf.roundedRect(chanNameX, y + 8, fillW, 3.5, 1, 1, "F"); }
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${percentage}%`, rX + rColW - chanPx, y + 10.5, { align: "right" });
    });

    // ── Segment Breakdown (right bottom) ─────────────────────────────────────
    const sbY = ry + rTopH + colGap;
    card(rX, sbY, rColW, rBotH);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9);
    pdf.setTextColor(17, 24, 39); pdf.text("Segment Breakdown", rX + 8, sbY + 11);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128); pdf.text("Donor distribution by level", rX + 8, sbY + 17);

    const sBarX = rX + 8, sBarW = rColW - 16, sBarY = sbY + 22, sBarH = 8;
    let sOff = 0;
    bySegment.forEach(({ percentage }, i) => {
      const sw = Math.max((percentage / 100) * sBarW, 0);
      if (sw > 0) {
        const [sr, sg, sbg] = hexRgb(SEG_COLORS[i % SEG_COLORS.length]);
        pdf.setFillColor(sr, sg, sbg); pdf.rect(sBarX + sOff, sBarY, sw, sBarH, "F");
      }
      sOff += (percentage / 100) * sBarW;
    });
    pdf.setDrawColor(229, 231, 235); pdf.setLineWidth(0.3);
    pdf.rect(sBarX, sBarY, sBarW, sBarH, "D");

    // Segment legend (2 columns)
    const legStartY = sBarY + 12;
    const legColW = sBarW / 2;
    bySegment.forEach(({ segment, count, percentage }, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const lx = sBarX + col * legColW, ly = legStartY + row * 9;
      const [lr, lg, lb] = hexRgb(SEG_COLORS[i % SEG_COLORS.length]);
      pdf.setFillColor(lr, lg, lb); pdf.circle(lx + 2, ly + 1.5, 2, "F");
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5);
      pdf.setTextColor(17, 24, 39); pdf.text(segment, lx + 6, ly + 3);
      pdf.setFont("helvetica", "bold"); pdf.setTextColor(107, 114, 128);
      pdf.text(`${count} · ${percentage}%`, lx + legColW - 2, ly + 3, { align: "right" });
    });

    pdf.save(`AGP_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  }

  return (
    <div ref={contentRef} className="flex flex-col gap-6">
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
                    <div
                      key={u.id}
                      onClick={() => selectUpload(u.id)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer group transition-colors"
                      style={{
                        backgroundColor: isActive ? "rgba(47,111,237,0.08)" : "transparent",
                        border: isActive ? "1px solid rgba(47,111,237,0.3)" : "1px solid transparent",
                        marginBottom: 4,
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "var(--color-bg)"; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = isActive ? "rgba(47,111,237,0.08)" : "transparent"; }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: isActive ? "var(--color-secondary)" : "var(--color-text)" }}>
                          {u.filename}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                          {u.row_count.toLocaleString()} rows · {formatDateTime(u.uploaded_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: "rgba(47,111,237,0.12)", color: "var(--color-secondary)" }}>
                            Active
                          </span>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteUpload(u.id); }}
                          title="Delete upload"
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                          style={{ color: "var(--color-text-muted)" }}
                          onMouseEnter={(e) => { e.stopPropagation(); e.currentTarget.style.color = "var(--color-error)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; }}
                        >
                          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                            <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7.5h6.6L11 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
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
          <p className="text-sm mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: "var(--color-text-muted)" }}>
            Institutional Intelligence
            {uploadFilename && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: "rgba(47,111,237,0.08)", color: "var(--color-secondary)" }}
              >
                {uploadFilename}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2" data-pdf-hide>
          <button
            onClick={downloadReport}
            className="px-4 py-1.5 text-sm font-medium rounded-md border flex items-center gap-1.5"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)", backgroundColor: "transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-secondary)"; e.currentTarget.style.color = "var(--color-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1v7M4 6l2.5 2.5L9 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 10.5h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Download Report
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
          ) : (() => {
            const maxVal = Math.max(...giftsByMonth.map((m) => Math.max(m.currentYear, m.previousYear)), 1);
            function fmtTick(n: number) {
              if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
              if (n >= 1_000)     return `$${Math.round(n / 1_000)}k`;
              return `$${n}`;
            }
            return (
              <div className="flex gap-1">
                {/* Y-axis */}
                <div className="flex flex-col justify-between items-end pr-1.5 shrink-0 pb-5" style={{ height: 176, width: 36 }}>
                  <span style={{ fontSize: "0.6rem", color: "var(--color-text-muted)" }}>{fmtTick(maxVal)}</span>
                  <span style={{ fontSize: "0.6rem", color: "var(--color-text-muted)" }}>{fmtTick(maxVal / 2)}</span>
                  <span style={{ fontSize: "0.6rem", color: "var(--color-text-muted)" }}>$0</span>
                </div>
                {/* Bars */}
                <div className="flex-1 flex items-end gap-1.5" style={{ height: 176 }}>
                  {giftsByMonth.map(({ month, currentYear, previousYear }) => {
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
              </div>
            );
          })()}
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

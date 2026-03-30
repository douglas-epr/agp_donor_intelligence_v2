import { mockDonors } from "./donors";
import { DonorSegment, GiftChannel } from "@/lib/constants/enums";
import type {
  DashboardAggregates,
  DashboardKPIs,
  GiftsByMonth,
  CampaignPerformance,
  SegmentBreakdown,
  ChannelPerformance,
} from "./types";

// ─── KPIs ─────────────────────────────────────────────────────────────────────

function computeKPIs(donors = mockDonors): DashboardKPIs {
  const totalRaised = donors.reduce((sum, d) => sum + d.gift_amount, 0);
  const averageGift = donors.length > 0 ? totalRaised / donors.length : 0;

  const uniqueDonorIds = new Set(donors.map((d) => d.donor_id));
  const donorCount = uniqueDonorIds.size;

  // Retention = donors who appear more than once
  const giftCountById = new Map<string, number>();
  donors.forEach((d) => {
    giftCountById.set(d.donor_id, (giftCountById.get(d.donor_id) ?? 0) + 1);
  });
  const repeatDonors = [...giftCountById.values()].filter((n) => n > 1).length;
  const retentionRate = donorCount > 0 ? repeatDonors / donorCount : 0;

  return {
    totalRaised: Math.round(totalRaised),
    averageGift: Math.round(averageGift),
    donorCount,
    retentionRate: Math.round(retentionRate * 100) / 100,
  };
}

// ─── Gifts By Month ───────────────────────────────────────────────────────────

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function computeGiftsByMonth(donors = mockDonors): GiftsByMonth[] {
  const byMonth: Record<string, { currentYear: number; previousYear: number }> = {};

  MONTH_LABELS.forEach((m) => {
    byMonth[m] = { currentYear: 0, previousYear: 0 };
  });

  donors.forEach((d) => {
    const date = new Date(d.gift_date);
    const year = date.getFullYear();
    const month = MONTH_LABELS[date.getMonth()];
    if (year === 2024) byMonth[month].currentYear += d.gift_amount;
    if (year === 2023) byMonth[month].previousYear += d.gift_amount;
  });

  // Only return months that have data in either year
  return MONTH_LABELS.filter(
    (m) => byMonth[m].currentYear > 0 || byMonth[m].previousYear > 0
  ).map((month) => ({
    month,
    currentYear: Math.round(byMonth[month].currentYear),
    previousYear: Math.round(byMonth[month].previousYear),
  }));
}

// ─── Campaign Performance ─────────────────────────────────────────────────────

function computeByCampaign(donors = mockDonors): CampaignPerformance[] {
  const map = new Map<string, { total: number; count: number }>();

  donors.forEach((d) => {
    const entry = map.get(d.campaign) ?? { total: 0, count: 0 };
    entry.total += d.gift_amount;
    entry.count += 1;
    map.set(d.campaign, entry);
  });

  return [...map.entries()]
    .map(([campaign, { total, count }]) => ({
      campaign,
      totalRaised: Math.round(total),
      averageGift: Math.round(total / count),
    }))
    .sort((a, b) => b.totalRaised - a.totalRaised);
}

// ─── Segment Breakdown ────────────────────────────────────────────────────────

function computeBySegment(donors = mockDonors): SegmentBreakdown[] {
  const map = new Map<DonorSegment, Set<string>>();

  donors.forEach((d) => {
    if (!map.has(d.segment)) map.set(d.segment, new Set());
    map.get(d.segment)!.add(d.donor_id);
  });

  const total = [...map.values()].reduce((sum, set) => sum + set.size, 0);

  return [...map.entries()]
    .map(([segment, donorSet]) => ({
      segment,
      count: donorSet.size,
      percentage: total > 0 ? Math.round((donorSet.size / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Channel Performance ──────────────────────────────────────────────────────

function computeByChannel(donors = mockDonors): ChannelPerformance[] {
  const map = new Map<GiftChannel, number>();

  donors.forEach((d) => {
    map.set(d.channel, (map.get(d.channel) ?? 0) + d.gift_amount);
  });

  const total = [...map.values()].reduce((sum, v) => sum + v, 0);

  return [...map.entries()]
    .map(([channel, totalRaised]) => ({
      channel,
      totalRaised: Math.round(totalRaised),
      percentage: total > 0 ? Math.round((totalRaised / total) * 100) : 0,
    }))
    .sort((a, b) => b.totalRaised - a.totalRaised);
}

// ─── Full Aggregates Export ───────────────────────────────────────────────────

// Pre-computed from mockDonors — used by the dashboard in Phase 1.
// Pass a custom donors array to recompute from uploaded CSV data.
export function computeAggregates(donors = mockDonors): DashboardAggregates {
  return {
    kpis: computeKPIs(donors),
    giftsByMonth: computeGiftsByMonth(donors),
    byCampaign: computeByCampaign(donors),
    bySegment: computeBySegment(donors),
    byChannel: computeByChannel(donors),
  };
}

export const mockAggregates: DashboardAggregates = computeAggregates();

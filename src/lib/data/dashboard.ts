import { createClient } from "@/lib/supabase/server";
import type { DashboardAggregates } from "@/mocks/types";
import { DonorSegment, GiftChannel } from "@/lib/constants/enums";

// Fetch all KPIs and chart data for the authenticated user's most recent upload.
// Falls back gracefully to zero-values if no data exists.
export async function getDashboardData(): Promise<DashboardAggregates> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return emptyAggregates();

  // Fetch all valid gifts for this user
  const { data: gifts, error } = await supabase
    .from("donor_gifts")
    .select("donor_id, gift_amount, gift_date, campaign, segment, channel, region")
    .eq("user_id", user.id)
    .eq("is_valid", true)
    .order("gift_date", { ascending: true });

  if (error || !gifts || gifts.length === 0) return emptyAggregates();

  // ── KPIs ────────────────────────────────────────────────────────────
  const totalRaised = gifts.reduce((sum, g) => sum + Number(g.gift_amount), 0);
  const averageGift = gifts.length > 0 ? totalRaised / gifts.length : 0;

  const donorGiftCounts = new Map<string, number>();
  gifts.forEach((g) => {
    donorGiftCounts.set(g.donor_id, (donorGiftCounts.get(g.donor_id) ?? 0) + 1);
  });
  const donorCount = donorGiftCounts.size;
  const repeatDonors = [...donorGiftCounts.values()].filter((n) => n > 1).length;
  const retentionRate = donorCount > 0 ? Math.round((repeatDonors / donorCount) * 100) / 100 : 0;

  // ── Gifts by Month ───────────────────────────────────────────────────
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const byMonth: Record<string, { currentYear: number; previousYear: number }> = {};
  MONTHS.forEach((m) => (byMonth[m] = { currentYear: 0, previousYear: 0 }));

  const currentYear = new Date().getFullYear();
  gifts.forEach((g) => {
    if (!g.gift_date) return;
    const d = new Date(g.gift_date);
    const yr = d.getFullYear();
    const mo = MONTHS[d.getMonth()];
    if (yr === currentYear)     byMonth[mo].currentYear  += Number(g.gift_amount);
    if (yr === currentYear - 1) byMonth[mo].previousYear += Number(g.gift_amount);
  });

  const giftsByMonth = MONTHS
    .filter((m) => byMonth[m].currentYear > 0 || byMonth[m].previousYear > 0)
    .map((month) => ({
      month,
      currentYear:  Math.round(byMonth[month].currentYear),
      previousYear: Math.round(byMonth[month].previousYear),
    }));

  // ── Campaign Performance ─────────────────────────────────────────────
  const campaignMap = new Map<string, { total: number; count: number }>();
  gifts.forEach((g) => {
    if (!g.campaign) return;
    const entry = campaignMap.get(g.campaign) ?? { total: 0, count: 0 };
    entry.total += Number(g.gift_amount);
    entry.count += 1;
    campaignMap.set(g.campaign, entry);
  });
  const byCampaign = [...campaignMap.entries()]
    .map(([campaign, { total, count }]) => ({
      campaign,
      totalRaised: Math.round(total),
      averageGift: Math.round(total / count),
    }))
    .sort((a, b) => b.totalRaised - a.totalRaised);

  // ── Segment Breakdown ────────────────────────────────────────────────
  const segmentDonors = new Map<string, Set<string>>();
  gifts.forEach((g) => {
    if (!g.segment) return;
    if (!segmentDonors.has(g.segment)) segmentDonors.set(g.segment, new Set());
    segmentDonors.get(g.segment)!.add(g.donor_id);
  });
  const totalSegmentDonors = [...segmentDonors.values()].reduce((s, set) => s + set.size, 0);
  const bySegment = [...segmentDonors.entries()]
    .map(([segment, set]) => ({
      segment: segment as DonorSegment,
      count: set.size,
      percentage: totalSegmentDonors > 0 ? Math.round((set.size / totalSegmentDonors) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // ── Channel Performance ──────────────────────────────────────────────
  const channelMap = new Map<string, number>();
  gifts.forEach((g) => {
    if (!g.channel) return;
    channelMap.set(g.channel, (channelMap.get(g.channel) ?? 0) + Number(g.gift_amount));
  });
  const totalChannel = [...channelMap.values()].reduce((s, v) => s + v, 0);
  const byChannel = [...channelMap.entries()]
    .map(([channel, totalR]) => ({
      channel: channel as GiftChannel,
      totalRaised: Math.round(totalR),
      percentage: totalChannel > 0 ? Math.round((totalR / totalChannel) * 100) : 0,
    }))
    .sort((a, b) => b.totalRaised - a.totalRaised);

  return {
    kpis: {
      totalRaised: Math.round(totalRaised),
      averageGift: Math.round(averageGift),
      donorCount,
      retentionRate,
    },
    giftsByMonth,
    byCampaign,
    bySegment,
    byChannel,
  };
}

function emptyAggregates(): DashboardAggregates {
  return {
    kpis: { totalRaised: 0, averageGift: 0, donorCount: 0, retentionRate: 0 },
    giftsByMonth: [],
    byCampaign: [],
    bySegment: [],
    byChannel: [],
  };
}

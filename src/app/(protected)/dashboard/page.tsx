import { getDashboardData } from "@/lib/data/dashboard";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ upload?: string }>;
}) {
  const params = await searchParams;
  const uploadId = params.upload;

  const { kpis, byCampaign, bySegment, byChannel, giftsByMonth } =
    await getDashboardData(uploadId);

  const maxCampaignTotal = byCampaign[0]?.totalRaised ?? 1;
  const maxChannelTotal  = byChannel[0]?.totalRaised ?? 1;

  function fmt(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
    return `$${n.toLocaleString()}`;
  }

  return (
    <DashboardClient
      kpis={kpis}
      byCampaign={byCampaign}
      bySegment={bySegment}
      byChannel={byChannel}
      giftsByMonth={giftsByMonth}
      maxCampaignTotal={maxCampaignTotal}
      maxChannelTotal={maxChannelTotal}
      fmt={fmt}
      activeUploadId={uploadId ?? null}
    />
  );
}

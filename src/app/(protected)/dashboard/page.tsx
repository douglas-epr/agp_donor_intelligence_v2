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

  return (
    <DashboardClient
      kpis={kpis}
      byCampaign={byCampaign}
      bySegment={bySegment}
      byChannel={byChannel}
      giftsByMonth={giftsByMonth}
      activeUploadId={uploadId ?? null}
    />
  );
}

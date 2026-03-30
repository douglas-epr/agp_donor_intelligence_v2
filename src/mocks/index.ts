// Central export — import all mock data from here
export { mockDonors } from "./donors";
export { mockSession, unauthenticatedSession } from "./session";
export { mockAggregates, computeAggregates } from "./aggregates";
export type {
  DonorGift,
  ParsedRow,
  DashboardKPIs,
  DashboardAggregates,
  GiftsByMonth,
  CampaignPerformance,
  SegmentBreakdown,
  ChannelPerformance,
  UploadSession,
  MockSession,
} from "./types";

import type { DonorSegment, GiftChannel, GiftRegion, RowStatus } from "@/lib/constants/enums";

// Core entity — one row in the donor gift history CSV
export interface DonorGift {
  id: string;
  donor_id: string;
  donor_name: string;
  segment: DonorSegment;
  gift_date: string; // ISO 8601 YYYY-MM-DD
  gift_amount: number;
  campaign: string;
  channel: GiftChannel;
  region: GiftRegion;
}

// A parsed CSV row with validation metadata attached
export interface ParsedRow extends DonorGift {
  status: RowStatus;
  rejection_reason?: string;
}

// KPI aggregates derived from the active dataset
export interface DashboardKPIs {
  totalRaised: number;
  averageGift: number;
  donorCount: number;       // unique donor_id count
  retentionRate: number;    // 0–1 — donors with more than one gift
}

// Data shape for "Gifts Over Time" line chart
export interface GiftsByMonth {
  month: string;            // "Jan", "Feb", etc.
  currentYear: number;
  previousYear: number;
}

// Data shape for "Campaign Performance" bar chart
export interface CampaignPerformance {
  campaign: string;
  totalRaised: number;
  averageGift: number;
}

// Data shape for "Donor Segment Breakdown" donut chart
export interface SegmentBreakdown {
  segment: DonorSegment;
  count: number;
  percentage: number;       // 0–100
}

// Data shape for "Channel Performance" bar chart
export interface ChannelPerformance {
  channel: GiftChannel;
  totalRaised: number;
  percentage: number;       // 0–100 share of total
}

// Complete dashboard aggregates — computed from the active dataset
export interface DashboardAggregates {
  kpis: DashboardKPIs;
  giftsByMonth: GiftsByMonth[];
  byCampaign: CampaignPerformance[];
  bySegment: SegmentBreakdown[];
  byChannel: ChannelPerformance[];
}

// Mock upload session record
export interface UploadSession {
  id: string;
  filename: string;
  uploadedAt: string;
  rowCount: number;
  rejectedCount: number;
}

// Mock auth session
export interface MockSession {
  user: {
    id: string;
    email: string;
    name: string;
  };
  isAuthenticated: boolean;
}

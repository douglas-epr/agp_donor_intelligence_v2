// Donor segment classifications
export const DonorSegment = {
  MAJOR_GIFT: "Major Gifts",
  MID_LEVEL: "Mid-Level",
  SUSTAINER: "Sustainer",
  FIRST_TIME: "First-Time",
  LAPSED: "Lapsed",
  GENERAL: "General",
} as const;
export type DonorSegment = (typeof DonorSegment)[keyof typeof DonorSegment];

// Gift acquisition channels
export const GiftChannel = {
  EMAIL: "Email",
  DIRECT_MAIL: "Direct Mail",
  EVENT: "Event",
  ONLINE: "Online",
  PHONE: "Phone",
} as const;
export type GiftChannel = (typeof GiftChannel)[keyof typeof GiftChannel];

// Geographic regions
export const GiftRegion = {
  MIDWEST: "Midwest",
  NORTHEAST: "Northeast",
  WEST: "West",
  SOUTH: "South",
} as const;
export type GiftRegion = (typeof GiftRegion)[keyof typeof GiftRegion];

// Campaign names used in mock data
export const Campaign = {
  YEAR_END_APPEAL: "Year-End Appeal",
  SPRING_DRIVE: "Spring Drive",
  MAJOR_GIFT_GALA: "Major Gift Gala",
  SUSTAINER_PROGRAM: "Sustainer Program",
  CAPITAL_CAMPAIGN: "Capital Campaign",
} as const;
export type Campaign = (typeof Campaign)[keyof typeof Campaign];

// Row validation status after CSV parsing
export const RowStatus = {
  VALID: "valid",
  WARNING: "warning",
  REJECTED: "rejected",
} as const;
export type RowStatus = (typeof RowStatus)[keyof typeof RowStatus];

// App routes
export const Routes = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  UPLOAD: "/upload",
  AI_EXPLORER: "/ai-explorer",
  REPORTS: "/reports",
} as const;

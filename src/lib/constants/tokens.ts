// Design system color tokens — matches docs/architecture.md exactly
export const colors = {
  primary: "#1F3E77",       // Institutional Blue — nav, headers
  secondary: "#2F6FED",     // Insight Blue — buttons, links, chart lines
  bg: "#F5F7FA",            // Cloud Interface — page background, cards
  accent: "#9EDC4B",        // Momentum Green — growth indicators, positive metrics
  text: "#2A2E35",          // Executive Graphite — titles, KPIs, body
  textMuted: "#6B7280",     // Secondary labels, captions
  border: "#E5E7EB",        // Card borders, table dividers
  error: "#EF4444",         // Rejected rows, validation errors
  warning: "#F59E0B",       // Flagged rows, warnings
  surface: "#FFFFFF",       // Card surfaces, modals
} as const;

// Chart color scale — used in order for multi-series charts
export const chartColors = [
  "#2F6FED",  // Insight Blue
  "#1F3E77",  // Institutional Blue
  "#9EDC4B",  // Momentum Green
  "#F59E0B",  // Amber
  "#8B5CF6",  // Violet
  "#EC4899",  // Pink
] as const;

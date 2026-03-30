import { getDashboardData } from "@/lib/data/dashboard";

export default async function DashboardPage() {
  const { kpis, byCampaign, bySegment, byChannel, giftsByMonth } = await getDashboardData();

  const maxCampaignTotal = byCampaign[0]?.totalRaised ?? 1;
  const maxChannelTotal  = byChannel[0]?.totalRaised ?? 1;

  function fmt(n: number) {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
    return `$${n.toLocaleString()}`;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            Executive Summary
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Institutional Intelligence · Live Data
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-1.5 text-sm font-medium rounded-md text-white"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            Live View
          </button>
          <button
            className="px-4 py-1.5 text-sm font-medium rounded-md border"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
          >
            Historical
          </button>
        </div>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Total Raised",
            value: fmt(kpis.totalRaised),
            sub: kpis.totalRaised > 0 ? "from all gifts" : "No data yet",
          },
          {
            label: "Average Gift",
            value: fmt(kpis.averageGift),
            sub: "per transaction",
          },
          {
            label: "Donor Count",
            value: kpis.donorCount.toLocaleString(),
            sub: "unique donors",
          },
          {
            label: "Retention Rate",
            value: `${Math.round(kpis.retentionRate * 100)}%`,
            sub: "gave more than once",
          },
        ].map(({ label, value, sub }) => (
          <div
            key={label}
            className="rounded-xl p-5 flex flex-col gap-2"
            style={{
              backgroundColor: "var(--color-surface)",
              boxShadow: "var(--shadow-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              {label}
            </p>
            <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>{value}</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Charts Row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Gifts Over Time — simple inline bar chart */}
        <div
          className="col-span-2 rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-surface)",
            boxShadow: "var(--shadow-card)",
            border: "1px solid var(--color-border)",
          }}
        >
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
            <div className="flex items-center justify-center h-40" style={{ color: "var(--color-text-muted)" }}>
              <p className="text-sm">Upload a CSV to see gift trends</p>
            </div>
          ) : (
            <div className="flex items-end gap-2 h-40">
              {giftsByMonth.map(({ month, currentYear, previousYear }) => {
                const maxVal = Math.max(...giftsByMonth.map((m) => Math.max(m.currentYear, m.previousYear)), 1);
                const curH = Math.max((currentYear / maxVal) * 100, 2);
                const prevH = Math.max((previousYear / maxVal) * 100, 2);
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-0.5 items-end" style={{ height: 120 }}>
                      <div
                        className="flex-1 rounded-t-sm transition-all"
                        style={{ height: `${prevH}%`, backgroundColor: "var(--color-border)" }}
                        title={`${month} prev: ${fmt(previousYear)}`}
                      />
                      <div
                        className="flex-1 rounded-t-sm transition-all"
                        style={{ height: `${curH}%`, backgroundColor: "var(--color-secondary)" }}
                        title={`${month}: ${fmt(currentYear)}`}
                      />
                    </div>
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{month}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Segment Breakdown — donut-style list */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-surface)",
            boxShadow: "var(--shadow-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Segment Breakdown</p>
          <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>Donor distribution by level</p>

          {bySegment.length === 0 ? (
            <div className="flex items-center justify-center h-32" style={{ color: "var(--color-text-muted)" }}>
              <p className="text-sm">No data yet</p>
            </div>
          ) : (
            <>
              {/* Simple donut using conic-gradient */}
              <div className="flex justify-center mb-4">
                <div className="relative w-28 h-28">
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      background: `conic-gradient(
                        #2F6FED 0% ${bySegment[0]?.percentage ?? 0}%,
                        #1F3E77 ${bySegment[0]?.percentage ?? 0}% ${(bySegment[0]?.percentage ?? 0) + (bySegment[1]?.percentage ?? 0)}%,
                        #9EDC4B ${(bySegment[0]?.percentage ?? 0) + (bySegment[1]?.percentage ?? 0)}% 100%
                      )`,
                    }}
                  />
                  <div
                    className="absolute inset-3 rounded-full flex flex-col items-center justify-center"
                    style={{ backgroundColor: "var(--color-surface)" }}
                  >
                    <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                      {kpis.donorCount.toLocaleString()}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Total</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {bySegment.slice(0, 4).map(({ segment, count, percentage }, i) => {
                  const colors = ["#2F6FED", "#1F3E77", "#9EDC4B", "#F59E0B"];
                  return (
                    <div key={segment} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i] }} />
                        <span className="text-xs" style={{ color: "var(--color-text)" }}>{segment}</span>
                      </div>
                      <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                        {count} · {percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Campaign + Channel Row ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Campaign Performance */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-surface)",
            boxShadow: "var(--shadow-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Campaign Performance</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Revenue by initiative</p>
            </div>
          </div>
          {byCampaign.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>No campaigns found</p>
          ) : (
            <div className="flex flex-col gap-3">
              {byCampaign.slice(0, 5).map(({ campaign, totalRaised }) => (
                <div key={campaign} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate mr-2" style={{ color: "var(--color-text)" }}>{campaign}</p>
                    <p className="text-sm font-semibold shrink-0" style={{ color: "var(--color-text)" }}>{fmt(totalRaised)}</p>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-bg)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(totalRaised / maxCampaignTotal) * 100}%`,
                        backgroundColor: "var(--color-primary)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Channel Performance */}
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-surface)",
            boxShadow: "var(--shadow-card)",
            border: "1px solid var(--color-border)",
          }}
        >
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
                    <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                      {fmt(totalRaised)} · {percentage}%
                    </p>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-bg)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(totalRaised / maxChannelTotal) * 100}%`,
                        backgroundColor: "var(--color-accent)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <p className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>
        © 2024 AGP Donor Intelligence. Executive Confidential. ·
        <a href="/upload" style={{ color: "var(--color-secondary)" }} className="ml-1">Upload new dataset →</a>
      </p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            Executive Summary
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Institutional Intelligence • Updated 2 minutes ago
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-1.5 text-sm font-medium rounded-md"
            style={{ backgroundColor: "var(--color-secondary)", color: "white" }}
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

      {/* KPI cards placeholder */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Raised",    value: "$1.2M",  delta: "+12.4%" },
          { label: "Average Gift",    value: "$480",   delta: "+4.2%"  },
          { label: "Donor Count",     value: "2,500",  delta: "+8.1%"  },
          { label: "Retention Rate",  value: "65%",    delta: "Stable" },
        ].map(({ label, value, delta }) => (
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
            <p className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
              {value}
            </p>
            <p className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--color-accent)" }}>
              <span>↑</span>{delta}
            </p>
          </div>
        ))}
      </div>

      {/* Charts row placeholder */}
      <div className="grid grid-cols-3 gap-4">
        <div
          className="col-span-2 rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-surface)",
            boxShadow: "var(--shadow-card)",
            border: "1px solid var(--color-border)",
            minHeight: 260,
          }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Gifts Over Time</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Monthly revenue trend analysis</p>
          <div className="flex items-center justify-center h-44 mt-4" style={{ color: "var(--color-text-muted)" }}>
            <p className="text-sm">Chart coming in next build</p>
          </div>
        </div>
        <div
          className="rounded-xl p-5"
          style={{
            backgroundColor: "var(--color-surface)",
            boxShadow: "var(--shadow-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>Segment Breakdown</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Donor distribution by level</p>
          <div className="flex items-center justify-center h-44 mt-4" style={{ color: "var(--color-text-muted)" }}>
            <p className="text-sm">Chart coming in next build</p>
          </div>
        </div>
      </div>

      {/* Campaign performance placeholder */}
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
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Revenue by primary initiative</p>
          </div>
          <button className="text-xs font-medium" style={{ color: "var(--color-secondary)" }}>
            View Full Report →
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "Year-End Appeal",  amount: "$540k", pct: 85 },
            { name: "Spring Drive",     amount: "$210k", pct: 33 },
            { name: "Major Gift Gala",  amount: "$320k", pct: 50 },
            { name: "Sustainer Program",amount: "$130k", pct: 20 },
          ].map(({ name, amount, pct }) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>{name}</p>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>{amount}</p>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--color-bg)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: "var(--color-primary)" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

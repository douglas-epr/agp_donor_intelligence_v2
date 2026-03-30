"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/supabase/actions";

const NAV_ITEMS = [
  { label: "Overview",    href: "/dashboard",   icon: OverviewIcon  },
  { label: "Data Vault",  href: "/upload",       icon: VaultIcon     },
  { label: "AI Insights", href: "/ai-explorer", icon: AiIcon        },
  { label: "Settings",    href: "/settings",     icon: SettingsIcon  },
] as const;

const TOP_NAV = [
  { label: "Dashboard",   href: "/dashboard"   },
  { label: "Upload",      href: "/upload"       },
  { label: "AI Explorer", href: "/ai-explorer" },
  { label: "Reports",     href: "/reports"      },
] as const;

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Auth guard is now handled by middleware.ts — no client-side redirect needed.

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* ── Top Nav ─────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 shrink-0 z-10"
        style={{
          height: 56,
          backgroundColor: "var(--color-surface)",
          borderBottom: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
            <rect x="1" y="11" width="4" height="10" rx="1" fill="#2F6FED" />
            <rect x="7" y="7"  width="4" height="14" rx="1" fill="#1F3E77" />
            <rect x="13" y="3" width="4" height="18" rx="1" fill="#9EDC4B" />
            <path d="M18 5 L21 2" stroke="#2F6FED" strokeWidth="2" strokeLinecap="round" />
            <path d="M19 2 L21 2 L21 4" stroke="#2F6FED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm font-bold tracking-tight" style={{ color: "var(--color-primary)" }}>
            AGP DONOR INTELLIGENCE
          </span>
        </div>

        <nav className="flex items-center gap-1">
          {TOP_NAV.map(({ label, href }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="px-4 py-1.5 text-sm font-medium transition-colors"
                style={{
                  color: active ? "var(--color-secondary)" : "var(--color-text-muted)",
                  borderBottom: active ? "2px solid var(--color-secondary)" : "2px solid transparent",
                  borderRadius: 0,
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/ai-explorer"
            className="px-4 py-1.5 text-sm font-semibold text-white rounded-md flex items-center gap-1.5"
            style={{ backgroundColor: "var(--color-secondary)" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="white" strokeWidth="1.4" />
              <path d="M4 6h4M6 4l2 2-2 2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            New Query
          </Link>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            A
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ────────────────────────────────────────────────── */}
        <aside
          className="flex flex-col shrink-0 py-6"
          style={{
            width: 220,
            backgroundColor: "var(--color-surface)",
            borderRight: "1px solid var(--color-border)",
          }}
        >
          <div className="px-5 pb-5" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <p className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>AGP Intelligence</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Institutional Grade</p>
          </div>

          <nav className="flex flex-col gap-0.5 px-3 pt-4 flex-1">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: active ? "rgba(47,111,237,0.08)" : "transparent",
                    color: active ? "var(--color-secondary)" : "var(--color-text-muted)",
                  }}
                >
                  <Icon active={active} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="px-4 py-4" style={{ borderTop: "1px solid var(--color-border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--color-text-muted)" }}>
              Quick Action
            </p>
            <Link
              href="/upload"
              className="flex items-center justify-center w-full py-2 text-sm font-semibold text-white rounded-lg"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              Upload CSV
            </Link>
          </div>

          <div className="px-4 pb-2 flex flex-col gap-1">
            <button
              className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-md text-left w-full"
              style={{ color: "var(--color-text-muted)" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
                <path d="M7 6v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Help Center
            </button>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-md text-left w-full"
                style={{ color: "var(--color-error)" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Logout
              </button>
            </form>
          </div>
        </aside>

        {/* ── Main Content ───────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function OverviewIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill={active ? "rgba(47,111,237,0.15)" : "none"} />
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill={active ? "rgba(47,111,237,0.15)" : "none"} />
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill={active ? "rgba(47,111,237,0.15)" : "none"} />
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill={active ? "rgba(47,111,237,0.15)" : "none"} />
    </svg>
  );
}
function VaultIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.3" fill={active ? "rgba(47,111,237,0.15)" : "none"} />
      <path d="M5 8h2m4 0h-2M8 5v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
function AiIcon({ active }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" fill={active ? "rgba(47,111,237,0.15)" : "none"} />
      <path d="M5 8h6M8 5l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SettingsIcon({ active: _ }: { active: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

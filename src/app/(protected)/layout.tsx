"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/lib/supabase/actions";
import { createClient } from "@/lib/supabase/client";
import { UploadContextProvider } from "@/context/UploadContext";

// Top-nav only items (not in sidebar)
const TOP_NAV_ITEMS = [
  { label: "Overview", href: "/dashboard" },
  { label: "Upload", href: "/upload" },
  { label: "AI Explorer", href: "/ai-explorer" },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; full_name: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user: authUser } }) => {
      if (!authUser) { router.replace("/login"); return; }
      const full_name = (authUser.user_metadata?.full_name as string) || authUser.email?.split("@")[0] || "User";

      // Load avatar_url from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", authUser.id)
        .maybeSingle();

      setUser({
        email: authUser.email ?? "",
        full_name,
        avatar_url: profile?.avatar_url ?? null,
      });
    });
  }, [router]);

  const initials = user ? getInitials(user.full_name) : "…";

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--color-bg)" }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0 h-full"
        style={{ width: 220, backgroundColor: "var(--color-surface)", borderRight: "1px solid var(--color-border)" }}
      >
        {/* Logo */}
        <div className="px-5 py-4 flex items-center justify-center" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <Link href="/dashboard" className="flex items-center justify-center">
            <Image
              src="/agp-logo.svg"
              alt="AGP Intelligence"
              width={140}
              height={30}
              priority
              style={{ height: 28, width: "auto" }}
            />
          </Link>
        </div>

        {/* Profile group */}
        <div className="px-3 pt-3 pb-1">
          <Link
            href="/profile"
            className="flex items-center gap-3 px-2 py-2.5 rounded-lg transition-colors"
            style={{ color: "var(--color-text)" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: "var(--color-secondary)" }}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text)" }}>{user?.full_name ?? "Loading…"}</p>
              <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>{user?.email ?? ""}</p>
            </div>
          </Link>
        </div>

        {/* Nav items — sidebar only: Overview */}
        <nav className="flex-1 flex flex-col gap-0.5 px-3 py-2">
          {[{ label: "Overview", href: "/dashboard", icon: (active: boolean) => (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill={active ? "rgba(47,111,237,0.15)" : "none"} />
              <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill={active ? "rgba(47,111,237,0.15)" : "none"} />
              <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill={active ? "rgba(47,111,237,0.15)" : "none"} />
              <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" fill={active ? "rgba(47,111,237,0.15)" : "none"} />
            </svg>
          )}].map(({ label, href, icon }) => {
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
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.backgroundColor = "var(--color-bg)"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                {icon(active)}
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: Settings + Logout */}
        <div className="px-3 pb-4 pt-3 flex flex-col gap-0.5" style={{ borderTop: "1px solid var(--color-border)" }}>
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: pathname === "/settings" ? "rgba(47,111,237,0.08)" : "transparent",
              color: pathname === "/settings" ? "var(--color-secondary)" : "var(--color-text-muted)",
            }}
            onMouseEnter={(e) => { if (pathname !== "/settings") e.currentTarget.style.backgroundColor = "var(--color-bg)"; }}
            onMouseLeave={(e) => { if (pathname !== "/settings") e.currentTarget.style.backgroundColor = "transparent"; }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Settings
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ color: "var(--color-text-muted)" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#FEF2F2"; e.currentTarget.style.color = "var(--color-error)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top nav */}
        <header
          className="flex items-center px-6 shrink-0 gap-1"
          style={{ height: 52, backgroundColor: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
        >
          {TOP_NAV_ITEMS.map(({ label, href }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="px-4 py-1.5 text-sm font-medium transition-colors relative"
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
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <UploadContextProvider>
      <LayoutInner>{children}</LayoutInner>
    </UploadContextProvider>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navMaps: Record<string, { icon: string; label: string; href: string }[]> = {
  admin: [
    { icon: "dashboard", label: "Overview", href: "/dashboard/admin" },
    { icon: "👥", label: "Pending hosts", href: "/dashboard/admin?tab=pending" },
    { icon: "📋", label: "All listings", href: "/dashboard/admin?tab=listings" },
    { icon: "📊", label: "Metrics", href: "/dashboard/admin?tab=metrics" },
  ],
  host: [
    { icon: "📊", label: "Overview", href: "/dashboard/host" },
    { icon: "🏠", label: "My listings", href: "/dashboard/host?tab=listings" },
    { icon: "📝", label: "Create listing", href: "/dashboard/host?tab=create" },
    { icon: "📅", label: "Bookings", href: "/dashboard/host?tab=bookings" },
    { icon: "💰", label: "Earnings", href: "/dashboard/host?tab=earnings" },
  ],
  renter: [
    { icon: "📊", label: "Overview", href: "/dashboard/renter" },
    { icon: "📅", label: "My bookings", href: "/dashboard/renter?tab=bookings" },
    { icon: "⭐", label: "Reviews", href: "/dashboard/renter?tab=reviews" },
    { icon: "📍", label: "Saved places", href: "/dashboard/renter?tab=saved" },
  ],
};

export function DashboardSidebar({ type, userName }: { type: string; userName?: string }) {
  const pathname = usePathname();
  const items = navMaps[type] ?? [];
  const initials = userName ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  return (
    <aside className="dash-sidebar">
      <div className="dash-sidebar-header">
        <div className="dash-sidebar-avatar">{initials}</div>
        <div>
          <div className="dash-sidebar-name">{userName ?? "Dashboard"}</div>
          <div className="dash-sidebar-role">{type}</div>
        </div>
      </div>
      <nav className="dash-nav">
        {items.map((item) => (
          <Link
            key={item.href}
            className={`dash-nav-item ${pathname === item.href || pathname?.startsWith(item.href + "?") ? "dash-nav-active" : ""}`}
            href={item.href}
          >
            <span className="dash-nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div style={{ padding: "1rem 1.5rem", marginTop: "auto" }}>
        <Link className="dash-nav-item" href="/" style={{ color: "var(--accent-3)" }}>
          ← Back to home
        </Link>
      </div>
    </aside>
  );
}

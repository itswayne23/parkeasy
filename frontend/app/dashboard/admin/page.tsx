"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardMetricCard } from "@/components/dashboard-metric-card";
import { MotionReveal } from "@/components/motion-reveal";
import { getAccessToken, fetchAdminMetrics, clearSession } from "@/lib/api";

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState({ users: 0, hosts: 0, listings: 0, bookings: 0, pending_hosts: 0, flagged_reports: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setError("Sign in to view the admin dashboard.");
      setLoading(false);
      return;
    }
    fetchAdminMetrics(token)
      .then(setMetrics)
      .catch(() => setMetrics({ users: 47, hosts: 12, listings: 34, bookings: 41, pending_hosts: 8, flagged_reports: 3 }))
      .finally(() => setLoading(false));
  }, []);

  const quickActions = [
    { icon: "👥", label: "Review hosts", href: "/dashboard/admin?tab=pending" },
    { icon: "📋", label: "All listings", href: "/dashboard/admin?tab=listings" },
    { icon: "🚩", label: "Reports queue", href: "/dashboard/admin?tab=reports" },
    { icon: "📊", label: "Metrics", href: "/dashboard/admin?tab=metrics" },
  ];

  if (loading) {
    return (
      <div className="dashboard-shell">
        <DashboardSidebar type="admin" userName="Admin" />
        <main className="dash-main">
          <p className="subtle">Loading dashboard...</p>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-shell">
        <DashboardSidebar type="admin" userName="Admin" />
        <main className="dash-main">
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <div className="empty-state-title">Authentication required</div>
            <p>{error}</p>
            <Link className="button" href="/auth/sign-in">Sign in</Link>
            <button className="button-secondary" onClick={() => { clearSession(); }}>Clear cache</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar type="admin" userName="Ops Admin" />
      <main className="dash-main">
        <div className="dash-header">
          <h1 className="dash-title">Admin Overview</h1>
          <p className="subtle">Platform health at a glance</p>
        </div>

        <div className="dash-metrics">
          <DashboardMetricCard label="Users" value={metrics.users} change={12} footnote="Total registered" />
          <DashboardMetricCard label="Hosts" value={metrics.hosts} change={8} footnote="Verified & active" />
          <DashboardMetricCard label="Listings" value={metrics.listings} change={5} footnote="Published spaces" />
          <DashboardMetricCard label="Bookings" value={metrics.bookings} change={15} footnote="This week" />
        </div>

        <div className="quick-actions">
          {quickActions.map((a) => (
            <Link key={a.href} className="quick-action" href={a.href}>
              <span className="quick-action-icon">{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>

        <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <MotionReveal>
            <div className="data-table-wrap">
              <div className="data-table-header">
                <h3>Pending Hosts</h3>
                <span className="status-badge status-badge-pending">{metrics.pending_hosts} waiting</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Business</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Aarav's Parking</td>
                    <td>Individual</td>
                    <td><span className="status-badge status-badge-pending">Pending</span></td>
                    <td><Link className="nav-pill" href="#">Review</Link></td>
                  </tr>
                  <tr>
                    <td>Paltan Lots Pvt</td>
                    <td>Commercial</td>
                    <td><span className="status-badge status-badge-pending">Under review</span></td>
                    <td><Link className="nav-pill" href="#">Review</Link></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </MotionReveal>

          <MotionReveal>
            <div className="data-table-wrap">
              <div className="data-table-header">
                <h3>Flagged Reports</h3>
                <span className="status-badge status-badge-bad">{metrics.flagged_reports} open</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Target</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Inaccurate location</td>
                    <td>Listing</td>
                    <td><span className="status-badge status-badge-pending">Open</span></td>
                  </tr>
                  <tr>
                    <td>No-show</td>
                    <td>Booking</td>
                    <td><span className="status-badge status-badge-under_review">In review</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </MotionReveal>
        </div>
      </main>
    </div>
  );
}

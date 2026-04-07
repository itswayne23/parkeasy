"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardMetricCard } from "@/components/dashboard-metric-card";
import { MotionReveal } from "@/components/motion-reveal";
import { clearSession, fetchBookingQr, fetchListingsByIds, fetchMe, fetchMyBookings, getAccessToken } from "@/lib/api";
import { bookingPhase, formatBookingWindow, formatCurrency, humanizeLabel, statusTone } from "@/lib/format";
import type { BookingRead } from "@/lib/booking-types";
import type { ListingCard } from "@/lib/types";

type DashboardState = {
  bookings: BookingRead[];
  listings: Record<string, ListingCard>;
  latestQr: { svg_data_url: string | null; payload: string | null } | null;
};

export default function RenterDashboard() {
  const [userName, setUserName] = useState<string | null>(null);
  const [state, setState] = useState<DashboardState>({ bookings: [], listings: {}, latestQr: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }

    Promise.all([fetchMe(token), fetchMyBookings(token)])
      .then(async ([user, bookings]) => {
        setUserName(user.full_name);
        const listings = await fetchListingsByIds(bookings.map((b) => b.listing_id));
        const latestConfirmed = bookings.find((b) => b.status === "confirmed");
        const latestQr = latestConfirmed
          ? await fetchBookingQr(latestConfirmed.id, token).catch(() => null)
          : null;
        setState({ bookings, listings, latestQr });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const upcomingBookings = useMemo(() => state.bookings.filter((b) => ["pending", "confirmed"].includes(b.status)).length, [state.bookings]);
  const confirmedBookings = useMemo(() => state.bookings.filter((b) => b.status === "confirmed").length, [state.bookings]);
  const totalValue = useMemo(() => state.bookings.reduce((sum, b) => sum + Number(b.total_amount ?? 0), 0), [state.bookings]);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "bookings", label: "My bookings" },
    { id: "qr", label: "QR Code" },
  ];

  if (loading) {
    return (
      <div className="dashboard-shell">
        <DashboardSidebar type="renter" userName="Renter" />
        <main className="dash-main"><p className="subtle">Loading...</p></main>
      </div>
    );
  }

  if (!getAccessToken()) {
    return (
      <div className="dashboard-shell">
        <DashboardSidebar type="renter" userName="Renter" />
        <main className="dash-main">
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <div className="empty-state-title">Sign in required</div>
            <p>Please sign in to view your booking dashboard.</p>
            <Link className="button" href="/auth/sign-in">Sign in</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      <DashboardSidebar type="renter" userName={userName ?? "Renter"} />
      <main className="dash-main">
        <div className="dash-header">
          <h1 className="dash-title">Renter Dashboard</h1>
          <p className="subtle">See every booking, route, and scan moment at a glance</p>
        </div>

        <div className="card-tabs">
          {tabs.map((t) => (
            <button key={t.id} className={`card-tab ${tab === t.id ? "card-tab-active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="empty-state" style={{ marginBottom: "1.5rem", borderColor: "var(--accent-3)" }}>
            <div className="empty-state-icon">⚠️</div>
            <div className="empty-state-title">Error</div>
            <p>{error}</p>
          </div>
        )}

        {tab === "overview" && (
          <>
            <div className="dash-metrics">
              <DashboardMetricCard label="Upcoming" value={upcomingBookings} footnote="Pending & confirmed" />
              <DashboardMetricCard label="Confirmed" value={confirmedBookings} />
              <DashboardMetricCard label="Total value" value={formatCurrency(totalValue)} />
              <DashboardMetricCard label="Bookings total" value={state.bookings.length} />
            </div>

            <div className="quick-actions">
              <Link className="quick-action" href="/search">
                <span className="quick-action-icon">🔍</span>Find parking
              </Link>
              <button className="quick-action" onClick={() => setTab("bookings")}>
                <span className="quick-action-icon">📅</span>View bookings
              </button>
              <button className="quick-action" onClick={() => setTab("qr")}>
                <span className="quick-action-icon">📱</span>QR code
              </button>
            </div>

            <MotionReveal>
              <div className="data-table-wrap">
                <div className="data-table-header">
                  <h3>Recent Bookings</h3>
                  <span className="status-badge status-badge-active">{state.bookings.length} bookings</span>
                </div>
                {state.bookings.length === 0 ? (
                  <div style={{ padding: "2.5rem", textAlign: "center" }}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📅</div>
                      <div className="empty-state-title">No bookings yet</div>
                      <p>Book a parking spot to see your history here.</p>
                      <Link className="button" href="/search">Browse listings</Link>
                    </div>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Listing</th>
                        <th>Status</th>
                        <th>Amount</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.bookings.map((b) => (
                        <tr key={b.id}>
                          <td><strong style={{ color: "var(--text)" }}>{state.listings[b.listing_id]?.title ?? b.listing_id}</strong></td>
                          <td>
                            <span className={`status-badge status-badge-${statusTone(b.status)}`}>
                              {humanizeLabel(b.status)}
                            </span>
                          </td>
                          <td>{formatCurrency(b.total_amount)}</td>
                          <td><Link className="nav-pill" href={`/listings/${b.listing_id}`}>View</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </MotionReveal>

            {state.latestQr?.svg_data_url && (
              <MotionReveal>
                <div className="data-table-wrap" style={{ marginTop: "1.5rem" }}>
                  <div className="data-table-header">
                    <h3>Your Latest QR</h3>
                    <span className="status-badge status-badge-active">Ready to scan</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                    <div className="booking-summary" style={{ alignItems: "center" }}>
                      <img className="qr-image" src={state.latestQr.svg_data_url} alt="Booking QR code" />
                      <p className="subtle">Present this QR code to complete the parking check-in.</p>
                    </div>
                  </div>
                </div>
              </MotionReveal>
            )}
          </>
        )}

        {tab === "bookings" && (
          <MotionReveal>
            <div className="data-table-wrap">
              <div className="data-table-header">
                <h3>Booking History</h3>
                <span className="status-badge status-badge-active">{state.bookings.length} bookings</span>
              </div>
              {state.bookings.length === 0 ? (
                <div style={{ padding: "2.5rem", textAlign: "center" }}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📅</div>
                    <div className="empty-state-title">Empty booking history</div>
                    <p>Your renter history will appear here after booking a parking spot.</p>
                    <Link className="button" href="/search">Find parking</Link>
                  </div>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Listing</th>
                      <th>Unit</th>
                      <th>Status</th>
                      <th>Window</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.bookings.map((b) => (
                      <tr key={b.id}>
                        <td><strong style={{ color: "var(--text)" }}>{state.listings[b.listing_id]?.title ?? b.listing_id}</strong></td>
                        <td>{humanizeLabel(b.unit)}</td>
                        <td>
                          <span className={`status-badge status-badge-${statusTone(b.status)}`}>
                            {humanizeLabel(b.status)}
                          </span>
                        </td>
                        <td>{formatBookingWindow(b.start_at, b.end_at)}</td>
                        <td>{formatCurrency(b.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </MotionReveal>
        )}

        {tab === "qr" && (
          <MotionReveal>
            {state.latestQr?.svg_data_url ? (
              <div className="booking-summary" style={{ padding: "2rem", justifyItems: "center" }}>
                <img className="qr-image" src={state.latestQr.svg_data_url} alt="Booking QR code" />
                <p className="subtle">Use this QR during arrival to complete the demo parking moment.</p>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📱</div>
                <div className="empty-state-title">No QR available</div>
                <p>Once a booking is confirmed through sandbox checkout, its QR appears here automatically.</p>
              </div>
            )}
          </MotionReveal>
        )}
      </main>
    </div>
  );
}

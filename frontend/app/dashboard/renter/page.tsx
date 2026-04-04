"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";

import { clearSession, fetchBookingQr, fetchListingsByIds, fetchMe, fetchMyBookings, getAccessToken } from "@/lib/api";
import { bookingPhase, formatBookingWindow, formatCurrency, humanizeLabel, statusTone } from "@/lib/format";
import type { BookingQrResponse, BookingRead } from "@/lib/booking-types";
import type { ListingCard } from "@/lib/types";

type DashboardState = {
  bookings: BookingRead[];
  listings: Record<string, ListingCard>;
  latestQr: BookingQrResponse | null;
};

export default function RenterDashboardPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [state, setState] = useState<DashboardState>({ bookings: [], listings: {}, latestQr: null });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const sessionToken = token;

    Promise.all([fetchMe(sessionToken), fetchMyBookings(sessionToken)])
      .then(async ([user, bookings]) => {
        setUserName(user.full_name);
        const listings = await fetchListingsByIds(bookings.map((booking) => booking.listing_id));
        const latestConfirmed = bookings.find((booking) => booking.status === "confirmed");
        const latestQr = latestConfirmed ? await fetchBookingQr(latestConfirmed.id, sessionToken).catch(() => null) : null;
        setState({ bookings, listings, latestQr });
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load dashboard"));
  }, []);

  const upcomingBookings = useMemo(
    () => state.bookings.filter((booking) => ["pending", "confirmed"].includes(booking.status)).length,
    [state.bookings]
  );
  const confirmedBookings = useMemo(
    () => state.bookings.filter((booking) => booking.status === "confirmed").length,
    [state.bookings]
  );
  const totalValue = useMemo(
    () => state.bookings.reduce((sum, booking) => sum + Number(booking.total_amount ?? 0), 0),
    [state.bookings]
  );

  return (
    <main className="page page-stack">
      <section className="hero hero-copy">
        <span className="kicker">Renter cockpit</span>
        <h1 className="section-title">See every booking, route, and scan moment at a glance.</h1>
        <p className="lead">{userName ? `Signed in as ${userName}. Live renter bookings are now driving this dashboard.` : "Sign in to pull your live bookings from the backend."}</p>
        <div className="inline-actions">
          <Link className="button" href="/search">Find parking</Link>
          <button className="button-secondary" onClick={() => { clearSession(); window.location.reload(); }} type="button">Reset session</button>
        </div>
      </section>

      <section className="stats-row">
        <article className="dashboard-card"><span className="kicker">Upcoming bookings</span><div className="value">{upcomingBookings}</div><div className="footnote">Pending and confirmed reservations ready for action.</div></article>
        <article className="dashboard-card"><span className="kicker">Confirmed scans</span><div className="value">{confirmedBookings}</div><div className="footnote">Bookings that already carry QR-ready arrival confidence.</div></article>
        <article className="dashboard-card"><span className="kicker">Total booked value</span><div className="value">{formatCurrency(totalValue)}</div><div className="footnote">Cumulative renter checkout value across live bookings.</div></article>
      </section>

      <section className="dual-panel">
        <article className="panel">
          <span className="kicker">QR readiness</span>
          <h2 className="display-title">Your latest confirmed booking stays one glance away.</h2>
          {state.latestQr?.svg_data_url ? (
            <div className="qr-inline-wrap">
              <img className="qr-image" src={state.latestQr.svg_data_url} alt="Latest booking QR code" />
              <p className="subtle">Use this QR during arrival to complete the demo parking moment.</p>
            </div>
          ) : (
            <p className="lead">Once a booking is confirmed through sandbox checkout, its QR appears here automatically.</p>
          )}
        </article>
        <article className="panel">
          <span className="kicker">Live booking states</span>
          <div className="list">
            {state.bookings.length ? state.bookings.slice(0, 3).map((booking) => (
              <div className="glass-card" key={booking.id}>
                <strong>{state.listings[booking.listing_id]?.title ?? booking.listing_id}</strong>
                <div className="subtle">{bookingPhase(booking)}</div>
              </div>
            )) : <p className="subtle">No renter bookings yet. Reserve a listing to populate this feed.</p>}
          </div>
        </article>
      </section>

      <section className="panel-grid bookings-grid">
        {state.bookings.length ? state.bookings.map((booking) => {
          const listing = state.listings[booking.listing_id];
          const tone = statusTone(booking.status);
          return (
            <article className="timeline-card booking-history-card" key={booking.id}>
              <div className="dashboard-head">
                <div>
                  <span className="kicker">{humanizeLabel(booking.unit)}</span>
                  <h2 className="display-title">{listing?.title ?? "Live booking"}</h2>
                </div>
                <span className={`pill ${tone}`}>{humanizeLabel(booking.status)}</span>
              </div>
              <p className="subtle">{listing?.address ?? "Listing details loading"}</p>
              <div className="booking-summary compact-summary">
                <div className="summary-row"><span>Window</span><strong>{formatBookingWindow(booking.start_at, booking.end_at)}</strong></div>
                <div className="summary-row"><span>Total</span><strong>{formatCurrency(booking.total_amount)}</strong></div>
                <div className="summary-row"><span>State</span><strong>{bookingPhase(booking)}</strong></div>
              </div>
              <div className="inline-actions">
                <Link className="button-secondary" href={`/listings/${booking.listing_id}` as Route}>Open listing</Link>
              </div>
            </article>
          );
        }) : (
          <article className="panel">
            <span className="kicker">No bookings yet</span>
            <h2 className="display-title">Your renter history will land here.</h2>
            <p className="lead">Create a quote from any listing, complete the sandbox payment, and this page will turn into a booking ledger.</p>
          </article>
        )}
      </section>

      {error ? <article className="panel"><p className="subtle booking-error">{error}</p></article> : null}
    </main>
  );
}

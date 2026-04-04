"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";

import {
  createBooking,
  createPaymentOrder,
  fetchBookingQr,
  getAccessToken,
  quoteBooking,
  verifyPayment
} from "@/lib/api";
import {
  addHours,
  formatBookingWindow,
  formatCurrency,
  humanizeLabel,
  roundToNextHalfHour,
  toDateTimeLocalValue
} from "@/lib/format";
import type { ListingCard } from "@/lib/types";
import type { BookingQrResponse, BookingRead, BookingUnit, PaymentRead, QuoteResponse } from "@/lib/booking-types";

type BookingFlowProps = {
  listing: ListingCard;
};

function buildDemoPaymentId() {
  return `pay_demo_${Date.now().toString(36)}`;
}

function buildDemoSignature() {
  return `sig_demo_${Math.random().toString(36).slice(2, 10)}`;
}

function validateRange(startAt: string, endAt: string) {
  if (!startAt || !endAt) return "Choose both arrival and departure times.";

  const start = new Date(startAt);
  const end = new Date(endAt);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Enter a valid booking window.";
  }

  if (start < now) {
    return "Arrival must be in the future.";
  }

  if (end <= start) {
    return "Departure must be later than arrival.";
  }

  return null;
}

export function BookingFlow({ listing }: BookingFlowProps) {
  const defaultStart = useMemo(() => roundToNextHalfHour(), []);
  const defaultEnd = useMemo(() => addHours(defaultStart, 3), [defaultStart]);

  const [unit, setUnit] = useState<BookingUnit>("hourly");
  const [startAt, setStartAt] = useState(toDateTimeLocalValue(defaultStart));
  const [endAt, setEndAt] = useState(toDateTimeLocalValue(defaultEnd));
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [booking, setBooking] = useState<BookingRead | null>(null);
  const [payment, setPayment] = useState<PaymentRead | null>(null);
  const [qr, setQr] = useState<BookingQrResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"quote" | "reserve" | "payment" | null>(null);

  const returnTo = `/listings/${listing.id}`;
  const signInHref = `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}` as Route;
  const token = getAccessToken();

  async function handleQuote() {
    const validation = validateRange(startAt, endAt);
    if (validation) {
      setError(validation);
      return;
    }

    setBusy("quote");
    setError(null);
    try {
      const nextQuote = await quoteBooking({
        listing_id: listing.id,
        unit,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString()
      });
      setQuote(nextQuote);
      setBooking(null);
      setPayment(null);
      setQr(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to price this booking right now.");
    } finally {
      setBusy(null);
    }
  }

  async function handleReserve() {
    if (!token) {
      window.location.href = signInHref;
      return;
    }

    const validation = validateRange(startAt, endAt);
    if (validation) {
      setError(validation);
      return;
    }

    setBusy("reserve");
    setError(null);
    try {
      const createdBooking = await createBooking(
        {
          listing_id: listing.id,
          unit,
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString()
        },
        token
      );
      const createdPayment = await createPaymentOrder({ booking_id: createdBooking.id }, token);
      setBooking(createdBooking);
      setPayment(createdPayment);
      setQr(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't reserve this space.");
    } finally {
      setBusy(null);
    }
  }

  async function handleConfirmPayment() {
    if (!token || !booking || !payment?.provider_order_id) {
      setError("Create a booking before confirming payment.");
      return;
    }

    setBusy("payment");
    setError(null);
    try {
      const verifiedPayment = await verifyPayment(
        {
          booking_id: booking.id,
          provider_order_id: payment.provider_order_id,
          provider_payment_id: buildDemoPaymentId(),
          provider_signature: buildDemoSignature()
        },
        token
      );
      const bookingQr = await fetchBookingQr(booking.id, token);
      setPayment(verifiedPayment);
      setQr(bookingQr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sandbox payment confirmation failed.");
    } finally {
      setBusy(null);
    }
  }

  const hasValidInputs = Boolean(startAt && endAt);

  return (
    <article className="booking-card">
      <span className="kicker">Booking intelligence</span>
      <div className="display-title">{formatCurrency(listing.hourlyRate)}</div>
      <div className="subtle">per hour · {formatCurrency(listing.dailyRate)} per day</div>

      <div className="segmented-control" role="tablist" aria-label="Booking unit">
        {(["hourly", "daily"] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`segment ${unit === value ? "segment-active" : ""}`}
            onClick={() => setUnit(value)}
          >
            {humanizeLabel(value)}
          </button>
        ))}
      </div>

      <div className="field">
        <label>Arrival</label>
        <input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
      </div>
      <div className="field">
        <label>Departure</label>
        <input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} />
      </div>

      {hasValidInputs ? (
        <div className="booking-summary">
          <div className="summary-row">
            <span>Window</span>
            <strong>{formatBookingWindow(new Date(startAt).toISOString(), new Date(endAt).toISOString())}</strong>
          </div>
          <div className="summary-row">
            <span>Mode</span>
            <strong>{humanizeLabel(unit)}</strong>
          </div>
        </div>
      ) : null}

      <div className="inline-actions">
        <button className="button" type="button" onClick={handleQuote} disabled={busy !== null}>
          {busy === "quote" ? "Pricing..." : "Create quote"}
        </button>
        {token ? (
          <button
            className="button-secondary"
            type="button"
            onClick={handleReserve}
            disabled={!quote || busy !== null}
          >
            {busy === "reserve" ? "Reserving..." : "Reserve and continue"}
          </button>
        ) : (
          <Link className="button-secondary" href={signInHref}>Sign in to reserve</Link>
        )}
      </div>

      {error ? <p className="subtle booking-error">{error}</p> : null}

      {quote ? (
        <div className="booking-summary">
          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{formatCurrency(quote.subtotal_amount)}</strong>
          </div>
          <div className="summary-row">
            <span>Demand multiplier</span>
            <strong>{quote.demand_multiplier}x</strong>
          </div>
          <div className="summary-row">
            <span>Platform commission</span>
            <strong>{formatCurrency(quote.commission_amount)}</strong>
          </div>
          <div className="summary-row total-row">
            <span>Total</span>
            <strong>{formatCurrency(quote.total_amount)}</strong>
          </div>
        </div>
      ) : null}

      {booking ? (
        <div className="booking-summary">
          <div className="summary-row">
            <span>Booking created</span>
            <strong>{booking.id.slice(0, 8).toUpperCase()}</strong>
          </div>
          <div className="summary-row">
            <span>Status</span>
            <strong>{humanizeLabel(booking.status)}</strong>
          </div>
          <div className="summary-row total-row">
            <span>Total due</span>
            <strong>{formatCurrency(booking.total_amount)}</strong>
          </div>
        </div>
      ) : null}

      {payment ? (
        <div className="payment-panel">
          <div className="summary-row">
            <span>Checkout mode</span>
            <strong>{payment.is_sandbox ? "Sandbox demo" : "Live gateway"}</strong>
          </div>
          <div className="summary-row">
            <span>Order reference</span>
            <strong>{payment.provider_order_id ?? "Pending"}</strong>
          </div>
          <div className="summary-row">
            <span>Payment status</span>
            <strong>{humanizeLabel(payment.status)}</strong>
          </div>
          <button className="button" type="button" onClick={handleConfirmPayment} disabled={busy !== null}>
            {busy === "payment" ? "Confirming..." : "Confirm sandbox payment"}
          </button>
        </div>
      ) : null}

      {qr ? (
        <div className="qr-panel">
          <span className="kicker">Ready to scan</span>
          <h3 className="display-title">Booking confirmed</h3>
          <p className="lead">Your demo checkout is complete. Use this QR at arrival to validate the reservation.</p>
          {qr.svg_data_url ? <img className="qr-image" src={qr.svg_data_url} alt="Booking QR code" /> : null}
          <div className="field">
            <label>QR payload</label>
            <textarea readOnly value={qr.payload ?? "QR payload unavailable"} rows={4} />
          </div>
          <Link className="button-secondary" href="/dashboard/renter">Open renter dashboard</Link>
        </div>
      ) : null}
    </article>
  );
}

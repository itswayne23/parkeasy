import type { BookingRead } from "@/lib/booking-types";

export function formatCurrency(value: number | string) {
  const amount = typeof value === "number" ? value : Number(value);
  return `Rs ${Number.isFinite(amount) ? amount.toFixed(2).replace(/\.00$/, "") : value}`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatBookingWindow(startAt: string, endAt: string) {
  return `${formatDateTime(startAt)} - ${formatDateTime(endAt)}`;
}

export function humanizeLabel(value: string) {
  return value.replaceAll("_", " ");
}

export function statusTone(status: string) {
  switch (status) {
    case "confirmed":
    case "captured":
      return "status-good";
    case "pending":
    case "authorized":
      return "status-warn";
    case "cancelled":
    case "failed":
    case "refunded":
      return "status-bad";
    default:
      return "";
  }
}

export function roundToNextHalfHour(date = new Date()) {
  const next = new Date(date);
  next.setSeconds(0, 0);

  const minutes = next.getMinutes();
  if (minutes === 0 || minutes === 30) {
    next.setMinutes(minutes + 30);
    return next;
  }

  next.setMinutes(minutes < 30 ? 30 : 60);
  return next;
}

export function addHours(date: Date, hours: number) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

export function toDateTimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function bookingPhase(booking: BookingRead) {
  if (booking.status === "completed") return "Stay finished";
  if (booking.status === "cancelled") return "Cancelled";
  if (booking.status === "confirmed") return "Ready to scan";
  return "Awaiting payment";
}


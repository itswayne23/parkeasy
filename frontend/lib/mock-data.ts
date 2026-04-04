import type { ListingCard } from "./types";

export const platformStats = [
  { label: "Launch energy", value: "Guwahati first", note: "Designed to own a real city before scaling to noisier metros." },
  { label: "Booking speed", value: "< 20 sec", note: "Search, reserve, scan, park. No maze-like flow." },
  { label: "Supply engine", value: "P2P + Pro lots", note: "Residential novelty backed by commercial reliability." }
];

export const storyCards = [
  {
    title: "A living parking grid",
    body: "The product world should feel like a responsive city layer, not a spreadsheet of empty slots."
  },
  {
    title: "Hosts feel premium",
    body: "Hosts should see ParkEasy as a high-trust earnings console with verification, pricing intelligence, and a polished control room."
  },
  {
    title: "Renters feel momentum",
    body: "Every screen should reduce parking anxiety with strong visual hierarchy, motion cues, and fast decision support."
  }
];

export const featuredListings: ListingCard[] = [
  {
    id: "gs-road-driveway",
    title: "Glass canopy driveway near GS Road",
    hostType: "Individual host",
    address: "Christian Basti, Guwahati",
    latitude: 26.1815,
    longitude: 91.753,
    hourlyRate: 60,
    dailyRate: 420,
    tags: ["Sedan", "CCTV", "2-min walk", "QR access"],
    status: "Published"
  },
  {
    id: "paltan-bazar-lot",
    title: "High-turnover lot by Paltan Bazar",
    hostType: "Commercial host",
    address: "Paltan Bazar, Guwahati",
    latitude: 26.18,
    longitude: 91.7477,
    hourlyRate: 80,
    dailyRate: 560,
    tags: ["SUV", "Guarded", "Transit zone", "Peak pricing"],
    status: "Published"
  },
  {
    id: "zoo-road-garage",
    title: "Private garage with EV socket",
    hostType: "Individual host",
    address: "Zoo Road, Guwahati",
    latitude: 26.1542,
    longitude: 91.7803,
    hourlyRate: 75,
    dailyRate: 500,
    tags: ["Hatchback", "EV ready", "Night access", "Host approved"],
    status: "Pending review"
  }
];

export const bookingMoments = [
  { label: "Upcoming trips", value: "2 live reservations", note: "Both include QR check-in windows and host contact info." },
  { label: "Saved this month", value: "Rs 860", note: "Compared to unplanned commercial lot parking." },
  { label: "Average walk", value: "3 minutes", note: "Distance-first ranking for high-intent renters." }
];

export const hostMetrics = [
  { label: "Active listings", value: "4", note: "Two premium residential spaces, one commercial lot, one under review." },
  { label: "Gross earnings", value: "Rs 18,420", note: "Commission-first revenue engine with room for premium tiers later." },
  { label: "Conversion rate", value: "64%", note: "High because pricing and trust signals are visible early." }
];

export const adminMetrics = [
  { label: "Pending hosts", value: "8", note: "Verification queue needs fast and calm moderation tools." },
  { label: "Flagged reports", value: "3", note: "One inaccurate location, one no-show, one suspicious listing photo." },
  { label: "Weekly bookings", value: "41", note: "Good enough for market testing, still early enough to shape habits." }
];

export const searchFilters = [
  { label: "Arrival", value: "Today, 6:30 PM" },
  { label: "Duration", value: "3 hours" },
  { label: "Vehicle", value: "Sedan" },
  { label: "Radius", value: "4 km" }
];

export const trustSignals = [
  "Verified host identity",
  "Photo-backed listing proof",
  "QR-based booking validation",
  "Manual moderation queue"
];


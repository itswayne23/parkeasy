import type {
  AdminMetricResponse,
  HostMetricResponse,
  HostProfile,
  HostProfilePayload,
  ListingCard,
  ListingPayload,
  TokenPair,
  UserProfile
} from "@/lib/types";
import type {
  BookingCreateRequest,
  BookingQrResponse,
  BookingRead,
  PaymentOrderRequest,
  PaymentRead,
  PaymentVerificationRequest,
  QuoteRequest,
  QuoteResponse
} from "@/lib/booking-types";
import { featuredListings } from "@/lib/mock-data";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8001/api/v1";
const TOKEN_KEY = "parkeasy_access_token";
const REFRESH_KEY = "parkeasy_refresh_token";

interface ApiListing {
  id: string;
  title: string;
  host_type?: string;
  display_address: string;
  latitude?: number | string;
  longitude?: number | string;
  hourly_rate?: number | string;
  daily_rate?: number | string;
  amenities?: string[];
  vehicle_types?: string[];
  status?: string;
  description?: string | null;
}

interface ApiHostProfile {
  id: string;
  host_type: string;
  business_name?: string | null;
  bio?: string | null;
  approval_status: string;
  is_identity_verified?: boolean;
  photo_url?: string | null;
}

function mapListing(listing: ApiListing): ListingCard {
  return {
    id: listing.id,
    title: listing.title,
    hostType: String(listing.host_type ?? "host").replaceAll("_", " "),
    address: listing.display_address,
    latitude: Number(listing.latitude ?? 26.1824),
    longitude: Number(listing.longitude ?? 91.7510),
    hourlyRate: Number(listing.hourly_rate ?? 0),
    dailyRate: Number(listing.daily_rate ?? 0),
    tags: [...(listing.amenities ?? []), ...(listing.vehicle_types ?? [])].slice(0, 4),
    status: String(listing.status ?? "published").replaceAll("_", " "),
    description: listing.description ?? undefined
  };
}

function mapHostProfile(profile: ApiHostProfile): HostProfile {
  return {
    id: profile.id,
    host_type: profile.host_type,
    business_name: profile.business_name ?? null,
    bio: profile.bio ?? null,
    approval_status: profile.approval_status,
    is_identity_verified: Boolean(profile.is_identity_verified),
    photo_url: profile.photo_url ?? null
  };
}

async function parseError(response: Response, path: string) {
  const message = await response.text();
  try {
    const payload = JSON.parse(message) as { detail?: string };
    if (payload.detail) return payload.detail;
  } catch {
    // keep raw text fallback
  }
  return message || `API request failed for ${path}`;
}

export async function apiGet<T>(path: string, token?: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal
  });
  if (!response.ok) {
    throw new Error(await parseError(response, path));
  }
  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(await parseError(response, path));
  }
  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown, token: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(await parseError(response, path));
  }
  return response.json() as Promise<T>;
}

export async function fetchLiveListings(): Promise<ListingCard[]> {
  // Use a short timeout so the homepage renders quickly even if the backend is down.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const data = await apiGet<ApiListing[]>("/search?latitude=26.1824&longitude=91.7510&radius_km=10", undefined, controller.signal);
    if (!Array.isArray(data) || data.length === 0) {
      return featuredListings;
    }
    return data.map(mapListing);
  } catch {
    return featuredListings;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLiveListing(id: string): Promise<ListingCard> {
  try {
    const data = await apiGet<ApiListing>(`/listings/${id}`);
    return mapListing(data);
  } catch {
    return featuredListings.find((item) => item.id === id) ?? featuredListings[0];
  }
}

export async function fetchListingsByIds(ids: string[]): Promise<Record<string, ListingCard>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const entries = await Promise.all(uniqueIds.map(async (id) => [id, await fetchLiveListing(id)] as const));
  return Object.fromEntries(entries);
}

export async function loginUser(email: string, password: string): Promise<TokenPair> {
  return apiPost<TokenPair>("/auth/login", { email, password });
}

export async function signupUser(payload: {
  full_name: string;
  email: string;
  phone?: string;
  password: string;
  role: string;
}): Promise<TokenPair> {
  return apiPost<TokenPair>("/auth/signup", payload);
}

export function storeSession(tokens: TokenPair) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, tokens.access_token);
  window.localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export async function fetchMe(token: string): Promise<UserProfile> {
  return apiGet<UserProfile>("/users/me", token);
}

export async function fetchHostMetrics(token: string): Promise<HostMetricResponse> {
  return apiGet<HostMetricResponse>("/host/dashboard", token);
}

export async function fetchAdminMetrics(token: string): Promise<AdminMetricResponse> {
  return apiGet<AdminMetricResponse>("/admin/metrics", token);
}

export async function fetchMyBookings(token: string): Promise<BookingRead[]> {
  return apiGet<BookingRead[]>("/bookings/me", token);
}

export async function fetchHostProfile(token: string): Promise<HostProfile> {
  const data = await apiGet<ApiHostProfile>("/users/host-profile", token);
  return mapHostProfile(data);
}

export async function upsertHostProfile(payload: HostProfilePayload, token: string): Promise<HostProfile> {
  const data = await apiPut<ApiHostProfile>("/users/host-profile", payload, token);
  return mapHostProfile(data);
}

export async function fetchMyListings(token: string): Promise<ListingCard[]> {
  const data = await apiGet<ApiListing[]>("/listings", token);
  return data.map(mapListing);
}

export async function createListing(payload: ListingPayload, token: string): Promise<ListingCard> {
  const data = await apiPost<ApiListing>("/listings", payload, token);
  return mapListing(data);
}

export async function publishListing(listingId: string, token: string): Promise<ListingCard> {
  const data = await apiPost<ApiListing>(`/listings/${listingId}/publish`, {}, token);
  return mapListing(data);
}

export async function unpublishListing(listingId: string, token: string): Promise<ListingCard> {
  const data = await apiPost<ApiListing>(`/listings/${listingId}/unpublish`, {}, token);
  return mapListing(data);
}

export async function quoteBooking(payload: QuoteRequest): Promise<QuoteResponse> {
  return apiPost<QuoteResponse>("/bookings/quote", payload);
}

export async function createBooking(payload: BookingCreateRequest, token: string): Promise<BookingRead> {
  return apiPost<BookingRead>("/bookings", payload, token);
}

export async function createPaymentOrder(payload: PaymentOrderRequest, token: string): Promise<PaymentRead> {
  return apiPost<PaymentRead>("/payments/order", payload, token);
}

export async function verifyPayment(payload: PaymentVerificationRequest, token: string): Promise<PaymentRead> {
  return apiPost<PaymentRead>("/payments/verify", payload, token);
}

export async function fetchBookingQr(bookingId: string, token: string): Promise<BookingQrResponse> {
  return apiGet<BookingQrResponse>(`/bookings/${bookingId}/qr`, token);
}

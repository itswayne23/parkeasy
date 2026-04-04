"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  clearSession,
  createListing,
  fetchHostMetrics,
  fetchHostProfile,
  fetchMe,
  fetchMyListings,
  getAccessToken,
  publishListing,
  unpublishListing,
  upsertHostProfile
} from "@/lib/api";
import { hostMetrics } from "@/lib/mock-data";
import type { HostMetricResponse, HostProfile, ListingCard, ListingPayload } from "@/lib/types";

const parkingTypes = [
  { value: "driveway", label: "Driveway" },
  { value: "garage", label: "Garage" },
  { value: "lot", label: "Lot" },
  { value: "basement", label: "Basement" },
  { value: "street_adjacent", label: "Street adjacent" }
];

const hostTypeOptions = [
  { value: "individual_host", label: "Individual host" },
  { value: "commercial_host", label: "Commercial host" }
];

const weekdayOptions = [
  { value: "all", label: "Every day" },
  { value: "0", label: "Monday" },
  { value: "1", label: "Tuesday" },
  { value: "2", label: "Wednesday" },
  { value: "3", label: "Thursday" },
  { value: "4", label: "Friday" },
  { value: "5", label: "Saturday" },
  { value: "6", label: "Sunday" }
];

export default function HostDashboardPage() {
  const [userName, setUserName] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<HostMetricResponse | null>(null);
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [listingMessage, setListingMessage] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingListing, setSavingListing] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    host_type: "individual_host",
    business_name: "",
    bio: "",
    tax_id: "",
    photo_url: ""
  });
  const [listingForm, setListingForm] = useState({
    title: "",
    description: "",
    host_type: "individual_host",
    display_address: "",
    city: "Guwahati",
    state: "Assam",
    country: "India",
    latitude: "26.1824",
    longitude: "91.7510",
    parking_type: "driveway",
    vehicle_types: "sedan, hatchback",
    amenities: "cctv, qr access",
    photo_urls: "",
    access_instructions: "",
    hourly_rate: "60",
    daily_rate: "420",
    busy_area: false,
    space_label: "Bay A",
    space_capacity: "1",
    space_size_label: "Standard",
    space_has_ev_charger: false,
    availability_day_of_week: "all",
    availability_start_time: "00:00",
    availability_end_time: "23:59",
    min_duration_hours: "1"
  });

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    const sessionToken = token;

    async function loadHostWorkspace() {
      try {
        const [user, hostMetricsData, listingData] = await Promise.all([
          fetchMe(sessionToken),
          fetchHostMetrics(sessionToken),
          fetchMyListings(sessionToken)
        ]);

        setUserName(user.full_name);
        setMetrics(hostMetricsData);
        setListings(listingData);

        try {
          const hostProfile = await fetchHostProfile(sessionToken);
          setProfile(hostProfile);
          setProfileForm({
            host_type: hostProfile.host_type,
            business_name: hostProfile.business_name ?? "",
            bio: hostProfile.bio ?? "",
            tax_id: "",
            photo_url: hostProfile.photo_url ?? ""
          });
          setListingForm((current) => ({ ...current, host_type: hostProfile.host_type }));
        } catch {
          setProfile(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load host dashboard");
      } finally {
        setLoading(false);
      }
    }

    void loadHostWorkspace();
  }, []);

  async function reloadHostData(token: string) {
    const [hostMetricsData, listingData] = await Promise.all([fetchHostMetrics(token), fetchMyListings(token)]);
    setMetrics(hostMetricsData);
    setListings(listingData);
    try {
      const hostProfile = await fetchHostProfile(token);
      setProfile(hostProfile);
    } catch {
      setProfile(null);
    }
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      setError("Sign in to manage your host profile.");
      return;
    }

    setSavingProfile(true);
    setProfileMessage(null);
    setError(null);
    try {
      const savedProfile = await upsertHostProfile(
        {
          host_type: profileForm.host_type,
          business_name: profileForm.business_name || null,
          bio: profileForm.bio || null,
          tax_id: profileForm.tax_id || null,
          photo_url: profileForm.photo_url || null
        },
        token
      );
      setProfile(savedProfile);
      setListingForm((current) => ({ ...current, host_type: savedProfile.host_type }));
      await reloadHostData(token);
      setProfileMessage("Host profile saved. You can create and publish listings now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save host profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleListingSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      setError("Sign in to create listings.");
      return;
    }

    setSavingListing(true);
    setListingMessage(null);
    setError(null);

    const payload: ListingPayload = {
      title: listingForm.title,
      description: listingForm.description || null,
      host_type: listingForm.host_type,
      display_address: listingForm.display_address,
      city: listingForm.city,
      state: listingForm.state,
      country: listingForm.country,
      latitude: Number(listingForm.latitude),
      longitude: Number(listingForm.longitude),
      parking_type: listingForm.parking_type,
      vehicle_types: splitCsv(listingForm.vehicle_types),
      amenities: splitCsv(listingForm.amenities),
      photo_urls: splitCsv(listingForm.photo_urls),
      access_instructions: listingForm.access_instructions || null,
      hourly_rate: Number(listingForm.hourly_rate),
      daily_rate: Number(listingForm.daily_rate),
      busy_area: listingForm.busy_area,
      spaces: [
        {
          label: listingForm.space_label,
          capacity: Number(listingForm.space_capacity),
          size_label: listingForm.space_size_label || null,
          has_ev_charger: listingForm.space_has_ev_charger
        }
      ],
      availability_rules: [
        {
          day_of_week: listingForm.availability_day_of_week === "all" ? null : Number(listingForm.availability_day_of_week),
          start_time: `${listingForm.availability_start_time}:00`,
          end_time: `${listingForm.availability_end_time}:00`,
          is_available: true,
          min_duration_hours: Number(listingForm.min_duration_hours)
        }
      ]
    };

    try {
      await createListing(payload, token);
      await reloadHostData(token);
      setListingMessage("Listing created in draft mode. Publish it when the details look right.");
      setListingForm((current) => ({
        ...current,
        title: "",
        description: "",
        display_address: "",
        vehicle_types: "sedan, hatchback",
        amenities: "cctv, qr access",
        photo_urls: "",
        access_instructions: ""
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create listing");
    } finally {
      setSavingListing(false);
    }
  }

  async function handleTogglePublish(listing: ListingCard) {
    const token = getAccessToken();
    if (!token) {
      setError("Sign in to manage listings.");
      return;
    }

    setPublishingId(listing.id);
    setListingMessage(null);
    setError(null);
    try {
      if (listing.status.toLowerCase() === "published") {
        await unpublishListing(listing.id, token);
        setListingMessage(`"${listing.title}" moved back to draft.`);
      } else {
        await publishListing(listing.id, token);
        setListingMessage(`"${listing.title}" is now live.`);
      }
      await reloadHostData(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update listing status");
    } finally {
      setPublishingId(null);
    }
  }

  return (
    <main className="page page-stack">
      <section className="hero hero-copy">
        <span className="kicker">Host control room</span>
        <h1 className="section-title">Monetize idle parking with the polish of a premium revenue platform.</h1>
        <p className="lead">
          {userName
            ? `Viewing live host metrics for ${userName}.`
            : "Sign in with the seeded host account to create listings, shape pricing, and manage supply from the live backend."}
        </p>
        <div className="inline-actions">
          <Link className="button" href="/auth/sign-in">Use demo host account</Link>
          <button className="button-secondary" onClick={() => { clearSession(); window.location.reload(); }} type="button">Reset session</button>
        </div>
      </section>
      <section className="stats-row">
        {hostMetrics.map((item, index) => (
          <article className="dashboard-card" key={item.label}>
            <span className="kicker">{item.label}</span>
            <div className="value">
              {metrics
                ? index === 0
                  ? metrics.listings
                  : index === 1
                    ? `Rs ${metrics.gross_earnings}`
                    : metrics.bookings
                : item.value}
            </div>
            <div className="footnote">{item.note}</div>
          </article>
        ))}
      </section>
      <section className="dual-panel">
        <article className="command-card">
          <div className="dashboard-head">
            <div>
              <span className="kicker">Host approval</span>
              <h2 className="display-title">
                {profile ? "Your host identity is now part of the live system." : "Set up your host profile before you scale supply."}
              </h2>
            </div>
            <span className="pill">{formatLabel(metrics?.approval_status ?? "pending setup")}</span>
          </div>
          <p className="lead">
            {profile
              ? `${profile.is_identity_verified ? "Identity is verified." : "Identity verification is still pending."} Keep the profile polished so moderation and supply launch stay fast.`
              : "Create your host profile first so listing creation, moderation, and future payout flows all anchor to a real host identity."}
          </p>
        </article>
        <article className="panel">
          <span className="kicker">Supply snapshot</span>
          <div className="list">
            {listings.map((listing) => (
              <div className="glass-card" key={listing.id}>
                <strong>{listing.title}</strong>
                <div className="subtle">{listing.status} · {listing.address}</div>
              </div>
            ))}
            {!loading && listings.length === 0 ? <div className="subtle">No live host listings yet. Create your first one below.</div> : null}
          </div>
        </article>
      </section>
      <section className="split">
        <form className="form-card" onSubmit={handleProfileSubmit}>
          <div className="dashboard-head">
            <div>
              <span className="kicker">Host onboarding</span>
              <h2 className="display-title">Make your host profile real.</h2>
            </div>
            {profile ? <span className="pill">{formatLabel(profile.approval_status)}</span> : null}
          </div>
          <div className="field">
            <label>Host type</label>
            <select value={profileForm.host_type} onChange={(event) => setProfileForm({ ...profileForm, host_type: event.target.value })}>
              {hostTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="field"><label>Business name</label><input value={profileForm.business_name} onChange={(event) => setProfileForm({ ...profileForm, business_name: event.target.value })} type="text" placeholder="Optional for individual hosts" /></div>
          <div className="field"><label>Bio</label><textarea value={profileForm.bio} onChange={(event) => setProfileForm({ ...profileForm, bio: event.target.value })} rows={4} placeholder="Tell renters why your space is reliable, safe, and easy to access." /></div>
          <div className="field"><label>Tax ID</label><input value={profileForm.tax_id} onChange={(event) => setProfileForm({ ...profileForm, tax_id: event.target.value })} type="text" placeholder="Optional for now" /></div>
          <div className="field"><label>Photo URL</label><input value={profileForm.photo_url} onChange={(event) => setProfileForm({ ...profileForm, photo_url: event.target.value })} type="url" placeholder="https://example.com/host.jpg" /></div>
          {profileMessage ? <div className="subtle">{profileMessage}</div> : null}
          <div className="inline-actions">
            <button className="button" type="submit" disabled={savingProfile}>{savingProfile ? "Saving..." : profile ? "Update host profile" : "Create host profile"}</button>
          </div>
        </form>
        <form className="form-card" onSubmit={handleListingSubmit}>
          <div className="dashboard-head">
            <div>
              <span className="kicker">Create listing</span>
              <h2 className="display-title">Launch the next parking space.</h2>
            </div>
          </div>
          <div className="field"><label>Title</label><input value={listingForm.title} onChange={(event) => setListingForm({ ...listingForm, title: event.target.value })} type="text" placeholder="Glass canopy driveway near GS Road" required /></div>
          <div className="field"><label>Description</label><textarea value={listingForm.description} onChange={(event) => setListingForm({ ...listingForm, description: event.target.value })} rows={4} placeholder="Describe access, trust signals, and what makes the spot easy to choose." /></div>
          <div className="field">
            <label>Parking type</label>
            <select value={listingForm.parking_type} onChange={(event) => setListingForm({ ...listingForm, parking_type: event.target.value })}>
              {parkingTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="field"><label>Address</label><input value={listingForm.display_address} onChange={(event) => setListingForm({ ...listingForm, display_address: event.target.value })} type="text" placeholder="Christian Basti, Guwahati" required /></div>
          <div className="field"><label>City</label><input value={listingForm.city} onChange={(event) => setListingForm({ ...listingForm, city: event.target.value })} type="text" required /></div>
          <div className="field"><label>State</label><input value={listingForm.state} onChange={(event) => setListingForm({ ...listingForm, state: event.target.value })} type="text" required /></div>
          <div className="field"><label>Country</label><input value={listingForm.country} onChange={(event) => setListingForm({ ...listingForm, country: event.target.value })} type="text" required /></div>
          <div className="field"><label>Latitude</label><input value={listingForm.latitude} onChange={(event) => setListingForm({ ...listingForm, latitude: event.target.value })} type="number" step="0.0001" required /></div>
          <div className="field"><label>Longitude</label><input value={listingForm.longitude} onChange={(event) => setListingForm({ ...listingForm, longitude: event.target.value })} type="number" step="0.0001" required /></div>
          <div className="field"><label>Vehicle types</label><input value={listingForm.vehicle_types} onChange={(event) => setListingForm({ ...listingForm, vehicle_types: event.target.value })} type="text" placeholder="sedan, suv, hatchback" required /></div>
          <div className="field"><label>Amenities</label><input value={listingForm.amenities} onChange={(event) => setListingForm({ ...listingForm, amenities: event.target.value })} type="text" placeholder="cctv, covered, qr access" /></div>
          <div className="field"><label>Photo URLs</label><input value={listingForm.photo_urls} onChange={(event) => setListingForm({ ...listingForm, photo_urls: event.target.value })} type="text" placeholder="Comma-separated image URLs" /></div>
          <div className="field"><label>Access instructions</label><textarea value={listingForm.access_instructions} onChange={(event) => setListingForm({ ...listingForm, access_instructions: event.target.value })} rows={3} placeholder="Gate code, call flow, landmark cues, or QR entry notes." /></div>
          <div className="field"><label>Hourly rate (INR)</label><input value={listingForm.hourly_rate} onChange={(event) => setListingForm({ ...listingForm, hourly_rate: event.target.value })} type="number" min="0" step="1" required /></div>
          <div className="field"><label>Daily rate (INR)</label><input value={listingForm.daily_rate} onChange={(event) => setListingForm({ ...listingForm, daily_rate: event.target.value })} type="number" min="0" step="1" required /></div>
          <div className="field"><label>Space label</label><input value={listingForm.space_label} onChange={(event) => setListingForm({ ...listingForm, space_label: event.target.value })} type="text" required /></div>
          <div className="field"><label>Capacity</label><input value={listingForm.space_capacity} onChange={(event) => setListingForm({ ...listingForm, space_capacity: event.target.value })} type="number" min="1" step="1" required /></div>
          <div className="field"><label>Size label</label><input value={listingForm.space_size_label} onChange={(event) => setListingForm({ ...listingForm, space_size_label: event.target.value })} type="text" placeholder="Compact, standard, SUV-ready" /></div>
          <div className="field"><label>Availability day</label><select value={listingForm.availability_day_of_week} onChange={(event) => setListingForm({ ...listingForm, availability_day_of_week: event.target.value })}>{weekdayOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
          <div className="field"><label>Availability start</label><input value={listingForm.availability_start_time} onChange={(event) => setListingForm({ ...listingForm, availability_start_time: event.target.value })} type="time" required /></div>
          <div className="field"><label>Availability end</label><input value={listingForm.availability_end_time} onChange={(event) => setListingForm({ ...listingForm, availability_end_time: event.target.value })} type="time" required /></div>
          <div className="field"><label>Minimum duration (hours)</label><input value={listingForm.min_duration_hours} onChange={(event) => setListingForm({ ...listingForm, min_duration_hours: event.target.value })} type="number" min="1" step="1" required /></div>
          <label className="checkbox-row">
            <input checked={listingForm.space_has_ev_charger} onChange={(event) => setListingForm({ ...listingForm, space_has_ev_charger: event.target.checked })} type="checkbox" />
            <span>EV charger available</span>
          </label>
          <label className="checkbox-row">
            <input checked={listingForm.busy_area} onChange={(event) => setListingForm({ ...listingForm, busy_area: event.target.checked })} type="checkbox" />
            <span>Apply busy-area demand premium</span>
          </label>
          {listingMessage ? <div className="subtle">{listingMessage}</div> : null}
          <div className="inline-actions">
            <button className="button" type="submit" disabled={savingListing || !profile}>{savingListing ? "Creating..." : "Create listing draft"}</button>
          </div>
          {!profile ? <div className="subtle">Create the host profile first so the listing can attach to a live host account.</div> : null}
        </form>
      </section>
      <section className="panel">
        <div className="dashboard-head">
          <div>
            <span className="kicker">Listing pipeline</span>
            <h2 className="display-title">Manage draft and live inventory.</h2>
          </div>
          <span className="pill">{listings.length} listings</span>
        </div>
        <div className="list">
          {listings.map((listing) => (
            <article className="glass-card" key={listing.id}>
              <strong>{listing.title}</strong>
              <div className="subtle">{listing.hostType} · {listing.address}</div>
              <div className="subtle">Rs {listing.hourlyRate}/hr · Rs {listing.dailyRate}/day · {listing.status}</div>
              <div className="inline-actions">
                <button className="button-secondary" disabled={publishingId === listing.id} onClick={() => void handleTogglePublish(listing)} type="button">
                  {publishingId === listing.id ? "Saving..." : listing.status.toLowerCase() === "published" ? "Move to draft" : "Publish listing"}
                </button>
              </div>
            </article>
          ))}
          {!loading && listings.length === 0 ? <div className="subtle">Once you create a listing, it will appear here with a live publish toggle.</div> : null}
        </div>
      </section>
      {error ? <article className="panel"><p className="subtle">{error}</p></article> : null}
    </main>
  );
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

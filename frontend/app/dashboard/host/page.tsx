"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardMetricCard } from "@/components/dashboard-metric-card";
import { MotionReveal } from "@/components/motion-reveal";
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
  upsertHostProfile,
} from "@/lib/api";
import type { HostMetricResponse, HostProfile, ListingCard, ListingPayload } from "@/lib/types";

const parkingTypes = [
  { value: "driveway", label: "Driveway" },
  { value: "garage", label: "Garage" },
  { value: "lot", label: "Lot" },
  { value: "basement", label: "Basement" },
  { value: "street_adjacent", label: "Street adjacent" },
];

const hostTypeOptions = [
  { value: "individual_host", label: "Individual host" },
  { value: "commercial_host", label: "Commercial host" },
];

const weekdayOptions = [
  { value: "all", label: "Every day" },
  { value: "0", label: "Monday" },
  { value: "1", label: "Tuesday" },
  { value: "2", label: "Wednesday" },
  { value: "3", label: "Thursday" },
  { value: "4", label: "Friday" },
  { value: "5", label: "Saturday" },
  { value: "6", label: "Sunday" },
];

function splitCsv(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function formatLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function HostDashboard() {
  const [userName, setUserName] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<HostMetricResponse | null>(null);
  const [profile, setProfile] = useState<HostProfile | null>(null);
  const [listings, setListings] = useState<ListingCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingListing, setSavingListing] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    host_type: "individual_host",
    business_name: "",
    bio: "",
    tax_id: "",
    photo_url: "",
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
    min_duration_hours: "1",
  });

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { setLoading(false); return; }

    async function loadHostWorkspace() {
      try {
        const [user, hostMetricsData, listingData] = await Promise.all([
          fetchMe(token),
          fetchHostMetrics(token),
          fetchMyListings(token),
        ]);
        setUserName(user.full_name);
        setMetrics(hostMetricsData);
        setListings(listingData);
        try {
          const hostProfile = await fetchHostProfile(token);
          setProfile(hostProfile);
          setProfileForm({
            host_type: hostProfile.host_type,
            business_name: hostProfile.business_name ?? "",
            bio: hostProfile.bio ?? "",
            tax_id: "",
            photo_url: hostProfile.photo_url ?? "",
          });
          setListingForm((current) => ({ ...current, host_type: hostProfile.host_type }));
        } catch { setProfile(null); }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load host dashboard");
      } finally { setLoading(false); }
    }
    void loadHostWorkspace();
  }, []);

  async function reloadHostData(token: string) {
    const [hm, ld] = await Promise.all([fetchHostMetrics(token), fetchMyListings(token)]);
    setMetrics(hm);
    setListings(ld);
    try { setProfile(await fetchHostProfile(token)); } catch { setProfile(null); }
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) { setError("Sign in to manage your host profile."); return; }

    setSavingProfile(true);
    setError(null);
    try {
      const saved = await upsertHostProfile(
        {
          host_type: profileForm.host_type,
          business_name: profileForm.business_name || null,
          bio: profileForm.bio || null,
          tax_id: profileForm.tax_id || null,
          photo_url: profileForm.photo_url || null,
        },
        token,
      );
      setProfile(saved);
      await reloadHostData(token);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to save"); }
    finally { setSavingProfile(false); }
  }

  async function handleListingSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) { setError("Sign in to create listings."); return; }

    setSavingListing(true);
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
      spaces: [{
        label: listingForm.space_label,
        capacity: Number(listingForm.space_capacity),
        size_label: listingForm.space_size_label || null,
        has_ev_charger: listingForm.space_has_ev_charger,
      }],
      availability_rules: [{
        day_of_week: listingForm.availability_day_of_week === "all" ? null : Number(listingForm.availability_day_of_week),
        start_time: `${listingForm.availability_start_time}:00`,
        end_time: `${listingForm.availability_end_time}:00`,
        is_available: true,
        min_duration_hours: Number(listingForm.min_duration_hours),
      }],
    };
    try {
      await createListing(payload, token);
      await reloadHostData(token);
      setListingForm((c) => ({ ...c, title: "", description: "", display_address: "", vehicle_types: "sedan, hatchback", amenities: "cctv, qr access", photo_urls: "" }));
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to create"); }
    finally { setSavingListing(false); }
  }

  async function handleTogglePublish(listing: ListingCard) {
    const token = getAccessToken();
    if (!token) return;
    setPublishingId(listing.id);
    try {
      if (listing.status.toLowerCase() === "published") {
        await unpublishListing(listing.id, token);
      } else {
        await publishListing(listing.id, token);
      }
      await reloadHostData(token);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to update"); }
    finally { setPublishingId(null); }
  }

  if (loading) {
    return (
      <div className="dashboard-shell">
        <DashboardSidebar type="host" userName="Host" />
        <main className="dash-main"><p className="subtle">Loading...</p></main>
      </div>
    );
  }

  if (!getAccessToken()) {
    return (
      <div className="dashboard-shell">
        <DashboardSidebar type="host" userName="Host" />
        <main className="dash-main">
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <div className="empty-state-title">Sign in required</div>
            <p>Please sign in to access your host dashboard.</p>
            <Link className="button" href="/auth/sign-in">Sign in</Link>
          </div>
        </main>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "listings", label: "Listings" },
    { id: "create", label: "Create listing" },
    { id: "bookings", label: "Bookings" },
    { id: "earnings", label: "Earnings" },
  ];

  return (
    <div className="dashboard-shell">
      <DashboardSidebar type="host" userName={userName ?? "Host"} />
      <main className="dash-main">
        <div className="dash-header">
          <h1 className="dash-title">Host Console</h1>
          <p className="subtle">Monetize idle parking with a premium revenue platform</p>
        </div>

        <div className="card-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`card-tab ${tab === t.id ? "card-tab-active" : ""}`}
              onClick={() => setTab(t.id)}
            >
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
              <DashboardMetricCard label="Active listings" value={metrics?.listings ?? 0} change={5} footnote="Published spaces" />
              <DashboardMetricCard label="Gross earnings" value={`Rs ${metrics?.gross_earnings ?? "0"}`} change={12} footnote="Commission-first revenue" />
              <DashboardMetricCard label="Conversion rate" value={`${metrics?.bookings ?? "%0"}%`} change={3} footnote="From listing to booking" />
              <DashboardMetricCard label="Approval" value={formatLabel(profile?.approval_status ?? "pending")} footnote="Host identity status" />
            </div>

            <div className="quick-actions">
              <button className="quick-action" onClick={() => setTab("create")}>
                <span className="quick-action-icon">➕</span>Create listing
              </button>
              <button className="quick-action" onClick={() => setTab("listings")}>
                <span className="quick-action-icon">📋</span>View listings
              </button>
              <button className="quick-action" onClick={() => setTab("earnings")}>
                <span className="quick-action-icon">💰</span>Earnings
              </button>
              <Link className="quick-action" href={`/dashboard/host`}>
                <span className="quick-action-icon">📅</span>All bookings
              </Link>
            </div>

            <MotionReveal>
              <div className="data-table-wrap">
                <div className="data-table-header">
                  <h3>Your Listings</h3>
                  <span className="status-badge status-badge-active">{listings.length} total</span>
                </div>
                {listings.length === 0 ? (
                  <div style={{ padding: "2.5rem", textAlign: "center" }}>
                    <div className="empty-state">
                      <div className="empty-state-icon">🏠</div>
                      <div className="empty-state-title">No listings yet</div>
                      <p>Create your first listing to start earning from your parking space.</p>
                      <button className="button" onClick={() => setTab("create")}>Create listing</button>
                    </div>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Type</th>
                        <th>Rate/hr</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map((l) => (
                        <tr key={l.id}>
                          <td><strong style={{ color: "var(--text)" }}>{l.title}</strong></td>
                          <td>{l.hostType}</td>
                          <td>Rs {l.hourlyRate}</td>
                          <td>
                            <span className={`status-badge status-badge-${l.status.toLowerCase() === "published" ? "published" : "draft"}`}>
                              {l.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="nav-pill"
                              disabled={publishingId === l.id}
                              onClick={() => handleTogglePublish(l)}
                            >
                              {publishingId === l.id ? "..." : l.status.toLowerCase() === "published" ? "Unpublish" : "Publish"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </MotionReveal>
          </>
        )}

        {tab === "listings" && (
          <>
            <MotionReveal>
              <div className="data-table-wrap">
                <div className="data-table-header">
                  <h3>Listing Pipeline</h3>
                  <span className="status-badge status-badge-active">{listings.length} listings</span>
                </div>
                {listings.length === 0 ? (
                  <div style={{ padding: "2.5rem", textAlign: "center" }}>
                    <div className="empty-state">
                      <div className="empty-state-icon">📋</div>
                      <div className="empty-state-title">No listings found</div>
                      <p>Once you create a listing, it will appear here with a live publish toggle.</p>
                    </div>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Host</th>
                        <th>Location</th>
                        <th>Rate/hr</th>
                        <th>Rate/day</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map((l) => (
                        <tr key={l.id}>
                          <td><strong style={{ color: "var(--text)" }}>{l.title}</strong></td>
                          <td>{l.hostType}</td>
                          <td>{l.address}</td>
                          <td>Rs {l.hourlyRate}</td>
                          <td>Rs {l.dailyRate}</td>
                          <td>
                            <span className={`status-badge status-badge-${l.status.toLowerCase() === "published" ? "published" : "draft"}`}>
                              {l.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="nav-pill"
                              disabled={publishingId === l.id}
                              onClick={() => handleTogglePublish(l)}
                            >
                              {publishingId === l.id ? "..." : l.status.toLowerCase() === "published" ? "Unpublish" : "Publish"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </MotionReveal>
          </>
        )}

        {tab === "create" && (
          <MotionReveal>
            <form className="form-card" onSubmit={handleListingSubmit}>
              <h2 className="display-title">Create a new listing</h2>
              <p className="subtle">Launch the next parking space and attach it to your host profile.</p>
              <div className="field"><label>Title</label><input value={listingForm.title} onChange={(e) => setListingForm({ ...listingForm, title: e.target.value })} type="text" placeholder="Glass canopy driveway near GS Road" required /></div>
              <div className="field"><label>Description</label><textarea value={listingForm.description} onChange={(e) => setListingForm({ ...listingForm, description: e.target.value })} rows={4} placeholder="Describe access, trust signals, and what makes the spot easy to choose." /></div>
              <div className="field"><label>Parking type</label><select value={listingForm.parking_type} onChange={(e) => setListingForm({ ...listingForm, parking_type: e.target.value })}>{parkingTypes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
              <div className="field"><label>Address</label><input value={listingForm.display_address} onChange={(e) => setListingForm({ ...listingForm, display_address: e.target.value })} type="text" placeholder="Christian Basti, Guwahati" required /></div>
              <div className="field"><label>City</label><input value={listingForm.city} onChange={(e) => setListingForm({ ...listingForm, city: e.target.value })} type="text" required /></div>
              <div className="field"><label>State</label><input value={listingForm.state} onChange={(e) => setListingForm({ ...listingForm, state: e.target.value })} type="text" required /></div>
              <div className="field"><label>Latitude</label><input value={listingForm.latitude} onChange={(e) => setListingForm({ ...listingForm, latitude: e.target.value })} type="number" step="0.0001" required /></div>
              <div className="field"><label>Longitude</label><input value={listingForm.longitude} onChange={(e) => setListingForm({ ...listingForm, longitude: e.target.value })} type="number" step="0.0001" required /></div>
              <div className="field"><label>Vehicle types</label><input value={listingForm.vehicle_types} onChange={(e) => setListingForm({ ...listingForm, vehicle_types: e.target.value })} type="text" placeholder="sedan, suv, hatchback" required /></div>
              <div className="field"><label>Amenities</label><input value={listingForm.amenities} onChange={(e) => setListingForm({ ...listingForm, amenities: e.target.value })} type="text" placeholder="cctv, covered, qr access" /></div>
              <div className="field"><label>Hourly rate (INR)</label><input value={listingForm.hourly_rate} onChange={(e) => setListingForm({ ...listingForm, hourly_rate: e.target.value })} type="number" min="0" step="1" required /></div>
              <div className="field"><label>Daily rate (INR)</label><input value={listingForm.daily_rate} onChange={(e) => setListingForm({ ...listingForm, daily_rate: e.target.value })} type="number" min="0" step="1" required /></div>
              <div className="field"><label>Space label</label><input value={listingForm.space_label} onChange={(e) => setListingForm({ ...listingForm, space_label: e.target.value })} type="text" required /></div>
              <div className="field"><label>Capacity</label><input value={listingForm.space_capacity} onChange={(e) => setListingForm({ ...listingForm, space_capacity: e.target.value })} type="number" min="1" step="1" required /></div>
              <div className="field"><label>Availability start</label><input value={listingForm.availability_start_time} onChange={(e) => setListingForm({ ...listingForm, availability_start_time: e.target.value })} type="time" required /></div>
              <div className="field"><label>Availability end</label><input value={listingForm.availability_end_time} onChange={(e) => setListingForm({ ...listingForm, availability_end_time: e.target.value })} type="time" required /></div>
              <label className="checkbox-row"><input checked={listingForm.space_has_ev_charger} onChange={(e) => setListingForm({ ...listingForm, space_has_ev_charger: e.target.checked })} type="checkbox" /><span>EV charger</span></label>
              <label className="checkbox-row"><input checked={listingForm.busy_area} onChange={(e) => setListingForm({ ...listingForm, busy_area: e.target.checked })} type="checkbox" /><span>Apply busy-area premium</span></label>
              <div className="inline-actions">
                <button className="button" type="submit" disabled={savingListing || !profile}>{savingListing ? "Creating..." : "Create listing"}</button>
              </div>
              {!profile && <div className="subtle">⚠️ Create the host profile first so the listing can attach to a live host account.</div>}
            </form>
          </MotionReveal>
        )}

        {tab === "bookings" && (
          <MotionReveal>
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">No bookings yet</div>
              <p>Once someone books your space, you will see all reservations here with full details.</p>
            </div>
          </MotionReveal>
        )}

        {tab === "earnings" && (
          <MotionReveal>
            <div className="dash-metrics" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <DashboardMetricCard label="Gross earnings" value={`Rs ${metrics?.gross_earnings ?? "0"}`} footnote="Total before commission" />
              <DashboardMetricCard label="Commission (12%)" value={`Rs ${((Number(metrics?.gross_earnings ?? 0) * 0.12).toFixed(2))}`} footnote="Platform commission" />
              <DashboardMetricCard label="Net earnings" value={`Rs ${((Number(metrics?.gross_earnings ?? 0) * 0.88).toFixed(2))}`} footnote="After commission" />
            </div>
          </MotionReveal>
        )}
      </main>
    </div>
  );
}

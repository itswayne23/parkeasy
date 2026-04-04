"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { clearSession, fetchAdminMetrics, getAccessToken } from "@/lib/api";
import { featuredListings } from "@/lib/mock-data";
import type { AdminMetricResponse } from "@/lib/types";

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<AdminMetricResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const sessionToken = token;
    fetchAdminMetrics(sessionToken)
      .then(setMetrics)
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to load admin dashboard"));
  }, []);

  return (
    <main className="page page-stack">
      <section className="hero hero-copy">
        <span className="kicker">Trust operations</span>
        <h1 className="section-title">Moderate growth without killing momentum.</h1>
        <p className="lead">Sign in with `admin@parkeasyapp.com` and password `parkeasy123` to see live admin metrics.</p>
        <div className="inline-actions">
          <Link className="button" href="/auth/sign-in">Use demo admin account</Link>
          <button className="button-secondary" onClick={() => { clearSession(); window.location.reload(); }} type="button">Reset session</button>
        </div>
      </section>
      <section className="stats-row">
        <article className="dashboard-card"><span className="kicker">Users</span><div className="value">{metrics?.users ?? 0}</div><div className="footnote">Registered platform accounts</div></article>
        <article className="dashboard-card"><span className="kicker">Pending hosts</span><div className="value">{metrics?.pending_hosts ?? 0}</div><div className="footnote">Verification queue needing ops attention</div></article>
        <article className="dashboard-card"><span className="kicker">Flagged reports</span><div className="value">{metrics?.flagged_reports ?? 0}</div><div className="footnote">Issues requiring moderation review</div></article>
      </section>
      <section className="panel-grid">
        {featuredListings.map((listing) => (
          <article className="timeline-card" key={listing.id}>
            <span className="kicker">Moderation queue</span>
            <h2 className="display-title">{listing.title}</h2>
            <p className="subtle">{listing.address}</p>
            <div className="inline-actions">
              <span className="pill">Approve</span>
              <span className="pill">Need review</span>
            </div>
          </article>
        ))}
      </section>
      {error ? <article className="panel"><p className="subtle">{error}</p></article> : null}
    </main>
  );
}

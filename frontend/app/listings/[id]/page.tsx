import Link from "next/link";

import { BookingFlow } from "@/components/booking-flow";
import { MotionReveal } from "@/components/motion-reveal";
import { fetchLiveListing } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await fetchLiveListing(id);

  return (
    <main className="page page-stack">
      <section className="detail-grid">
        <MotionReveal>
          <article className="hero detail-hero hero-copy">
            <span className="kicker">{listing.hostType}</span>
            <h1 className="section-title">{listing.title}</h1>
            <p className="lead">
              {listing.description ?? `${listing.address}.`} ParkEasy now carries this listing through live quote,
              booking, sandbox payment confirmation, and QR-ready arrival.
            </p>
            <div className="tag-row">{listing.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
            <div className="inline-actions">
              <Link className="button" href="/search">Back to discovery</Link>
              <Link className="button-secondary" href="/dashboard/renter">View renter dashboard</Link>
            </div>
          </article>
        </MotionReveal>
        <MotionReveal delay={0.1}>
          <BookingFlow listing={listing} />
        </MotionReveal>
      </section>

      <section className="dual-panel">
        <MotionReveal>
          <article className="panel">
            <span className="kicker">Trust architecture</span>
            <h2 className="display-title">A booking rail that earns confidence fast.</h2>
            <div className="list">
              {[
                "Verified host identity",
                "Photo-backed listing proof",
                "QR-based booking validation",
                "Transparent pricing breakdown"
              ].map((signal) => (
                <div className="glass-card" key={signal}>
                  <strong>{signal}</strong>
                  <div className="subtle">Visible trust signals reduce hesitation and keep the booking path crisp.</div>
                </div>
              ))}
            </div>
          </article>
        </MotionReveal>
        <MotionReveal delay={0.08}>
          <article className="panel">
            <span className="kicker">Experience detail</span>
            <h2 className="display-title">What makes this listing premium</h2>
            <div className="list">
              <div className="timeline-card">
                <strong>Arrival choreography</strong>
                <div className="subtle">Live timing defaults keep the flow fast for high-intent renters.</div>
              </div>
              <div className="timeline-card">
                <strong>Payment confidence</strong>
                <div className="subtle">Demo checkout stays explicit with sandbox labeling and no surprise math.</div>
              </div>
              <div className="timeline-card">
                <strong>Value snapshot</strong>
                <div className="subtle">{formatCurrency(listing.hourlyRate)} hourly · {formatCurrency(listing.dailyRate)} daily at {listing.address}.</div>
              </div>
            </div>
          </article>
        </MotionReveal>
      </section>
    </main>
  );
}


import Link from "next/link";

import { HeroScene } from "@/components/hero-scene";
import { MotionReveal } from "@/components/motion-reveal";
import { fetchLiveListings } from "@/lib/api";
import { platformStats, storyCards, trustSignals } from "@/lib/mock-data";

export default async function HomePage() {
  const listings = await fetchLiveListings();

  return (
    <main className="page page-stack">
      <section className="hero-grid">
        <MotionReveal>
          <article className="hero hero-copy">
            <span className="kicker">Future of urban parking</span>
            <h1 className="hero-title">A living parking network for modern cities.</h1>
            <p className="lead">
              ParkEasy feels like a responsive city layer: immersive, high-trust, and alive with movement.
              Residential driveways, operator lots, QR entry moments, and host earnings all live inside one premium product world.
            </p>
            <div className="actions">
              <Link className="button" href="/search">Launch the experience</Link>
              <Link className="button-secondary" href="/dashboard/host">See host control room</Link>
            </div>
            <div className="metric-tags">
              {trustSignals.map((signal) => (
                <span className="tag" key={signal}>{signal}</span>
              ))}
            </div>
          </article>
        </MotionReveal>

        <MotionReveal delay={0.12}>
          <article className="hero hero-visual">
            <HeroScene />
          </article>
        </MotionReveal>
      </section>

      <section className="stats-row">
        {platformStats.map((item, index) => (
          <MotionReveal key={item.label} delay={0.08 * index}>
            <article className="metric-card">
              <span className="kicker">{item.label}</span>
              <div className="value">{item.value}</div>
              <div className="footnote">{item.note}</div>
            </article>
          </MotionReveal>
        ))}
      </section>

      <section className="panel-grid">
        {storyCards.map((card, index) => (
          <MotionReveal key={card.title} delay={0.1 * index}>
            <article className="story-card">
              <span className="kicker">Design intent</span>
              <h2 className="display-title">{card.title}</h2>
              <p className="lead">{card.body}</p>
            </article>
          </MotionReveal>
        ))}
      </section>

      <section className="dual-panel">
        <MotionReveal>
          <article className="panel">
            <span className="kicker">Curated supply</span>
            <h2 className="section-title">Listings that feel premium before the booking even starts.</h2>
            <p className="lead">Each card balances desire with clarity: trust, pricing, context, and frictionless action without overwhelming the user.</p>
          </article>
        </MotionReveal>
        <MotionReveal delay={0.08}>
          <article className="panel">
            <span className="kicker">Interaction model</span>
            <h2 className="section-title">Scroll choreography that guides, not distracts.</h2>
            <p className="lead">Motion, depth, and 3D are all used to raise confidence and attention while keeping the booking path fast.</p>
          </article>
        </MotionReveal>
      </section>

      <section className="card-row">
        {listings.map((listing, index) => (
          <MotionReveal key={listing.id} delay={0.08 * index}>
            <article className="listing-card">
              <div className="listing-top">
                <div>
                  <span className="kicker">{listing.hostType}</span>
                  <h3 className="display-title">{listing.title}</h3>
                </div>
                <span className="pill">{listing.status}</span>
              </div>
              <p className="subtle">{listing.address}</p>
              <div className="listing-price">Rs {listing.hourlyRate}</div>
              <div className="subtle">per hour · Rs {listing.dailyRate} per day</div>
              <div className="tag-row">
                {(listing.tags.length ? listing.tags : ["Verified", "Prime location"]).map((tag) => (
                  <span className="tag" key={tag}>{tag}</span>
                ))}
              </div>
              <div className="inline-actions">
                <Link className="button" href={`/listings/${listing.id}`}>Open listing</Link>
              </div>
            </article>
          </MotionReveal>
        ))}
      </section>
    </main>
  );
}
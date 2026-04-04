import Link from "next/link";

import { MotionReveal } from "@/components/motion-reveal";
import { SearchMap } from "@/components/search-map";
import { fetchLiveListings } from "@/lib/api";
import { searchFilters, trustSignals } from "@/lib/mock-data";

export default async function SearchPage() {
  const listings = await fetchLiveListings();

  return (
    <main className="page page-stack">
      <section className="search-grid">
        <MotionReveal>
          <article className="command-card">
            <span className="kicker">Discovery command</span>
            <h1 className="section-title">Search that behaves like a living map.</h1>
            <p className="lead">Now wired to the backend search API with Guwahati defaults, while preserving a premium visual rhythm and high-intent decision flow.</p>
            <div className="control-row">
              {searchFilters.map((filter) => (
                <div className="filter-pill" key={filter.label}>
                  <span className="kicker">{filter.label}</span>
                  <strong>{filter.value}</strong>
                </div>
              ))}
            </div>
            <div className="tag-row">
              {trustSignals.map((signal) => <span className="tag" key={signal}>{signal}</span>)}
            </div>
          </article>
        </MotionReveal>
        <MotionReveal delay={0.12}>
          <SearchMap listings={listings} />
        </MotionReveal>
      </section>

      <section className="card-row">
        {listings.map((listing, index) => (
          <MotionReveal key={listing.id} delay={0.08 * index}>
            <article className="listing-card">
              <div className="listing-top">
                <div>
                  <span className="kicker">{listing.hostType}</span>
                  <h2 className="display-title">{listing.title}</h2>
                </div>
                <span className="pill">{listing.status}</span>
              </div>
              <p className="subtle">{listing.address}</p>
              <div className="listing-bottom">
                <div>
                  <div className="listing-price">Rs {listing.hourlyRate}</div>
                  <div className="subtle">hourly · Rs {listing.dailyRate} daily</div>
                </div>
                <Link className="button" href={`/listings/${listing.id}`}>Inspect</Link>
              </div>
              <div className="tag-row">{listing.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
            </article>
          </MotionReveal>
        ))}
      </section>
    </main>
  );
}


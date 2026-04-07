import { HeroSection } from "@/components/hero-section";
import { HowItWorks } from "@/components/how-it-works";
import { BentoFeatures } from "@/components/bento-features";
import { Testimonials } from "@/components/testimonials";
import { PricingSection } from "@/components/pricing-section";
import { FAQSection } from "@/components/faq-section";
import { CTASection } from "@/components/cta-section";
import { MotionReveal } from "@/components/motion-reveal";
import { fetchLiveListings } from "@/lib/api";

export default async function HomePage() {
  const listings = await fetchLiveListings();

  return (
    <main className="page page-stack">
      <HeroSection />
      <HowItWorks />
      <BentoFeatures />

      {/* Featured Listings Carousel */}
      <section className="section-pad">
        <MotionReveal>
          <div className="section-header">
            <span className="kicker">Featured listings</span>
            <h2 className="section-title">Curated supply near you.</h2>
          </div>
        </MotionReveal>
        <div className="card-row">
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
                  <a className="button" href={`/listings/${listing.id}`}>Open listing</a>
                </div>
              </article>
            </MotionReveal>
          ))}
        </div>
      </section>

      <Testimonials />
      <PricingSection />
      <FAQSection />
      <CTASection />
    </main>
  );
}

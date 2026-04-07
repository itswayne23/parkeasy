"use client";

import Link from "next/link";
import { MotionReveal } from "@/components/motion-reveal";

export function CTASection() {
  return (
    <section className="cta-section">
      <MotionReveal>
        <span className="kicker">Ready to start?</span>
      </MotionReveal>
      <MotionReveal>
        <h2 className="section-title">Park smarter from your very first search.</h2>
      </MotionReveal>
      <MotionReveal>
        <p className="lead" style={{ margin: "0 auto 2rem" }}>
          Join the parking network that puts confidence before convenience, and design before data entry.
        </p>
      </MotionReveal>
      <MotionReveal>
        <div className="cta-actions">
          <Link className="button" href="/search">Launch the experience</Link>
          <Link className="button-secondary" href="/dashboard/host">Become a host</Link>
        </div>
      </MotionReveal>
    </section>
  );
}

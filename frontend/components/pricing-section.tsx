"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MotionReveal } from "@/components/motion-reveal";

const plans = [
  {
    name: "Renter",
    price: "Free",
    period: "always",
    description: "Find and book parking spots near any destination.",
    features: [
      "Search by location & filters",
      "Instant booking with QR check-in",
      "Booking history & receipts",
      "Leave reviews for hosts",
      "Save favorite places",
    ],
    cta: "Start exploring",
    href: "/search",
    variant: "default",
  },
  {
    name: "Host",
    price: "12%",
    period: "platform commission",
    description: "Turn idle parking into recurring income with a premium console.",
    features: [
      "Create & manage listings",
      "Dynamic pricing with demand multipliers",
      "Host dashboard with earnings tracking",
      "QR code auto-generation",
      "Host approval & identity verification",
    ],
    cta: "Become a host",
    href: "/dashboard/host",
    variant: "featured",
  },
  {
    name: "Operator",
    price: "Custom",
    period: "volume pricing",
    description: "Commercial parking operators with multi-lot management.",
    features: [
      "Multiple lot management",
      "Bulk listing import",
      "Advanced analytics & reports",
      "Staff access & permissions",
      "Priority moderation queue",
    ],
    cta: "Contact sales",
    href: "/auth/sign-in",
    variant: "default",
  },
];

export function PricingSection() {
  return (
    <section className="section-pad">
      <MotionReveal>
        <div className="section-header">
          <span className="kicker">Pricing</span>
          <h2 className="section-title">Simple, transparent pricing.</h2>
          <p className="lead muted">Renters always use the platform free. Hosts pay a single commission only on completed bookings.</p>
        </div>
      </MotionReveal>

      <div className="pricing-grid">
        {plans.map((plan, i) => (
          <MotionReveal key={plan.name} delay={0.1 * i}>
            <motion.div
              className={`plan-card ${plan.variant === "featured" ? "plan-featured" : ""}`}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              {plan.variant === "featured" && (
                <span className="plan-badge">Most popular</span>
              )}
              <h3 className="plan-name">{plan.name}</h3>
              <div className="plan-price">{plan.price}</div>
              <div className="plan-period muted">{plan.period}</div>
              <p className="subtle plan-desc">{plan.description}</p>
              <ul className="plan-features">
                {plan.features.map((f) => (
                  <li key={f}>
                    <span className="plan-check" aria-hidden="true">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link className={plan.variant === "featured" ? "button" : "button-secondary"} href={plan.href}>
                {plan.cta}
              </Link>
            </motion.div>
          </MotionReveal>
        ))}
      </div>
    </section>
  );
}

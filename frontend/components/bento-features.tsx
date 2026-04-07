"use client";

import { motion } from "framer-motion";
import { MotionReveal } from "@/components/motion-reveal";

const features = [
  {
    title: "Dynamic pricing engine",
    body: "Hourly, daily, and demand-aware pricing adjusts in real-time so hosts earn fairly and renters always see transparent costs.",
    icon: "⚡",
    size: "wide",
  },
  {
    title: "Instant QR check-in",
    body: "One scan, no waiting. Renters show a code, hosts validate access.",
    icon: "📱",
    size: "normal",
  },
  {
    title: "Host verification",
    body: "Identity-verified hosts with approval queues keep supply safe and trustworthy.",
    icon: "🛡️",
    size: "normal",
  },
  {
    title: "Live map exploration",
    body: "Discover parking visually with MapLibre, real-time markers, and distance-first ranking.",
    icon: "🗺️",
    size: "wide",
  },
  {
    title: "P2P & commercial",
    body: "Residential driveways and operator lots coexist in one layered experience.",
    icon: "🏘️",
    size: "normal",
  },
  {
    title: "Razorpay integration",
    body: "Secure payments with signature verification, sandbox support, and instant payment order creation for bookings.",
    icon: "💳",
    size: "wide",
  },
];

export function BentoFeatures() {
  return (
    <section className="section-pad">
      <MotionReveal>
        <div className="section-header">
          <span className="kicker">Platform features</span>
          <h2 className="section-title">Built to own a real city before scaling.</h2>
        </div>
      </MotionReveal>

      <div className="bento-grid">
        {features.map((f, i) => (
          <MotionReveal key={f.title} delay={0.08 * i}>
            <motion.div
              className={`bento-card ${f.size === "wide" ? "bento-wide" : ""}`}
              whileHover={{ y: -2, scale: 1.01, transition: { duration: 0.2 } }}
            >
              <span className="bento-icon" aria-hidden="true">{f.icon}</span>
              <h3 className="bento-title">{f.title}</h3>
              <p className="subtle bento-desc">{f.body}</p>
            </motion.div>
          </MotionReveal>
        ))}
      </div>
    </section>
  );
}

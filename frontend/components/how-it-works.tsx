"use client";

import { motion } from "framer-motion";
import { MotionReveal } from "@/components/motion-reveal";

const steps = [
  {
    step: "01",
    icon: "🔍",
    title: "Find a spot",
    description: "Search nearby locations on the map. Filter by price, distance, vehicle type, or availability. The map highlights real-time open spots."
  },
  {
    step: "02",
    icon: "📅",
    title: "Book instantly",
    description: "Select your time window, get a transparent price breakdown with commission and demand multipliers clearly shown. No hidden fees."
  },
  {
    step: "03",
    icon: "📱",
    title: "Scan & park",
    description: "Arrive at the location. Present the QR code on your phone. The host's gate or attendant scans it and you're in — no cash, no fumbling."
  },
  {
    step: "04",
    icon: "🏁",
    title: "Check out & review",
    description: "When you leave, check out with one tap. Leave a review to help future renters and earn trust in the community."
  },
];

export function HowItWorks() {
  return (
    <section className="section-pad">
      <MotionReveal>
        <div className="section-header">
          <span className="kicker">How it works</span>
          <h2 className="section-title">From search to parked in minutes.</h2>
          <p className="lead muted">Four steps that feel natural on mobile or desktop, with real-time availability and cashless payments baked in.</p>
        </div>
      </MotionReveal>

      <div className="steps-grid">
        {steps.map((s, i) => (
          <MotionReveal key={s.step} delay={0.1 * i}>
            <motion.div
              className="step-card"
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
            >
              <span className="step-number">{s.step}</span>
              <span className="step-icon" aria-hidden="true">{s.icon}</span>
              <h3 className="display-title step-title">{s.title}</h3>
              <p className="subtle">{s.description}</p>
            </motion.div>
          </MotionReveal>
        ))}
      </div>
    </section>
  );
}

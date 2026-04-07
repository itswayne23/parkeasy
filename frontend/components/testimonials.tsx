"use client";

import { motion } from "framer-motion";
import { MotionReveal } from "@/components/motion-reveal";
import { useState } from "react";

const testimonials = [
  {
    quote: "Found a driveway three minutes from the concert venue. Scanned a code, walked in. No cash, no hassle.",
    name: "Riya D.",
    role: "Weekly renter, Guwahati",
    avatar: "RD",
  },
  {
    quote: "My driveway makes money while I'm at office. The dashboard is clean and I can see every booking in one screen.",
    name: "Aarav M.",
    role: "Host, Christian Basti",
    avatar: "AM",
  },
  {
    quote: "As a lot operator, ParkEasy gave us a digital front we never had. The commission model is fair and transparent.",
    name: "CityLot Operator",
    role: "Commercial host, Paltan Bazar",
    avatar: "CL",
  },
];

export function Testimonials() {
  const [active, setActive] = useState(0);

  return (
    <section className="section-pad">
      <MotionReveal>
        <div className="section-header">
          <span className="kicker">Community</span>
          <h2 className="section-title">Trusted by renters and hosts.</h2>
        </div>
      </MotionReveal>

      <div className="testimonial-carousel">
        <div className="testimonial-track">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              className={`testimonial-card ${i === active ? "testimonial-active" : ""}`}
              onClick={() => setActive(i)}
              whileHover={{ scale: 1.02 }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") setActive(i); }}
              aria-label={`Read review from ${t.name}`}
            >
              <div className="testimonial-head">
                <div className="testimonial-avatar">{t.avatar}</div>
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-role">{t.role}</div>
                </div>
              </div>
              <p className="testimonial-quote">"{t.quote}"</p>
            </motion.div>
          ))}
        </div>
        <div className="testimonial-dots">
          {testimonials.map((_, i) => (
            <button
              key={i}
              className={`testimonial-dot ${i === active ? "testimonial-dot-active" : ""}`}
              onClick={() => setActive(i)}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

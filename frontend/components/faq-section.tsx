"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MotionReveal } from "@/components/motion-reveal";
import { useState } from "react";

const faqs = [
  {
    q: "Is ParkEasy free to use?",
    a: "Finding and browsing parking spots is completely free for renters. You only pay when you book a spot, with transparent pricing shown upfront.",
  },
  {
    q: "How does payment work?",
    a: "Payments are processed through Razorpay. You can pay securely with UPI, cards, net banking, or wallets. Sandbox mode is available during testing.",
  },
  {
    q: "How do I host my parking spot?",
    a: "Create an account, set up a host profile, and list your parking space. After identity verification, your listing goes live and renters can book it instantly.",
  },
  {
    q: "What happens if a renter doesn't show up?",
    a: "Each booking generates a unique QR code with a 2-hour check-in window. If the renter doesn't check in within that window, the booking can be cancelled by the host.",
  },
  {
    q: "Is ParkEasy only for Guwahati?",
    a: "We're launching in Guwahati first to prove the concept in a real city with real demand. We're designed to scale to noisier metros once the model is proven.",
  },
  {
    q: "What commission does ParkEasy charge?",
    a: "Hosts pay a 12% platform commission on completed bookings. This covers payment processing, moderation, verification, and platform maintenance.",
  },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="section-pad">
      <MotionReveal>
        <div className="section-header">
          <span className="kicker">FAQ</span>
          <h2 className="section-title">Questions? We have answers.</h2>
        </div>
      </MotionReveal>

      <div className="faq-list">
        {faqs.map((faq, i) => (
          <MotionReveal key={i} delay={0.05 * i}>
            <motion.div className="faq-item" onClick={() => setOpen(open === i ? null : i)}>
              <div className="faq-question">
                <span>{faq.q}</span>
                <span className={`faq-chevron ${open === i ? "faq-open" : ""}`} aria-hidden="true">
                  {open === i ? "−" : "+"}
                </span>
              </div>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    className="faq-answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="subtle">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </MotionReveal>
        ))}
      </div>
    </section>
  );
}

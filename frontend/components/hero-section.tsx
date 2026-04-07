"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HeroScene } from "@/components/hero-scene";
import { MotionReveal } from "@/components/motion-reveal";
import { trustSignals } from "@/lib/mock-data";

const container = {
  visible: { transition: { staggerChildren: 0.12 } },
};

export function HeroSection() {
  return (
    <section className="hero-grid">
      <motion.article
        className="hero hero-copy"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        <MotionReveal>
          <span className="kicker">Future of urban parking</span>
        </MotionReveal>
        <MotionReveal>
          <h1 className="hero-title">A living parking network for modern cities.</h1>
        </MotionReveal>
        <MotionReveal>
          <p className="lead">
            ParkEasy is a responsive city layer: immersive, high-trust, and alive with movement.
            Residential driveways, operator lots, QR entry, and host earnings all live inside one premium product world.
          </p>
        </MotionReveal>
        <MotionReveal>
          <div className="actions">
            <Link className="button" href="/search">Launch the experience</Link>
            <Link className="button-secondary" href="/dashboard/host">See host console</Link>
          </div>
        </MotionReveal>
        <MotionReveal>
          <div className="metric-tags">
            {trustSignals.map((signal) => (
              <span className="tag" key={signal}>{signal}</span>
            ))}
          </div>
        </MotionReveal>
      </motion.article>

      <MotionReveal delay={0.12} className="hero-visual" style={{ minHeight: "560px" }}>
        <HeroScene />
      </MotionReveal>
    </section>
  );
}

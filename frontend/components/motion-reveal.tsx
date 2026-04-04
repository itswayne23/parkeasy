"use client";

import { motion, type MotionProps } from "framer-motion";
import type { ReactNode } from "react";

export function MotionReveal({
  children,
  className,
  delay = 0,
  y = 36,
  ...props
}: MotionProps & { children: ReactNode; className?: string; delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12%" }}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
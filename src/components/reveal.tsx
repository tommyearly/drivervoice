"use client";

import { MotionConfig, motion } from "framer-motion";

export function Reveal({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.45, ease: "easeOut" }}>
        {children}
      </motion.div>
    </MotionConfig>
  );
}

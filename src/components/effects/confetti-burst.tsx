"use client";

/**
 * Lightweight confetti burst — pure framer-motion, no dependencies.
 * Fires once on mount; use for victory moments.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";

// Brand confetti: deep blue + saffron + coral
const COLORS = ["#0f766e", "#14b8a6", "#f97362", "#f5b840", "#0e4f4a", "#fb923c"];
const PIECES = 44;

export function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 360, // horizontal spread
        delay: Math.random() * 0.25,
        duration: 1.6 + Math.random() * 1.2,
        rotate: (Math.random() - 0.5) * 720,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 7,
        shape: i % 3, // 0 square, 1 circle, 2 strip
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
          animate={{
            y: "92vh",
            x: p.x,
            opacity: [1, 1, 0.9, 0],
            rotate: p.rotate,
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: [0.15, 0.4, 0.6, 1] }}
          style={{
            position: "absolute",
            width: p.shape === 2 ? p.size * 0.45 : p.size,
            height: p.shape === 2 ? p.size * 1.7 : p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 1 ? "50%" : 2,
          }}
        />
      ))}
    </div>
  );
}

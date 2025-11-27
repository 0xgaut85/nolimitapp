"use client";

import { motion } from "framer-motion";

/**
 * Aurora Flow Background - Lightweight CSS Version
 * Premium animated backdrop using CSS gradients and animations
 */

export default function HeroAurora() {
  return (
    <div className="w-full h-full bg-black overflow-hidden relative">
      {/* Base gradient layers */}
      <div className="absolute inset-0">
        {/* Primary aurora wave */}
        <motion.div
          className="absolute inset-0 opacity-40"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(45, 90, 61, 0.4) 0%, transparent 60%)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Secondary aurora wave */}
        <motion.div
          className="absolute inset-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse 60% 40% at 30% 60%, rgba(127, 255, 0, 0.15) 0%, transparent 50%)',
          }}
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Tertiary aurora wave */}
        <motion.div
          className="absolute inset-0 opacity-25"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 70% 40%, rgba(26, 58, 26, 0.5) 0%, transparent 55%)',
          }}
          animate={{
            x: [0, -40, 0],
            y: [0, 20, 0],
            scale: [1.1, 1, 1.1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Accent glow */}
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(127, 255, 0, 0.1) 0%, transparent 40%)',
          }}
          animate={{
            opacity: [0.1, 0.25, 0.1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-[#7fff00] rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 8,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)',
        }}
      />
    </div>
  );
}

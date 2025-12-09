'use client';

import { useEffect, useRef } from 'react';

/**
 * Aurora-style animated background for the landing page
 * Uses Canvas 2D for performance (no Three.js dependency)
 */
export function HeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationId: number;
    let time = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();

    // Noise function for smooth gradients
    const noise = (x: number, y: number, t: number) => {
      return Math.sin(x * 0.01 + t) * Math.cos(y * 0.01 + t * 0.5) * 0.5 + 0.5;
    };

    // Color palette (green theme matching nolimit brand)
    const colors = {
      bg: '#000000',
      light: '#b3ceb0',
      mid: '#98b894',
      deep: '#4a7c59',
      accent: '#7fff00',
    };

    // Floating particles
    const particles: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }

    const animate = () => {
      time += 0.005;
      
      // Clear with black
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, width, height);

      // Draw aurora bands
      const gradient = ctx.createRadialGradient(
        width * 0.5 + Math.sin(time * 0.5) * 100,
        height * 0.3 + Math.cos(time * 0.3) * 50,
        0,
        width * 0.5,
        height * 0.5,
        width * 0.8
      );
      gradient.addColorStop(0, `${colors.accent}15`);
      gradient.addColorStop(0.3, `${colors.light}10`);
      gradient.addColorStop(0.6, `${colors.mid}08`);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Second aurora layer
      const gradient2 = ctx.createRadialGradient(
        width * 0.7 + Math.cos(time * 0.4) * 150,
        height * 0.6 + Math.sin(time * 0.6) * 80,
        0,
        width * 0.6,
        height * 0.5,
        width * 0.6
      );
      gradient2.addColorStop(0, `${colors.deep}12`);
      gradient2.addColorStop(0.4, `${colors.mid}08`);
      gradient2.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, width, height);

      // Draw flowing lines
      ctx.strokeStyle = `${colors.accent}08`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const yOffset = height * 0.2 + i * height * 0.15;
        for (let x = 0; x < width; x += 5) {
          const y = yOffset + Math.sin(x * 0.005 + time + i) * 30 + noise(x, i * 100, time) * 20;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      // Draw particles
      particles.forEach((p) => {
        p.y -= p.speed;
        p.x += Math.sin(time + p.y * 0.01) * 0.2;
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }

        ctx.fillStyle = `rgba(127, 255, 0, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Subtle grid overlay
      ctx.strokeStyle = 'rgba(127, 255, 0, 0.02)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
    />
  );
}








"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type Particle = {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  order: boolean;
};

type EntropyProps = {
  className?: string;
};

const GREEN = "107,158,138";
const WHITE = "255,255,255";

function createParticles(width: number, height: number): Particle[] {
  const columns = Math.max(14, Math.min(26, Math.floor(width / 22)));
  const rows = Math.max(12, Math.min(22, Math.floor(height / 22)));
  const paddingX = Math.max(28, width * 0.08);
  const paddingY = Math.max(28, height * 0.1);
  const usableWidth = Math.max(1, width - paddingX * 2);
  const usableHeight = Math.max(1, height - paddingY * 2);
  const particles: Particle[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = paddingX + (column / Math.max(1, columns - 1)) * usableWidth;
      const y = paddingY + (row / Math.max(1, rows - 1)) * usableHeight;
      const order = x < width / 2;
      const seed = Math.sin(column * 12.9898 + row * 78.233) * 43758.5453;
      const jitter = seed - Math.floor(seed);

      particles.push({
        baseX: x,
        baseY: y,
        x: order ? x : x + (jitter - 0.5) * 18,
        y: order ? y : y + (0.5 - jitter) * 18,
        vx: order ? 0 : (jitter - 0.5) * 0.42,
        vy: order ? 0 : (0.5 - jitter) * 0.42,
        order,
      });
    }
  }

  return particles;
}

function drawParticle(
  context: CanvasRenderingContext2D,
  particle: Particle,
  time: number,
) {
  const pulse = particle.order ? Math.sin(time * 0.0016 + particle.baseX * 0.02) : 0;
  const radius = particle.order ? 1.35 + pulse * 0.25 : 1.05;
  const alpha = particle.order ? 0.78 : 0.3;

  context.beginPath();
  context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
  context.fillStyle = particle.order
    ? `rgba(${GREEN}, ${alpha})`
    : `rgba(${WHITE}, ${alpha})`;
  context.fill();
}

function drawConnection(
  context: CanvasRenderingContext2D,
  first: Particle,
  second: Particle,
) {
  const distance = Math.hypot(first.x - second.x, first.y - second.y);
  const maxDistance = first.order && second.order ? 54 : 42;
  if (distance > maxDistance) return;

  const strength = 1 - distance / maxDistance;
  const orderedLine = first.order && second.order;

  context.beginPath();
  context.moveTo(first.x, first.y);
  context.lineTo(second.x, second.y);
  context.strokeStyle = orderedLine
    ? `rgba(${GREEN}, ${0.18 * strength})`
    : `rgba(${WHITE}, ${0.08 * strength})`;
  context.lineWidth = orderedLine ? 0.8 : 0.55;
  context.stroke();
}

function Entropy({ className }: EntropyProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const particlesRef = React.useRef<Particle[]>([]);
  const sizeRef = React.useRef({ width: 0, height: 0 });
  const pointerRef = React.useRef({ x: 0, y: 0, active: false });

  React.useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let animationFrame = 0;
    let lastConnectionFrame = 0;
    let cachedPairs: Array<[number, number]> = [];

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext("2d");
      if (context) {
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      sizeRef.current = { width, height };
      particlesRef.current = createParticles(width, height);
      cachedPairs = [];
      lastConnectionFrame = 0;
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const animate = (time: number) => {
      const context = canvas.getContext("2d");
      const { width, height } = sizeRef.current;

      if (!context || width <= 0 || height <= 0) {
        animationFrame = window.requestAnimationFrame(animate);
        return;
      }

      context.clearRect(0, 0, width, height);

      const particles = particlesRef.current;
      const pointer = pointerRef.current;

      for (const particle of particles) {
        if (particle.order) {
          particle.x = particle.baseX + Math.sin(time * 0.0008 + particle.baseY * 0.02) * 1.4;
          particle.y = particle.baseY + Math.cos(time * 0.0008 + particle.baseX * 0.02) * 1.4;
        } else {
          particle.vx += (particle.baseX - particle.x) * 0.002;
          particle.vy += (particle.baseY - particle.y) * 0.002;
          particle.vx *= 0.985;
          particle.vy *= 0.985;
          particle.x += particle.vx;
          particle.y += particle.vy;

          const maxDrift = 22;
          if (Math.abs(particle.x - particle.baseX) > maxDrift) particle.vx *= -1;
          if (Math.abs(particle.y - particle.baseY) > maxDrift) particle.vy *= -1;
          if (particle.x < width / 2 + 8 || particle.x > width - 20) particle.vx *= -1;
          if (particle.y < 20 || particle.y > height - 20) particle.vy *= -1;
        }

        if (pointer.active) {
          const dx = particle.x - pointer.x;
          const dy = particle.y - pointer.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          const radius = particle.order ? 74 : 96;

          if (distance < radius) {
            const force = (1 - distance / radius) ** 2;
            const directionX = dx / distance;
            const directionY = dy / distance;
            const strength = particle.order ? 8 : 13;

            particle.x += directionX * force * strength;
            particle.y += directionY * force * strength;
          }
        }

        const maxOffset = particle.order ? 14 : 28;
        const offsetX = particle.x - particle.baseX;
        const offsetY = particle.y - particle.baseY;
        const offsetDistance = Math.hypot(offsetX, offsetY);

        if (offsetDistance > maxOffset) {
          const scale = maxOffset / offsetDistance;
          particle.x = particle.baseX + offsetX * scale;
          particle.y = particle.baseY + offsetY * scale;
        }

        particle.x = Math.min(width - 12, Math.max(12, particle.x));
        particle.y = Math.min(height - 12, Math.max(12, particle.y));
      }

      if (lastConnectionFrame % 8 === 0 || cachedPairs.length === 0) {
        cachedPairs = [];
        for (let firstIndex = 0; firstIndex < particles.length; firstIndex += 1) {
          const first = particles[firstIndex];
          for (let secondIndex = firstIndex + 1; secondIndex < particles.length; secondIndex += 1) {
            const second = particles[secondIndex];
            if (first.order !== second.order) continue;
            const maxDistance = first.order ? 54 : 42;
            if (Math.hypot(first.x - second.x, first.y - second.y) <= maxDistance) {
              cachedPairs.push([firstIndex, secondIndex]);
            }
          }
        }
      }

      for (const [firstIndex, secondIndex] of cachedPairs) {
        drawConnection(context, particles[firstIndex], particles[secondIndex]);
      }

      for (const particle of particles) {
        drawParticle(context, particle, time);
      }

      lastConnectionFrame += 1;
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative min-h-[360px] overflow-hidden rounded-2xl border border-white/[0.08] bg-neutral-950/65",
        className,
      )}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointerRef.current = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          active: true,
        };
      }}
      onPointerEnter={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointerRef.current = {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          active: true,
        };
      }}
      onPointerLeave={() => {
        pointerRef.current.active = false;
      }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}

export { Entropy };

"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";

import { cn } from "@/lib/utils";

type StepVariant = "capture" | "consolidate" | "recall";

type StepCardProps = {
  variant: StepVariant;
  tags: [string, string];
  title: string;
  description: string;
  hoverTitle: string;
  hoverBody: string;
  className?: string;
};

const dots = [
  { x: 14, y: 24, size: 3, opacity: 0.28 },
  { x: 24, y: 54, size: 2, opacity: 0.18 },
  { x: 32, y: 34, size: 4, opacity: 0.24 },
  { x: 45, y: 66, size: 3, opacity: 0.2 },
  { x: 52, y: 28, size: 2, opacity: 0.2 },
  { x: 63, y: 48, size: 5, opacity: 0.26 },
  { x: 72, y: 30, size: 3, opacity: 0.18 },
  { x: 82, y: 62, size: 2, opacity: 0.2 },
  { x: 88, y: 38, size: 4, opacity: 0.22 },
];

const arrivingDots = [
  { x: 19, y: 41, size: 3 },
  { x: 39, y: 48, size: 2 },
  { x: 58, y: 64, size: 4 },
  { x: 77, y: 46, size: 3 },
];

function DotField({ variant }: { variant: StepVariant }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        maskImage: "radial-gradient(circle at 50% 50%, black 0%, black 52%, transparent 84%)",
        WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 0%, black 52%, transparent 84%)",
      }}
      aria-hidden="true"
    >
      {dots.map((dot, index) => (
        <span
          key={`${variant}-dot-${index}`}
          className={cn(
            "absolute rounded-full bg-white transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            variant === "recall" && index === 5 && "bg-[#6B9E8A] opacity-100 shadow-[0_0_18px_rgba(107,158,138,0.34)]",
          )}
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
            opacity: variant === "recall" && index === 5 ? 1 : dot.opacity,
          }}
        />
      ))}

      {variant === "capture" &&
        arrivingDots.map((dot, index) => (
          <span
            key={`arriving-${index}`}
            className="absolute rounded-full bg-[#6B9E8A] opacity-0 shadow-[0_0_14px_rgba(107,158,138,0.28)] transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-80"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: dot.size,
              height: dot.size,
            }}
          />
        ))}

      {variant === "consolidate" && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" fill="none">
          <path
            d="M32 34 L52 28 L63 48 L45 66 L24 54"
            stroke="rgba(107,158,138,0.72)"
            strokeWidth="0.7"
            strokeDasharray="140"
            className="[stroke-dashoffset:140] transition-[stroke-dashoffset,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] opacity-0 group-hover:[stroke-dashoffset:0] group-hover:opacity-100"
          />
          <path
            d="M63 48 L88 38 L82 62"
            stroke="rgba(255,255,255,0.34)"
            strokeWidth="0.45"
            strokeDasharray="80"
            className="[stroke-dashoffset:80] transition-[stroke-dashoffset,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] opacity-0 delay-75 group-hover:[stroke-dashoffset:0] group-hover:opacity-100"
          />
        </svg>
      )}

      {variant === "recall" && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" fill="none">
          <path
            d="M63 48 C54 40 45 37 32 34"
            stroke="rgba(107,158,138,0.76)"
            strokeWidth="0.7"
            strokeDasharray="90"
            className="[stroke-dashoffset:90] transition-[stroke-dashoffset,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] opacity-0 group-hover:[stroke-dashoffset:0] group-hover:opacity-100"
          />
          <path
            d="M63 48 C57 56 50 61 45 66"
            stroke="rgba(107,158,138,0.58)"
            strokeWidth="0.55"
            strokeDasharray="80"
            className="[stroke-dashoffset:80] transition-[stroke-dashoffset,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] opacity-0 delay-75 group-hover:[stroke-dashoffset:0] group-hover:opacity-100"
          />
          <path
            d="M63 48 C70 45 78 42 88 38"
            stroke="rgba(107,158,138,0.5)"
            strokeWidth="0.5"
            strokeDasharray="80"
            className="[stroke-dashoffset:80] transition-[stroke-dashoffset,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] opacity-0 delay-100 group-hover:[stroke-dashoffset:0] group-hover:opacity-100"
          />
        </svg>
      )}
    </div>
  );
}

function StepCard({
  variant,
  tags,
  title,
  description,
  hoverTitle,
  hoverBody,
  className,
}: StepCardProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-neutral-950/70 text-left backdrop-blur-sm",
        className,
      )}
    >
      <div className="relative h-48 overflow-hidden">
        <DotField variant={variant} />

        <div className="absolute inset-x-5 bottom-5 flex gap-2 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-3 group-hover:opacity-0">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-white/[0.08] bg-black/40 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-400"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="absolute inset-x-4 bottom-4 translate-y-5 rounded-xl border border-white/[0.08] bg-black/70 p-4 opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0 group-hover:opacity-100">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#6B9E8A]">
            {hoverTitle}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-300">
            {hoverBody}
          </p>
        </div>
      </div>

      <div className="border-t border-white/[0.08] p-6">
        <h3 className="text-lg font-medium tracking-tight text-white">
          {title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function HowItWorksSection() {
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-20% 0px" });

  const cards: StepCardProps[] = [
    {
      variant: "capture",
      tags: ["episodic", "semantic"],
      title: "Every interaction becomes a memory",
      description:
        "Episodic, semantic, and procedural memories are stored as they happen — no manual logging.",
      hoverTitle: "Capture",
      hoverBody: "Raw experience enters the system the moment it happens.",
    },
    {
      variant: "consolidate",
      tags: ["patterns", "decay"],
      title: "Memories turn into knowledge",
      description:
        "Related experiences are grouped, patterns extracted, and old noise decays — this is the Dream cycle.",
      hoverTitle: "Consolidate",
      hoverBody: "Disconnected events become structured understanding.",
    },
    {
      variant: "recall",
      tags: ["cited", "traced"],
      title: "Every answer cites its source",
      description:
        "Questions are answered using retrieved memories, with citations attached — no black box.",
      hoverTitle: "Recall",
      hoverBody: "Nothing is asserted without a traceable source.",
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative z-10 w-full py-20 lg:py-32"
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.h2
            className="text-3xl font-semibold tracking-tighter text-white md:text-5xl"
            initial={false}
          >
            Agents that{" "}
            <span className="relative inline-block text-neutral-300">
              forget
              <motion.svg
                className="pointer-events-none absolute left-0 top-1/2 h-4 w-full -translate-y-1/2 overflow-visible"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <motion.path
                  d="M1 5 C24 4.2 44 5.8 99 4.8"
                  fill="none"
                  stroke="rgba(255,91,91,0.24)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: isInView ? 1 : 0 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.path
                  d="M1 5 C24 4.2 44 5.8 99 4.8"
                  fill="none"
                  stroke="#FF5B5B"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 10px rgba(255,91,91,0.55))" }}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: isInView ? 1 : 0 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                />
              </motion.svg>
            </span>{" "}
            <motion.span
              className="inline-block"
              initial={{ opacity: 0, y: 8 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
              transition={{ delay: 0.38, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              remember.
            </motion.span>
          </motion.h2>
          <motion.p
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-neutral-400 md:text-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ delay: 0.5, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            memos turns every session into something the next one can use.
          </motion.p>
        </div>

        <div className="relative mt-14 grid gap-5 md:grid-cols-3">
          <div className="pointer-events-none absolute left-[calc(33.333%-18px)] top-24 z-20 hidden text-neutral-600 md:block">
            →
          </div>
          <div className="pointer-events-none absolute left-[calc(66.666%-18px)] top-24 z-20 hidden text-neutral-600 md:block">
            →
          </div>

          {cards.map((card, index) => (
            <motion.div
              key={card.variant}
              initial={{ opacity: 0, y: 18 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
              transition={{
                delay: 0.14 * index + 0.14,
                duration: 0.46,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <StepCard {...card} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export { HowItWorksSection };

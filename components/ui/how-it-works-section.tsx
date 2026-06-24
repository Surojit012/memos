"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";
import {
  HoverSlider,
  HoverSliderImage,
  HoverSliderImageWrap,
  TextStaggerHover,
  useHoverSliderContext,
} from "@/components/ui/animated-slideshow";

const SLIDES = [
  {
    id: "capture",
    title: "Capture memories",
    description:
      "Every interaction — conversations, decisions, code — is stored as episodic, semantic, or procedural memory the moment it happens.",
    imageUrl:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2670&auto=format&fit=crop",
  },
  {
    id: "consolidate",
    title: "Consolidate & learn",
    description:
      "Between sessions, related memories are grouped, patterns extracted, and outdated noise fades — the agent wakes up smarter.",
    imageUrl:
      "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=2670&auto=format&fit=crop",
  },
  {
    id: "recall",
    title: "Recall with proof",
    description:
      "Every answer is backed by the exact memories it came from, cited by ID — no black box, no hallucination.",
    imageUrl:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2672&auto=format&fit=crop",
  },
];

function SlideDescription({ text, index }: { text: string; index: number }) {
  const { activeSlide } = useHoverSliderContext();
  const isActive = activeSlide === index;

  return (
    <motion.p
      className="text-sm md:text-base leading-relaxed text-neutral-400 absolute inset-0"
      initial={{ opacity: 0, y: 8 }}
      animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {text}
    </motion.p>
  );
}

function HowItWorksSection() {
  const sectionRef = React.useRef<HTMLElement | null>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-15% 0px" });

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative z-10 w-full py-20 lg:py-32"
    >
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          className="mx-auto max-w-3xl text-center mb-16"
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-[#ABD1C6]" />
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ABD1C6]">
              How it works
            </p>
          </div>
          <h2 className="text-3xl font-semibold tracking-tighter text-white md:text-5xl">
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
          </h2>
          <motion.p
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-neutral-400 md:text-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{ delay: 0.5, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            memos turns every session into something the next one can use.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ delay: 0.6, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <HoverSlider className="relative rounded-2xl border border-white/[0.08] bg-neutral-950/70 backdrop-blur-sm overflow-hidden">
            <div className="flex flex-col md:flex-row items-stretch">
              {/* Left: hover text list + animated description */}
              <div className="flex-1 p-8 md:p-12 flex flex-col justify-center">
                <div className="flex flex-col space-y-3 md:space-y-5">
                  {SLIDES.map((slide, index) => (
                    <div key={slide.id}>
                      <TextStaggerHover
                        index={index}
                        className="cursor-pointer text-2xl md:text-3xl lg:text-4xl font-bold uppercase tracking-tighter text-white"
                        text={slide.title}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-8 min-h-[60px] relative">
                  {SLIDES.map((slide, index) => (
                    <SlideDescription
                      key={slide.id}
                      text={slide.description}
                      index={index}
                    />
                  ))}
                </div>
              </div>

              {/* Right: images with clip-path reveal */}
              <div className="flex-1 min-h-[300px] md:min-h-[420px]">
                <HoverSliderImageWrap className="h-full">
                  {SLIDES.map((slide, index) => (
                    <div key={slide.id}>
                      <HoverSliderImage
                        index={index}
                        imageUrl={slide.imageUrl}
                        src={slide.imageUrl}
                        alt={slide.title}
                        className="size-full object-cover"
                        loading="eager"
                        decoding="async"
                      />
                    </div>
                  ))}
                </HoverSliderImageWrap>
              </div>
            </div>
          </HoverSlider>
        </motion.div>
      </div>
    </section>
  );
}

export { HowItWorksSection };

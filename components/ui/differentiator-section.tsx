"use client";

import * as React from "react";
import { motion, MotionValue, useScroll, useTransform } from "framer-motion";

import { Entropy } from "@/components/ui/entropy";

type RevealWordProps = {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
};

const paragraph =
  "Most AI agents tell you an answer. They don't tell you why. memos treats every response as a claim that needs evidence — every answer is backed by the exact memories it came from, cited by ID, so you can verify not just what the agent remembers, but where that memory came from and when. No black box. No 'trust me.' Just a traceable line from question to source.";

function RevealWord({ word, index, total, progress }: RevealWordProps) {
  const start = (index / total) * 0.84;
  const end = Math.min(1, start + 0.14);
  const opacity = useTransform(progress, [start, end], [0, 1]);

  return (
    <span className="relative mr-[0.28em] inline-block">
      <span className="text-white/20">{word}</span>
      <motion.span
        className="absolute inset-0 text-white"
        style={{ opacity }}
        aria-hidden="true"
      >
        {word}
      </motion.span>
    </span>
  );
}

function DifferentiatorSection() {
  const textRef = React.useRef<HTMLParagraphElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: textRef,
    offset: ["start 90%", "end 25%"],
  });
  const words = paragraph.split(" ");

  return (
    <section
      id="traceability"
      className="relative z-10 w-full overflow-visible py-20 lg:py-32"
    >
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.28fr)_minmax(320px,0.92fr)] lg:gap-16">
          <div>
            <p
              ref={textRef}
              className="max-w-3xl text-2xl font-medium leading-[1.35] tracking-tight md:text-4xl md:leading-[1.25]"
            >
              {words.map((word, index) => (
                <RevealWord
                  key={`${word}-${index}`}
                  word={word}
                  index={index}
                  total={words.length}
                  progress={scrollYProgress}
                />
              ))}
            </p>
          </div>

          <Entropy />
        </div>
      </div>
    </section>
  );
}

export { DifferentiatorSection };

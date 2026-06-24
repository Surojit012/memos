"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { OriginButton } from "@/components/ui/origin-button";

const faqs = [
  {
    question: "Is memos just a LangGraph wrapper?",
    answer: "No. LangGraph handles execution flow — how tasks run. memos handles cognition — what the agent remembers, how it consolidates knowledge, and how it cites its sources. They complement each other; memos sits on top as the memory and reasoning layer.",
  },
  {
    question: "What's the difference between Mock Mode and Real Mode?",
    answer: "Mock Mode runs entirely on your machine — simulated storage, compute, and chain, no live connection needed. Great for development, testing, and offline demos. Real Mode connects to live 0G infrastructure for production. The API is identical in both modes, so switching is a one-line env change.",
  },
  {
    question: "What data actually goes on-chain?",
    answer: "Agent identity registration and verifiable receipts go on-chain via the Chain Adapter. Memory blobs and checkpoints go to 0G Storage. Embeddings and inference run through 0G Compute. Nothing that doesn't need on-chain verification is put there unnecessarily.",
  },
  {
    question: "Is memos open source?",
    answer: "Yes. The core SDK, adapters, and persistence layer are open source. The codebase is available on GitHub — contributions and integrations are welcome.",
  },
  {
    question: "Can I use memos with agents I've already built?",
    answer: "Yes. The SDK is designed to wrap existing agents with minimal changes — agent.remember(), agent.reason(), agent.sync() are the primary integration points. You don't need to rebuild your agent architecture to add persistent memory.",
  },
  {
    question: "How does the Dream cycle work without blocking the agent?",
    answer: "Dream consolidation runs asynchronously — the agent continues operating while episodic memories are grouped, patterns extracted, and semantic memories formed in the background. The agent's next session benefits from the consolidated knowledge without any blocking during the current session.",
  },
  {
    question: "Does memos work offline or without 0G?",
    answer: "Yes, in Mock Mode the entire system runs locally without any 0G connection. This is fully supported for development, testing, and offline demos. Real Mode requires 0G infrastructure connectivity.",
  },
];

function FaqRow({ faq, isActive, onClick }: { faq: any; isActive: boolean; onClick: () => void }) {
  const bgRef = useRef<HTMLDivElement>(null);
  const intensityRef = useRef(0);
  const requestRef = useRef<number>();

  const updateBg = (val: number) => {
    if (!bgRef.current) return;
    if (isActive) {
      bgRef.current.style.backgroundColor = "rgba(255,255,255,0.08)";
    } else {
      bgRef.current.style.backgroundColor = `rgba(255,255,255,${val * 0.07})`;
    }
  };

  // Sync background if isActive changes while not hovered
  useEffect(() => {
    updateBg(intensityRef.current);
  }, [isActive]);

  const animateDecay = () => {
    intensityRef.current -= 0.035; // ~28 frames = ~460ms decay for a visible trailing trail
    if (intensityRef.current <= 0) {
      intensityRef.current = 0;
      updateBg(0);
      return;
    }
    updateBg(intensityRef.current);
    requestRef.current = requestAnimationFrame(animateDecay);
  };

  const handleMouseEnter = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    intensityRef.current = 1;
    updateBg(1);
  };

  const handleMouseLeave = () => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(animateDecay);
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div
      className="group border-b border-white/10 overflow-hidden relative cursor-pointer"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Hover fill sweep background driven by rAF intensity */}
      <div
        ref={bgRef}
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ backgroundColor: isActive ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0)" }}
      />

      {/* Content container */}
      <div className="relative z-10 w-full px-4 md:px-6">
        <div className="flex items-center justify-between py-6 md:py-8 select-none">
          <h3 className={`text-base md:text-lg font-medium pr-8 transition-colors duration-200 ${isActive ? "text-white" : "text-neutral-200 group-hover:text-white"}`}>
            {faq.question}
          </h3>
          {/* Dot indicator */}
          <div
            className={`flex-shrink-0 w-2.5 h-2.5 rounded-full border transition-all duration-200 ease-out ${
              isActive
                ? "bg-[#ABD1C6] border-[#ABD1C6] shadow-[0_0_8px_rgba(171,209,198,0.5)]"
                : "bg-transparent border-white/30 group-hover:border-white/60"
            }`}
          />
        </div>

        <AnimatePresence initial={false}>
          {isActive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <p className="pb-8 text-neutral-400 text-sm md:text-base leading-relaxed max-w-3xl">
                {faq.answer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function FaqSection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleOpen = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="relative z-20 w-full bg-[#08090A] py-24 lg:py-32 border-b border-white/10 text-white">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-12 lg:gap-20">
          
          {/* LEFT SIDEBAR (~25%) */}
          <div className="md:w-1/4 flex flex-col md:sticky md:top-32">
            <div className="flex items-center gap-2 mb-16 md:mb-24">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ABD1C6]" />
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ABD1C6]">
                FAQs
              </p>
            </div>

            <div className="flex flex-col gap-5">
              <div className="text-sm text-neutral-400">
                <p>Got more questions?</p>
                <p>
                  <a href="https://memos.mintlify.app/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-[#ABD1C6] transition-colors underline underline-offset-4">Read the docs.</a>
                </p>
              </div>
              <div className="self-start">
                <OriginButton>
                  <a href="https://memos.mintlify.app/" target="_blank" rel="noopener noreferrer" className="flex items-center">
                    View Documentation <span className="ml-2">→</span>
                  </a>
                </OriginButton>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (~75%) */}
          <div className="md:w-3/4">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.1] text-white mb-16 text-left">
              Here's what you need to know before building with us.
            </h2>

            <div className="flex flex-col w-full border-t border-white/10">
              {faqs.map((faq, index) => (
                <FaqRow
                  key={index}
                  faq={faq}
                  isActive={activeIndex === index}
                  onClick={() => toggleOpen(index)}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

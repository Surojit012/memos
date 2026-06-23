"use client";

import { motion } from "framer-motion";

import DotPattern from "@/components/ui/dot-pattern-1";
import { LampContainer } from "@/components/ui/lamp";

const infrastructureCards = [
  {
    eyebrow: "0G STORAGE",
    strong: "Persistent",
    light: "memory",
    body: "Stores agent memories, module manifests, and runtime checkpoints.",
  },
  {
    eyebrow: "0G COMPUTE",
    strong: "Reasoning",
    light: "layer",
    body: "Runs embeddings, inference, and dream consolidation through replaceable compute adapters.",
  },
  {
    eyebrow: "0G CHAIN",
    strong: "Verifiable",
    light: "proofs",
    body: "Anchors identity and transaction proofs without turning memos into a blockchain app.",
  },
];

function BuiltOn0GSection() {
  return (
    <section
      id="built-on-0g"
      className="relative z-20 w-full overflow-visible pb-24 pt-16 lg:pb-32 lg:pt-20"
      style={{ zIndex: 20 }}
    >
      <LampContainer>
        <div className="mx-auto w-full max-w-7xl text-center">
          <motion.h2
            initial={{ opacity: 0.55, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{
              delay: 0.18,
              duration: 0.7,
              ease: "easeInOut",
            }}
            className="text-3xl font-semibold tracking-tighter text-white md:text-5xl"
          >
            Built on 0G
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{
              delay: 0.28,
              duration: 0.65,
              ease: "easeInOut",
            }}
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-neutral-400 md:text-lg"
          >
            memos connects persistent agent cognition to 0G Storage,
            Compute, and Chain through replaceable adapters.
          </motion.p>

          <div className="mx-auto mt-14 grid w-full max-w-6xl gap-8 md:grid-cols-3">
            {infrastructureCards.map((card, index) => (
              <motion.div
                key={card.eyebrow}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{
                  delay: 0.38 + index * 0.08,
                  duration: 0.6,
                  ease: "easeInOut",
                }}
                className="relative overflow-visible"
              >
                <div className="relative flex h-full min-h-[280px] flex-col overflow-hidden border border-[#ABD1C6]/65 bg-[#080808] text-left">
                  <DotPattern
                    width={5}
                    height={5}
                    className="fill-[#ABD1C6]/15 md:fill-[#ABD1C6]/18"
                  />

                  <div className="relative z-20 flex flex-1 flex-col p-6 md:p-7">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ABD1C6]">
                      {card.eyebrow}
                    </p>

                    {/* Fixed spacer — keeps heading at identical vertical position across all cards */}
                    <div className="h-28" aria-hidden="true" />

                    <div>
                      <h3 className="text-3xl leading-none tracking-tighter text-white lg:text-4xl">
                        <strong className="font-semibold">{card.strong}</strong>{" "}
                        <span className="font-thin text-neutral-200">{card.light}</span>
                      </h3>
                      <p className="mt-5 text-sm leading-relaxed text-neutral-400 md:text-base">
                        {card.body}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="absolute -left-1.5 -top-1.5 z-30 h-3 w-3 bg-[#ABD1C6]" />
                <div className="absolute -bottom-1.5 -left-1.5 z-30 h-3 w-3 bg-[#ABD1C6]" />
                <div className="absolute -right-1.5 -top-1.5 z-30 h-3 w-3 bg-[#ABD1C6]" />
                <div className="absolute -bottom-1.5 -right-1.5 z-30 h-3 w-3 bg-[#ABD1C6]" />
              </motion.div>
            ))}
          </div>
        </div>
      </LampContainer>
    </section>
  );
}

export { BuiltOn0GSection };

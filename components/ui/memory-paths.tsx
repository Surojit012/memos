"use client";

import { motion } from "framer-motion";
import { OriginButton } from "@/components/ui/origin-button";

function FloatingPaths({ position }: { position: number }) {
    const paths = Array.from({ length: 36 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
            380 - i * 5 * position
        } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
            152 - i * 5 * position
        } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
            684 - i * 5 * position
        } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
        // Muted green accent instead of generic slate — ties to the
        // preloader's brand color. Opacity ramps stay the same logic,
        // just a green base instead of slate.
        color: `rgba(74,124,89,${0.08 + i * 0.025})`,
        width: 0.4 + i * 0.025,
    }));

    return (
        <div className="absolute inset-0 pointer-events-none">
            <svg
                className="w-full h-full text-neutral-800 dark:text-neutral-200"
                viewBox="0 0 696 316"
                fill="none"
            >
                <title>Memory Paths</title>
                {paths.map((path) => (
                    <motion.path
                        key={path.id}
                        d={path.d}
                        stroke="currentColor"
                        strokeWidth={path.width}
                        strokeOpacity={0.08 + path.id * 0.02}
                        initial={{ pathLength: 0.3, opacity: 0.5 }}
                        animate={{
                            pathLength: 1,
                            opacity: [0.25, 0.5, 0.25],
                            pathOffset: [0, 1, 0],
                        }}
                        transition={{
                            duration: 22 + Math.random() * 12,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                        }}
                    />
                ))}
                {/* A small number of paths get the green accent treatment
                   instead of neutral — these read as "active" memory
                   threads against the dormant gray ones */}
                {paths.slice(0, 6).map((path) => (
                    <motion.path
                        key={`accent-${path.id}`}
                        d={path.d}
                        stroke="#4a7c59"
                        strokeWidth={path.width}
                        initial={{ pathLength: 0.2, opacity: 0 }}
                        animate={{
                            pathLength: 1,
                            opacity: [0, 0.35, 0],
                            pathOffset: [0, 1, 0],
                        }}
                        transition={{
                            duration: 8 + Math.random() * 6,
                            repeat: Number.POSITIVE_INFINITY,
                            repeatDelay: Math.random() * 10,
                            ease: "easeInOut",
                        }}
                    />
                ))}
            </svg>
        </div>
    );
}

export function MemoryPaths({
    title = "memos",
    children,
}: {
    title?: string;
    children?: React.ReactNode;
}) {
    const words = title.split(" ");

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-transparent">
            <div className="absolute inset-0">
                <FloatingPaths position={1} />
                <FloatingPaths position={-1} />
            </div>

            <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2 }}
                    className="max-w-4xl mx-auto"
                >
                    {/* Eyebrow label in monospace — ties back to the
                       preloader's terminal-style typography */}
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 0.6, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="font-mono text-xs tracking-[0.2em] uppercase text-neutral-400 mb-6"
                    >
                        Powered by 0G
                    </motion.p>

                    <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold mb-8 tracking-tighter text-white">
                        {words.map((word, wordIndex) => (
                            <span
                                key={wordIndex}
                                className="inline-block mr-4 last:mr-0"
                            >
                                {word.split("").map((letter, letterIndex) => (
                                    <motion.span
                                        key={`${wordIndex}-${letterIndex}`}
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{
                                            delay:
                                                wordIndex * 0.1 +
                                                letterIndex * 0.03,
                                            type: "spring",
                                            stiffness: 150,
                                            damping: 25,
                                        }}
                                        className="inline-block text-transparent bg-clip-text
                                        bg-gradient-to-r from-white to-white/80 pr-[0.1em] -mr-[0.1em]"
                                    >
                                        {letter}
                                    </motion.span>
                                ))}
                            </span>
                        ))}
                    </h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.7 }}
                        transition={{ delay: 1.2, duration: 0.8 }}
                        className="text-neutral-400 text-base md:text-lg mb-10 max-w-xl mx-auto"
                    >
                        AI agents forget everything. memos gives them a
                        persistent brain.
                    </motion.p>

                    {children ? (
                        children
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
                            <OriginButton
                                href="/playground"
                                className="rounded-full px-6 py-3 text-sm font-medium
                                bg-neutral-950/90 hover:bg-neutral-900
                                text-white transition-all duration-200
                                border border-white/10 hover:border-white/20"
                            >
                                Open Playground
                                <span className="ml-2">→</span>
                            </OriginButton>
                            <OriginButton
                                href="https://memos.mintlify.app/"
                                className="rounded-full px-6 py-3 text-sm font-medium
                                text-neutral-300 hover:text-white
                                border border-white/15 hover:border-white/30
                                transition-all duration-200"
                            >
                                Read the docs
                            </OriginButton>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

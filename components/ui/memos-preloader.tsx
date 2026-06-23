"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";

const PRELOADER_LINES = [
  "Most AI agents forget everything when the session ends.",
  "memos gives them a persistent brain.",
  "Powered by 0G.",
];

function memosPreloader({ onComplete }: { onComplete: () => void }) {
  const cursorRef = useRef<HTMLSpanElement>(null);
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const lastSoundAtRef = useRef(0);
  const hasRun = useRef(false);
  const [exiting, setExiting] = useState(false);

  const stableOnComplete = useCallback(onComplete, [onComplete]);

  const ensureAudio = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (audioContextRef.current) return audioContextRef.current;

    const AudioContextClass =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) return null;

    const context = new AudioContextClass();
    const masterGain = context.createGain();
    masterGain.gain.value = 0.045;
    masterGain.connect(context.destination);

    audioContextRef.current = context;
    masterGainRef.current = masterGain;

    return context;
  }, []);

  const unlockAudio = useCallback(() => {
    const context = ensureAudio();
    if (!context) return;

    void context
      .resume()
      .catch(() => {
        // Browsers may keep audio locked until direct user input.
      });
  }, [ensureAudio]);

  const playTypingSound = useCallback(
    (character: string) => {
      const context = ensureAudio();
      const masterGain = masterGainRef.current;
      if (!context || !masterGain || context.state !== "running") return;

      const now = context.currentTime;
      if (now - lastSoundAtRef.current < 0.018) return;
      lastSoundAtRef.current = now;

      const isWhitespace = character.trim().length === 0;
      const frequency = isWhitespace
        ? 210
        : 245 + (character.charCodeAt(0) % 7) * 18;
      const duration = isWhitespace ? 0.018 : 0.032;

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 0.72,
        now + duration,
      );

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(
        isWhitespace ? 0.012 : 0.035,
        now + 0.004,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.004);
    },
    [ensureAudio],
  );

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    unlockAudio();

    const runSequence = async () => {
      for (let lineIndex = 0; lineIndex < PRELOADER_LINES.length; lineIndex += 1) {
        const line = PRELOADER_LINES[lineIndex];
        const span = lineRefs.current[lineIndex];
        if (!span) continue;

        if (cursorRef.current && span.parentElement) {
          span.parentElement.appendChild(cursorRef.current);
        }

        for (let characterIndex = 0; characterIndex < line.length; characterIndex += 1) {
          span.textContent = line.slice(0, characterIndex + 1);
          playTypingSound(line[characterIndex]);
          const delay = 30 + Math.random() * 30;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        if (lineIndex < PRELOADER_LINES.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 700));
      setExiting(true);
    };

    void runSequence();

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      const context = audioContextRef.current;
      audioContextRef.current = null;
      masterGainRef.current = null;
      if (context && context.state !== "closed") {
        void context.close();
      }
    };
  }, [playTypingSound, unlockAudio]);

  return (
    <AnimatePresence onExitComplete={stableOnComplete}>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-[9999] p-4 sm:p-5"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 0.96,
            borderRadius: "48px",
            filter: "blur(12px)",
          }}
          transition={{ duration: 0.55, ease: [0.87, 0, 0.13, 1] }}
          aria-live="polite"
          aria-label="Loading memos"
        >
          <div
            className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[36px] border border-white/[0.06]"
            style={{
              background:
                "linear-gradient(135deg, rgba(14,18,16,0.85) 0%, rgba(10,12,11,0.92) 100%)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              boxShadow:
                "0 0 80px rgba(74,122,98,0.04), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            <motion.div
              className="absolute inset-0 pointer-events-none opacity-[0.04]"
              animate={{
                background: [
                  "radial-gradient(ellipse 60% 50% at 30% 40%, rgba(74,122,98,0.6) 0%, transparent 70%)",
                  "radial-gradient(ellipse 50% 60% at 70% 60%, rgba(74,122,98,0.6) 0%, transparent 70%)",
                  "radial-gradient(ellipse 60% 50% at 30% 40%, rgba(74,122,98,0.6) 0%, transparent 70%)",
                ],
              }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "linear",
              }}
              aria-hidden="true"
            />

            <div
              className="absolute left-6 top-6 h-5 w-5 border-l border-t border-white/[0.08]"
              aria-hidden="true"
            />
            <div
              className="absolute right-6 top-6 h-5 w-5 border-r border-t border-white/[0.08]"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-6 left-6 h-5 w-5 border-b border-l border-white/[0.08]"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-6 right-6 h-5 w-5 border-b border-r border-white/[0.08]"
              aria-hidden="true"
            />

            <motion.div
              className="relative z-10 flex max-w-2xl flex-col items-center px-8 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
            >
              <Logo className="w-10 h-10 text-white mb-8" />
              {PRELOADER_LINES.map((_, lineIndex) => (
                <div
                  className="min-h-[1.8em] font-mono text-sm leading-relaxed text-neutral-300/90 sm:text-base"
                  key={lineIndex}
                  style={{ marginTop: lineIndex > 0 ? "10px" : 0 }}
                >
                  <span
                    ref={(element) => {
                      lineRefs.current[lineIndex] = element;
                    }}
                  />
                  {lineIndex === 0 && (
                    <span
                      ref={cursorRef}
                      className="ml-[2px] inline-block h-[1.1em] w-[2px] animate-[cursorBlink_0.6s_ease-in-out_infinite] align-text-bottom"
                      style={{
                        background: "#4a7a62",
                        boxShadow: "0 0 6px rgba(74,122,98,0.5)",
                      }}
                    />
                  )}
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { memosPreloader };

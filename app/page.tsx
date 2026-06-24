'use client';


import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BuiltOn0GSection } from '@/components/ui/built-on-0g-section';
import { DifferentiatorSection } from '@/components/ui/differentiator-section';
import { HowItWorksSection } from '@/components/ui/how-it-works-section';
import { FaqSection } from '@/components/ui/faq-section';
import { FooterSection } from '@/components/ui/footer-section';
import { memosPreloader as MemosPreloader } from '@/components/ui/memos-preloader';
import { MemoryPaths } from '@/components/ui/memory-paths';
import { ProblemComparisonSlider } from '@/components/ui/problem-comparison-slider';
import { Logo } from '@/components/ui/logo';

/* ------------------------------------------------------------------ */
/*  Floating Nav                                                       */
/* ------------------------------------------------------------------ */

function Nav({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          className="fixed top-5 z-[1000] flex items-center justify-between
            left-[max(16px,calc((100vw-min(92vw,840px))/2))]
            w-[min(92vw,840px)]
            rounded-full px-7 py-3
            border border-white/[0.06]
            backdrop-blur-2xl"
          style={{
            background: 'rgba(20,25,23,0.45)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            overflow: 'visible',
          }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
          aria-label="Main navigation"
        >
          <a
            href="/"
            className="inline-flex items-center gap-2 overflow-visible pb-[2px]
              font-medium text-[1.05rem] leading-none text-neutral-100 tracking-tight no-underline
              focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4a7a62] focus-visible:rounded"
          >
            <Logo className="w-5 h-5 text-white" />
            memos
          </a>
          <ul className="hidden sm:flex gap-8 list-none">
            <li>
              <a
                href="https://memos.mintlify.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-neutral-400 no-underline hover:text-neutral-100 transition-colors
                  focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4a7a62] focus-visible:rounded"
              >
                Docs
              </a>
            </li>
            <li>
              <a
                href="/playground"
                className="text-sm text-neutral-400 no-underline hover:text-neutral-100 transition-colors
                  focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4a7a62] focus-visible:rounded"
              >
                Playground
              </a>
            </li>
          </ul>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      const bottom = Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 20;
      setIsAtBottom(bottom);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {!preloaderDone && (
        <MemosPreloader onComplete={() => setPreloaderDone(true)} />
      )}

      <Nav visible={preloaderDone && !isAtBottom} />

      <main style={{ paddingTop: 60 }}>
        {/* Hero — MemoryPaths component with animated SVG background */}
        <MemoryPaths title="memos" />

        <div className="border-t border-neutral-900">
          <ProblemComparisonSlider />
        </div>
        <HowItWorksSection />
        <DifferentiatorSection />
        <BuiltOn0GSection />
        <FaqSection />
      </main>
      <FooterSection />
    </>
  );
}

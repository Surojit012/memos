'use client';

/*
  PHASE 8 ANALYSIS:
  1. Hero CTA: single OriginButton "Get started →" inside MemoryPaths component (now accepts children prop)
  2. Navbar: Floating glassmorphic Nav component defined inline (lines 20-91) — keeping it, adding LandingNavbar as fixed white bar
  3. Section order: Preloader → Nav → MemoryPaths → ProblemComparisonSlider → HowItWorksSection → DifferentiatorSection → BuiltOn0GSection → FaqSection → FooterSection
  4. Footer: FooterSection exists at end
*/

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
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
                href="/profile"
                className="text-sm text-neutral-400 no-underline hover:text-neutral-100 transition-colors
                  focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4a7a62] focus-visible:rounded"
              >
                Profile
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
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      // Check if user reached bottom of the page
      const bottom = Math.ceil(window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 20;
      setIsAtBottom(bottom);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Run once on mount to check initial state
    handleScroll();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleGetStarted = () => {
    if (auth.isAuthenticated) {
      router.push('/dashboard');
    } else {
      auth.login();
    }
  };

  return (
    <>
      {!preloaderDone && (
        <MemosPreloader onComplete={() => setPreloaderDone(true)} />
      )}

      <Nav visible={preloaderDone && !isAtBottom} />

      <main style={{ paddingTop: 60 }}>
        {/* Hero — MemoryPaths component with animated SVG background */}
        <MemoryPaths title="memos">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => router.push('/playground')}
              style={{
                backgroundColor: '#18181b',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Login
            </button>
            <button
              onClick={() => router.push('/playground')}
              style={{
                backgroundColor: 'white',
                color: '#18181b',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: 500,
                border: '1px solid #e4e4e7',
                cursor: 'pointer',
              }}
            >
              Get Started
            </button>
          </div>
        </MemoryPaths>

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

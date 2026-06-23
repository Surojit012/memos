'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

export function LandingNavbar() {
  const auth = useAuth();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Scroll shadow
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileOpen]);

  const closeAndNavigate = useCallback((path: string) => {
    setMobileOpen(false);
    router.push(path);
  }, [router]);

  const closeAndLogin = useCallback(() => {
    setMobileOpen(false);
    auth.login();
  }, [auth]);

  const closeAndLogout = useCallback(() => {
    setMobileOpen(false);
    auth.logout();
  }, [auth]);

  return (
    <div ref={dropdownRef} style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
      <nav
        style={{
          height: 60,
          background: 'var(--surface)',
          borderBottom: '1px solid #e4e4e7',
          boxShadow: scrolled ? '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)' : 'none',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '100%',
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
              fontSize: 16,
              fontWeight: 600,
              color: '#ffffff',
              textDecoration: 'none',
            }}
          >
            memos
          </Link>

          {/* Desktop nav */}
          <div className="landing-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {auth.isAuthenticated ? (
              <>
                <button onClick={() => router.push('/playground')} style={textBtnStyle}>Playground</button>
                <button onClick={() => router.push('/dashboard')} style={textBtnStyle}>Dashboard</button>
                {auth.agentId && (
                  <span style={pillStyle}>
                    {auth.agentId.slice(0, 6)}...
                  </span>
                )}
                <button onClick={() => auth.logout()} style={{ ...textBtnStyle, color: 'var(--text2)' }}>Log out</button>
              </>
            ) : (
              <>
                <button onClick={() => router.push('/playground')} style={textBtnStyle}>Playground</button>
                <button onClick={() => router.push('/profile')} style={textBtnStyle}>Profile</button>
                <button onClick={() => auth.login()} style={outlineBtnStyle}>Log in</button>
                <button onClick={() => auth.login()} style={filledBtnStyle}>Get API Key</button>
              </>
            )}
          </div>

          {/* Mobile nav */}
          <div className="landing-nav-mobile" style={{ display: 'none', alignItems: 'center', gap: 8 }}>
            {auth.isAuthenticated ? (
              <button onClick={() => router.push('/dashboard')} style={filledBtnStyle}>Dashboard</button>
            ) : (
              <button onClick={() => auth.login()} style={filledBtnStyle}>Get API Key</button>
            )}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
              style={{
                fontSize: 20,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#ffffff',
                padding: '4px 8px',
              }}
            >
              ☰
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div
          className="landing-nav-mobile"
          style={{
            display: 'none',
            flexDirection: 'column',
            background: 'var(--surface)',
            border: '1px solid #e4e4e7',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
          }}
        >
          {auth.isAuthenticated ? (
            <>
              <MobileNavItem label="Playground" onClick={() => closeAndNavigate('/playground')} />
              <MobileNavItem label="Dashboard" onClick={() => closeAndNavigate('/dashboard')} />
              <MobileNavItem label="Log out" onClick={closeAndLogout} />
            </>
          ) : (
            <>
              <MobileNavItem label="Playground" onClick={() => closeAndNavigate('/playground')} />
              <MobileNavItem label="Log in" onClick={closeAndLogin} />
              <MobileNavItem label="Get API Key" onClick={closeAndLogin} />
            </>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .landing-nav-desktop { display: none !important; }
          .landing-nav-mobile { display: flex !important; }
        }
        @media (min-width: 768px) {
          .landing-nav-desktop { display: flex !important; }
          .landing-nav-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function MobileNavItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 44,
        padding: '0 24px',
        fontSize: 14,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#ffffff',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid #e4e4e7',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
      }}
    >
      {label}
    </button>
  );
}

const textBtnStyle: React.CSSProperties = {
  fontSize: 13,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontWeight: 500,
  color: '#ffffff',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '4px 8px',
};

const outlineBtnStyle: React.CSSProperties = {
  fontSize: 13,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontWeight: 500,
  color: '#ffffff',
  background: 'var(--surface)',
  border: '1px solid #e4e4e7',
  borderRadius: 6,
  padding: '8px 16px',
  cursor: 'pointer',
};

const filledBtnStyle: React.CSSProperties = {
  fontSize: 13,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontWeight: 500,
  color: 'var(--surface)',
  background: '#ffffff',
  border: 'none',
  borderRadius: 6,
  padding: '8px 16px',
  cursor: 'pointer',
};

const pillStyle: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, Fira Code, monospace',
  fontSize: 12,
  color: 'var(--text2)',
  background: '#f4f4f5',
  border: '1px solid #e4e4e7',
  borderRadius: 99,
  padding: '4px 10px',
};

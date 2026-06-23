'use client';

interface PricingSectionProps {
  onGetStarted: () => void;
}

interface Feature {
  text: string;
  included: boolean;
}

interface PricingCard {
  label: string;
  price: string;
  period: string;
  subtitle: string;
  features: Feature[];
  ctaText: string;
  highlighted: boolean;
  badge?: string;
  onCta: () => void;
}

export function PricingSection({ onGetStarted }: PricingSectionProps) {
  const cards: PricingCard[] = [
    {
      label: 'Free',
      price: '$0',
      period: ' / month',
      subtitle: 'Forever',
      highlighted: false,
      ctaText: 'Start free',
      onCta: onGetStarted,
      features: [
        { text: '1 agent', included: true },
        { text: '100 memories', included: true },
        { text: 'Keyword search', included: true },
        { text: 'API access', included: true },
        { text: 'Semantic search', included: false },
        { text: 'Dream consolidation', included: false },
        { text: 'RAG chat', included: false },
      ],
    },
    {
      label: 'Pro',
      price: '$29',
      period: ' / month',
      subtitle: 'Billed monthly',
      highlighted: true,
      badge: 'Most Popular',
      ctaText: 'Get started',
      onCta: onGetStarted,
      features: [
        { text: '10 agents', included: true },
        { text: 'Unlimited memories', included: true },
        { text: 'Semantic search', included: true },
        { text: 'Dream consolidation', included: true },
        { text: 'RAG chat', included: true },
        { text: 'Encrypted vaults', included: true },
        { text: 'INFT minting', included: false },
      ],
    },
    {
      label: 'Enterprise',
      price: '$149',
      period: ' / month',
      subtitle: 'Billed monthly',
      highlighted: false,
      ctaText: 'Contact us',
      onCta: () => { window.location.href = 'mailto:hello@memos.io'; },
      features: [
        { text: 'Unlimited agents', included: true },
        { text: 'Unlimited memories', included: true },
        { text: 'All Pro features', included: true },
        { text: 'INFT minting', included: true },
        { text: 'Priority 0G Compute', included: true },
        { text: 'SLA support', included: true },
      ],
    },
  ];

  return (
    <section style={{ padding: '80px 24px', background: '#fafafa' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Heading */}
        <h2 style={{ fontSize: 32, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 600, color: '#18181b', textAlign: 'center', margin: 0 }}>
          Simple pricing
        </h2>
        <p style={{ fontSize: 16, fontFamily: 'Inter, system-ui, sans-serif', color: '#71717a', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
          Start free. Scale as your agents grow.
        </p>

        {/* Cards */}
        <div className="pricing-grid" style={{ display: 'grid', gap: 24, marginTop: 48 }}>
          {cards.map((card) => (
            <div
              key={card.label}
              style={{
                border: card.highlighted ? '2px solid #18181b' : '1px solid #e4e4e7',
                borderRadius: 8,
                padding: '28px 24px',
                background: '#ffffff',
                boxShadow: card.highlighted ? '0 4px 6px -1px rgba(0,0,0,0.07)' : 'none',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{
                  fontSize: 13,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: card.highlighted ? '#18181b' : '#71717a',
                  fontWeight: card.highlighted ? 600 : 400,
                }}>
                  {card.label}
                </span>
                {card.badge && (
                  <span style={{
                    fontSize: 11,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontWeight: 500,
                    color: '#ffffff',
                    background: '#18181b',
                    borderRadius: 99,
                    padding: '3px 8px',
                  }}>
                    {card.badge}
                  </span>
                )}
              </div>

              {/* Price */}
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: 40, fontFamily: 'Inter, system-ui, sans-serif', fontWeight: 700, color: '#18181b' }}>
                  {card.price}
                </span>
                <span style={{ fontSize: 16, fontFamily: 'Inter, system-ui, sans-serif', color: '#71717a' }}>
                  {card.period}
                </span>
              </div>
              <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', marginTop: 4, marginBottom: 0 }}>
                {card.subtitle}
              </p>

              {/* Divider */}
              <hr style={{ border: 'none', borderTop: '1px solid #e4e4e7', margin: '20px 0' }} />

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {card.features.map((f) => (
                  <div key={f.text} style={{ display: 'flex', gap: 8, fontSize: 14, fontFamily: 'Inter, system-ui, sans-serif' }}>
                    <span style={{ color: f.included ? '#16a34a' : '#a1a1aa', flexShrink: 0 }}>
                      {f.included ? '✓' : '✗'}
                    </span>
                    <span style={{
                      color: f.included ? '#18181b' : '#a1a1aa',
                      textDecoration: f.included ? 'none' : 'line-through',
                    }}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={card.onCta}
                aria-label={card.ctaText}
                style={{
                  width: '100%',
                  height: 40,
                  marginTop: 24,
                  fontSize: 14,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontWeight: 500,
                  color: card.highlighted ? '#ffffff' : '#18181b',
                  background: card.highlighted ? '#18181b' : '#ffffff',
                  border: card.highlighted ? 'none' : '1px solid #e4e4e7',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                {card.ctaText}
              </button>
            </div>
          ))}
        </div>

        {/* Beta note */}
        <p style={{ fontSize: 13, fontFamily: 'Inter, system-ui, sans-serif', color: '#a1a1aa', fontStyle: 'italic', textAlign: 'center', marginTop: 24, marginBottom: 0 }}>
          Pricing is indicative. Billing is not yet active — all features are available free during beta.
        </p>
      </div>

      <style>{`
        .pricing-grid {
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .pricing-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </section>
  );
}

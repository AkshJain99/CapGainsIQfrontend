interface Props {
  onGetStarted: () => void;
  onLoadDemo: () => void;
}

const FEATURES = [
  {
    icon: '⚡',
    title: 'FIFO Capital Gains',
    desc: 'Accurate LTCG & STCG using First-In-First-Out. Every lot tracked correctly.',
  },
  {
    icon: '📊',
    title: 'FY-wise ITR Breakdown',
    desc: 'Year-by-year summary. Share directly with your CA for ITR-2 or ITR-3 filing.',
  },
  {
    icon: '💰',
    title: 'Tax Estimate',
    desc: 'Correct Indian rates auto-applied. Pre and post Budget 2024 handled automatically.',
  },
  {
    icon: '📈',
    title: 'Live Prices',
    desc: 'Fetches latest prices from Yahoo Finance and MF API. See unrealised gains today.',
  },
  {
    icon: '🔄',
    title: 'XIRR Per Asset',
    desc: 'True annualised return for every stock and mutual fund in your portfolio.',
  },
  {
    icon: '📥',
    title: 'Export for CA',
    desc: 'Download a clean CSV. Hand it to your CA. Save ₹2000-5000 in fees.',
  },
];

const STEPS = [
  { n: '1', title: 'Add your assets', desc: 'List your stocks and mutual funds' },
  { n: '2', title: 'Enter transactions', desc: 'Your buy/sell history with dates and prices' },
  { n: '3', title: 'Click calculate', desc: 'We fetch live prices and run the engine' },
  { n: '4', title: 'Get your report', desc: 'LTCG, STCG, tax estimate, CSV for CA' },
];

export default function LandingPage({ onGetStarted, onLoadDemo }: Props) {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #eef2ff 0%, #f8f9fc 60%, #ecfdf5 100%)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '48px 40px',
        marginBottom: 24,
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(79,70,229,0.06)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -30, left: -30,
          width: 150, height: 150, borderRadius: '50%',
          background: 'rgba(5,150,105,0.05)',
          pointerEvents: 'none',
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'var(--indigo-lt)', border: '1px solid var(--indigo-bdr)',
          borderRadius: 20, padding: '4px 14px', marginBottom: 20,
          fontSize: 11, fontWeight: 700, color: 'var(--indigo-mid)',
          fontFamily: 'var(--mono)', letterSpacing: 0.5,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--green)', display: 'inline-block',
          }} />
          FREE · NO LOGIN · YOUR DATA STAYS IN YOUR BROWSER
        </div>

        <h1 style={{
          fontSize: 38, fontWeight: 800, letterSpacing: -1.2,
          color: 'var(--text)', lineHeight: 1.15, marginBottom: 16,
        }}>
          Indian Capital Gains<br />
          <span style={{ color: 'var(--indigo-mid)' }}>Calculator</span>
        </h1>

        <p style={{
          fontSize: 16, color: 'var(--muted)', lineHeight: 1.7,
          maxWidth: 520, margin: '0 auto 28px', fontWeight: 400,
        }}>
          Calculate your LTCG, STCG and tax liability in seconds.
          FIFO-based, ITR-ready, completely free.
          Built by a retired engineer for Indian investors.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={onGetStarted}
            style={{ minWidth: 180 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Start for Free
          </button>
          <button
            className="btn btn-outline btn-lg"
            onClick={onLoadDemo}
            style={{ minWidth: 180 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Try Demo — See it Live
          </button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--muted2)', marginTop: 14 }}>
          No credit card · No signup · Nothing stored on any server
        </p>
      </div>

      {/* ── How it works ─────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-title">How it works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: 'var(--indigo-lt)', border: '1px solid var(--indigo-bdr)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 14, color: 'var(--indigo-mid)',
              }}>{s.n}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {s.desc}
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  position: 'absolute', display: 'none',
                }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Features grid ────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 14, marginBottom: 24,
      }}>
        {FEATURES.map(f => (
          <div key={f.title} className="card-flat" style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            transition: 'box-shadow 0.2s, transform 0.15s',
          }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(79,70,229,0.1)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.boxShadow = '';
              (e.currentTarget as HTMLDivElement).style.transform = '';
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: 'var(--indigo-lt)', border: '1px solid var(--indigo-bdr)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>{f.icon}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>
                {f.title}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>
                {f.desc}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Social proof / trust ─────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 14, marginBottom: 24,
      }}>
        {/* Trust card */}
        <div className="card-flat" style={{
          borderLeft: '3px solid var(--indigo-mid)',
          background: 'var(--indigo-lt)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--indigo-mid)', marginBottom: 6 }}>
            Why trust this?
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65 }}>
            Built by a retired civil engineer who has been managing his own
            ETF portfolio for 10+ years. Every calculation mirrors the same
            logic he uses for his personal ITR. Not a startup product —
            a personal tool made public.
          </div>
        </div>

        {/* Privacy card */}
        <div className="card-flat" style={{
          borderLeft: '3px solid var(--green)',
          background: 'var(--green-lt)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', marginBottom: 6 }}>
            Your data is 100% private
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.65 }}>
            Everything stays in your browser. No account, no server storage,
            no database. We cannot see your transactions even if we wanted to.
            Close the tab — data is gone. It is completely local to your device.
          </div>
        </div>
      </div>

      {/* ── Coming soon teaser ───────────────────────────────────── */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
        border: '1px solid #4338ca',
        textAlign: 'center',
        padding: '28px 32px',
        marginBottom: 24,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: '#a5b4fc',
          letterSpacing: 1.2, fontFamily: 'var(--mono)', marginBottom: 10,
        }}>
          COMING SOON
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 8, letterSpacing: -0.5 }}>
          Monthly ETF Signals — Which ETFs to buy this month
        </div>
        <div style={{ fontSize: 13, color: '#c7d2fe', lineHeight: 1.65, maxWidth: 500, margin: '0 auto 20px' }}>
          A momentum strategy that has returned ~24% CAGR vs ~16% for Nifty 500
          since 2014. Every month end — which ETFs to hold and in what proportion.
          Regime filter. Macro filter. Post-tax backtest.
        </div>
        <EmailSignup />
      </div>

      {/* ── Final CTA ────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', paddingBottom: 8 }}>
        <button className="btn btn-primary btn-lg" onClick={onGetStarted} style={{ minWidth: 220 }}>
          Calculate My Capital Gains →
        </button>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
          Free forever · No signup · Takes 5 minutes
        </div>
      </div>

    </div>
  );
}

// ── Email signup component (inline) ──────────────────────────────────────────
function EmailSignup() {
  const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSezILUXTVXAOa95eyKI1_GYQgY3zZo4Qkxt8IAhHne5dHXVhQ/formResponse';
  const ENTRY_ID = 'entry.1757308823';

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    if (!email) return;

    // Submit to Google Form silently in background
    const data = new FormData();
    data.append(ENTRY_ID, email);
    fetch(FORM_URL, { method: 'POST', body: data, mode: 'no-cors' })
      .catch(() => { });

    form.reset();
    const btn = form.querySelector('button') as HTMLButtonElement;
    btn.textContent = '✓ You\'re on the list!';
    btn.disabled = true;
    btn.style.background = '#059669';
  };

  return (
    <form onSubmit={handleSubmit} style={{
      display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
    }}>
      <input
        name="email"
        type="email"
        placeholder="your@email.com"
        required
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 6, padding: '9px 14px',
          color: 'white', fontSize: 13, width: 240,
          fontFamily: 'var(--font)',
          outline: 'none',
        }}
      />
      <button
        type="submit"
        className="btn"
        style={{
          background: 'var(--indigo-mid)', color: 'white',
          fontWeight: 700, fontSize: 13,
        }}
      >
        Notify me when signals launch
      </button>
    </form>
  );
}

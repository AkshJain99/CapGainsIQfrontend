import type { ActiveTab } from '../../types';

interface Props {
  activeTab:      ActiveTab;
  onTabChange:    (t: ActiveTab) => void;
  hasResult:      boolean;
  onReset:        () => void;
  onBackToHome:   () => void;
}

const TABS: { id: ActiveTab; label: string; icon: string; needsResult?: boolean }[] = [
  { id: 'assets',       label: 'Assets',       icon: '◈' },
  { id: 'transactions', label: 'Transactions',  icon: '⇄' },
  { id: 'results',      label: 'Capital Gains', icon: '◎', needsResult: true },
  { id: 'fy',           label: 'FY Breakdown',  icon: '⊞', needsResult: true },
  { id: 'tax',          label: 'Tax Estimate',  icon: '₹', needsResult: true },
];

export default function Topbar({ activeTab, onTabChange, hasResult, onReset, onBackToHome }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-brand-row">
          {/* Brand — clicking goes back to home */}
          <div className="brand" onClick={onBackToHome}
            style={{ cursor: 'pointer' }}>
            <div className="brand-icon">₹</div>
            <div>
              <div className="brand-name">CapGains<span>IQ</span></div>
              <div className="brand-tag">Indian Capital Gains Calculator · FIFO · NSE/BSE</div>
            </div>
          </div>

          <div className="topbar-pills">
            {['FIFO', 'ITR-ready', 'Free'].map(p => (
              <span key={p} className="pill">{p}</span>
            ))}
            {hasResult && (
              <button className="btn btn-outline btn-sm" onClick={onReset}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                </svg>
                New Calculation
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="tab-bar" style={{ borderBottom: '1px solid var(--border)' }}>
          {TABS.map(t => {
            const locked = !!t.needsResult && !hasResult;
            return (
              <button
                key={t.id}
                className={`tab-item ${activeTab === t.id ? 'active' : ''} ${locked ? 'locked' : ''}`}
                onClick={() => !locked && onTabChange(t.id)}
                disabled={locked}
              >
                <span className="tab-icon">{t.icon}</span>
                {t.label}
                {locked && <span className="tab-lock">run first</span>}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

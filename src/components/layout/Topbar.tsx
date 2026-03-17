import type { ActiveTab } from '../../types';

interface Props {
  activeTab:    ActiveTab;
  onTabChange:  (t: ActiveTab) => void;
  hasResult:    boolean;
  isRunning:    boolean;
  onReset:      () => void;
  onResetAll:   () => void;
  onBackToHome: () => void;
}

const TABS: { id: ActiveTab; label: string; icon: string; needsResult?: boolean }[] = [
  { id: 'assets',       label: 'Assets',        icon: '◈' },
  { id: 'transactions', label: 'Transactions',   icon: '⇄' },
  { id: 'results',      label: 'Capital Gains',  icon: '◎', needsResult: true },
  { id: 'fy',           label: 'FY Breakdown',   icon: '⊞', needsResult: true },
  { id: 'tax',          label: 'Tax Estimate',   icon: '₹', needsResult: true },
];

export default function Topbar({
  activeTab, onTabChange, hasResult, isRunning,
  onReset, onResetAll, onBackToHome
}: Props) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-brand-row">
          {/* Brand */}
          <div className="brand" onClick={onBackToHome} style={{ cursor: 'pointer' }}>
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

            {/* Bug 3 fix: Reset All button — clears everything */}
            <button
              className="btn btn-outline btn-sm"
              onClick={onResetAll}
              title="Clear all data and start fresh"
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
              </svg>
              Clear All
            </button>

            {hasResult && (
              <button className="btn btn-outline btn-sm" onClick={onReset}
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
                </svg>
                Recalculate
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="tab-bar" style={{ borderBottom: '1px solid var(--border)' }}>
          {TABS.map(t => {
            const locked = !!t.needsResult && !hasResult && !isRunning;
            const isActive = activeTab === t.id;
            const showSpinner = isRunning && t.needsResult && isActive;
            return (
              <button
                key={t.id}
                className={`tab-item ${isActive ? 'active' : ''} ${locked ? 'locked' : ''}`}
                onClick={() => !locked && onTabChange(t.id)}
                disabled={locked}
              >
                {showSpinner ? (
                  <span style={{
                    display: 'inline-block', width: 10, height: 10,
                    borderRadius: '50%', border: '2px solid var(--indigo-lt)',
                    borderTopColor: 'var(--indigo-mid)',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                ) : (
                  <span className="tab-icon">{t.icon}</span>
                )}
                {t.label}
                {locked && <span className="tab-lock">run first</span>}
                {isRunning && t.needsResult && isActive && (
                  <span className="tab-lock" style={{ color: 'var(--indigo-mid)' }}>calculating...</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

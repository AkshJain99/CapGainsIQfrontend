import { useState, useCallback } from 'react';
import './index.css';
import type { Asset, Transaction, FYConfig, ActiveTab } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useCapGains } from './hooks/useCapGains';
import Topbar from './components/layout/Topbar';
import LandingPage from './components/landing/LandingPage';
import AssetsManager from './components/transactions/AssetsManager';
import TransactionsManager from './components/transactions/TransactionsManager';
import ResultsTable from './components/results/ResultsTable';
import FYBreakdown from './components/results/FYBreakdown';
import TaxEstimate from './components/results/TaxEstimate';
import TaxHarvesting from './components/results/TaxHarvesting';
import { currentFY } from './utils';
import { DEMO_ASSETS, DEMO_TRANSACTIONS } from './data/demoData';

const DEFAULT_CONFIGS: FYConfig[] = [
  { financial_year: '2021-22', equity_threshold: 365, debt_threshold: 1095, commodity_threshold: 1095 },
  { financial_year: '2022-23', equity_threshold: 365, debt_threshold: 1095, commodity_threshold: 1095 },
  { financial_year: '2023-24', equity_threshold: 365, debt_threshold: 1095, commodity_threshold: 1095 },
  { financial_year: '2024-25', equity_threshold: 365, debt_threshold: 1095, commodity_threshold: 1095 },
  { financial_year: currentFY(), equity_threshold: 365, debt_threshold: 1095, commodity_threshold: 1095 },
];

type AppView = 'landing' | 'app';

export default function App() {
  const [view, setView]             = useState<AppView>('landing');
  const [activeTab, setActiveTab]   = useState<ActiveTab>('assets');
  const [assets, setAssets]         = useLocalStorage<Asset[]>('capgains_assets', []);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('capgains_transactions', []);
  const [configs]                   = useLocalStorage<FYConfig[]>('capgains_configs', DEFAULT_CONFIGS);
  const [isDemoLoaded, setIsDemoLoaded] = useState(false);

  const { state, progress, run, reset } = useCapGains();

  // ── Enter app normally ──────────────────────────────────────────────────
  const handleGetStarted = useCallback(() => {
    setView('app');
    setActiveTab('assets');
  }, []);

  // ── Load demo data ──────────────────────────────────────────────────────
  const handleLoadDemo = useCallback(() => {
    setAssets(DEMO_ASSETS);
    setTransactions(DEMO_TRANSACTIONS);
    setIsDemoLoaded(true);
    setView('app');
    setActiveTab('transactions');
  }, [setAssets, setTransactions]);

  // ── Run calculation ─────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    setActiveTab('results');  // switch tab immediately to show loader
    await run({ assets, transactions, config: configs });
  }, [assets, transactions, configs, run]);

  // ── Reset calculation only (keep data) ─────────────────────────────────
  const handleReset = useCallback(() => {
    reset();
    setActiveTab('transactions');
  }, [reset]);

  // ── Reset EVERYTHING — clears localStorage too ──────────────────────────
  const handleResetAll = useCallback(() => {
    reset();
    setAssets([]);
    setTransactions([]);
    setIsDemoLoaded(false);
    setActiveTab('assets');
  }, [reset, setAssets, setTransactions]);

  // ── Back to landing ─────────────────────────────────────────────────────
  const handleBackToLanding = useCallback(() => {
    setView('landing');
    reset();
  }, [reset]);

  // ── Import from Zerodha ─────────────────────────────────────────────────
  // Bug 1 fix: properly set BOTH assets and transactions after import
  const handleImport = useCallback((newAssets: Asset[], newTxs: Transaction[]) => {
    setAssets(newAssets);
    setTransactions(newTxs);
    setActiveTab('transactions'); // stay on transactions tab, don't switch away
  }, [setAssets, setTransactions]);

  const hasResult  = state.status === 'done' && state.result !== null;
  const isRunning  = state.status === 'running';

  // ── Landing page ────────────────────────────────────────────────────────
  if (view === 'landing') {
    return (
      <div className="app">
        <header style={{
          background: 'var(--white)', borderBottom: '1px solid var(--border)',
          padding: '14px 28px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(15,22,40,0.06)',
        }}>
          <div className="brand">
            <div className="brand-icon">₹</div>
            <div>
              <div className="brand-name">CapGains<span>IQ</span></div>
              <div className="brand-tag">Indian Capital Gains Calculator</div>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleGetStarted}>
            Open Calculator →
          </button>
        </header>
        <main style={{ flex: 1, overflowY: 'auto', padding: '40px 24px 60px' }}>
          <LandingPage onGetStarted={handleGetStarted} onLoadDemo={handleLoadDemo} />
        </main>
      </div>
    );
  }

  // ── Main app ────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <Topbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasResult={hasResult}
        isRunning={isRunning}
        onReset={handleReset}
        onResetAll={handleResetAll}
        onBackToHome={handleBackToLanding}
      />

      <main className="main-content">

        {/* Demo banner */}
        {isDemoLoaded && !hasResult && !isRunning && (
          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <strong>Demo data loaded</strong> — 5 real Indian ETFs with sample trades across 2022-2025.
              Click <strong>Calculate Capital Gains</strong> to see the full report.
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 10 }}
                onClick={() => { setAssets([]); setTransactions([]); setIsDemoLoaded(false); }}>
                Clear demo
              </button>
            </div>
          </div>
        )}

        {/* Bug 4 fix: Loading indicator on Capital Gains tab */}
        {isRunning && activeTab === 'results' && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 20px', gap: 16,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              border: '4px solid var(--indigo-lt)',
              borderTopColor: 'var(--indigo-mid)',
              animation: 'spin 0.8s linear infinite',
            }} />
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
              Calculating Capital Gains...
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 300, textAlign: 'center' }}>
              {progress || 'Fetching live prices and running FIFO engine...'}
            </div>
          </div>
        )}

        {/* Error */}
        {state.status === 'error' && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <strong>Calculation failed:</strong> {state.error}
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 12 }} onClick={handleReset}>
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Pages */}
        {activeTab === 'assets' && (
          <AssetsManager assets={assets} onChange={setAssets} />
        )}
        {activeTab === 'transactions' && (
          <TransactionsManager
            transactions={transactions}
            assets={assets}
            onChange={setTransactions}
            onImport={handleImport}
            onRun={handleRun}
            running={isRunning}
            progress={progress}
          />
        )}
        {activeTab === 'results' && hasResult && !isRunning && (
          <ResultsTable result={state.result!} />
        )}
        {activeTab === 'fy' && hasResult && !isRunning && (
          <FYBreakdown result={state.result!} />
        )}
        {activeTab === 'tax' && hasResult && !isRunning && (
          <TaxEstimate result={state.result!} />
        )}
        {activeTab === 'harvest' && hasResult && !isRunning && (
          <TaxHarvesting result={state.result!} />
        )}
      </main>
    </div>
  );
}

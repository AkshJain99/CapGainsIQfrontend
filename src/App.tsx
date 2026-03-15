import { useState, useCallback } from 'react';
import './index.css';
import type { Asset, Transaction, FYConfig, ActiveTab } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useCapGains } from './hooks/useCapGains';
import Topbar from './components/layout/Topbar';
import AssetsManager from './components/transactions/AssetsManager';
import TransactionsManager from './components/transactions/TransactionsManager';
import ResultsTable from './components/results/ResultsTable';
import FYBreakdown from './components/results/FYBreakdown';
import TaxEstimate from './components/results/TaxEstimate';
import { currentFY } from './utils';

const DEFAULT_CONFIGS: FYConfig[] = [
  { financial_year: '2021-22', equity_threshold: 365, debt_threshold: 1095, commodity_threshold: 1095 },
  { financial_year: '2022-23', equity_threshold: 365, debt_threshold: 1095, commodity_threshold: 1095 },
  { financial_year: '2023-24', equity_threshold: 365, debt_threshold: 1095, commodity_threshold: 1095 },
  { financial_year: '2024-25', equity_threshold: 365, debt_threshold: 1095, commodity_threshold: 1095 },
  { financial_year: currentFY(), equity_threshold: 365, debt_threshold: 1095, commodity_threshold: 1095 },
];

const FEATURES = [
  { icon: '⚡', title: 'FIFO Capital Gains', desc: 'Accurate LTCG & STCG using First-In-First-Out lot matching' },
  { icon: '📊', title: 'FY-wise Breakdown', desc: 'Year-by-year summary ready to share with your CA for ITR' },
  { icon: '💰', title: 'Tax Estimate', desc: 'Correct Indian rates — pre and post Budget 2024 automatically applied' },
  { icon: '📈', title: 'Unrealised Gains', desc: 'Live portfolio value with latest prices from Yahoo Finance & MF API' },
  { icon: '🔄', title: 'XIRR per Asset', desc: 'True annualised return for each stock and mutual fund you hold' },
  { icon: '📥', title: 'Export to CSV', desc: 'Download ITR-ready report for your chartered accountant' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('assets');
  const [assets, setAssets] = useLocalStorage<Asset[]>('capgains_assets', []);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('capgains_transactions', []);
  const [configs] = useLocalStorage<FYConfig[]>('capgains_configs', DEFAULT_CONFIGS);

  const { state, progress, run, reset } = useCapGains();

  const handleRun = useCallback(async () => {
    await run({ assets, transactions, config: configs });
    setActiveTab('results');
  }, [assets, transactions, configs, run]);

  const handleReset = useCallback(() => {
    reset();
    setActiveTab('assets');
  }, [reset]);

  const hasResult = state.status === 'done' && state.result !== null;

  return (
    <div className="app">
      <Topbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasResult={hasResult}
        onReset={handleReset}
      />

      <main className="main-content">
        {/* Error */}
        {state.status === 'error' && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <strong>Calculation failed:</strong> {state.error}
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: 12 }} onClick={reset}>Try Again</button>
            </div>
          </div>
        )}

        {/* Pages */}
        {activeTab === 'assets' && <AssetsManager assets={assets} onChange={setAssets} />}
        {activeTab === 'transactions' && (
          <TransactionsManager
            transactions={transactions} assets={assets}
            onChange={setTransactions} onRun={handleRun}
            running={state.status === 'running'} progress={progress}
          />
        )}
        {activeTab === 'results' && hasResult && <ResultsTable result={state.result!} />}
        {activeTab === 'fy'      && hasResult && <FYBreakdown  result={state.result!} />}
        {activeTab === 'tax'     && hasResult && <TaxEstimate  result={state.result!} />}

        {/* Onboarding for fresh users */}
        {activeTab === 'assets' && assets.length === 0 && transactions.length === 0 && (
          <div style={{ marginTop: 36 }}>
            {/* How it works */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="section-title">How it works</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                {[
                  { n: '1', title: 'Add Assets',       desc: 'List your stocks, ETFs and mutual funds with their Yahoo Finance or MF API tickers' },
                  { n: '2', title: 'Add Transactions',  desc: 'Enter your complete buy/sell history with dates, prices, quantities and charges' },
                  { n: '3', title: 'Calculate',         desc: 'Click Calculate — we fetch live prices and run the full FIFO capital gains engine' },
                  { n: '4', title: 'Get Your Report',   desc: 'View LTCG/STCG per asset, FY breakdown, tax estimate and export for your CA' },
                ].map(s => (
                  <div key={s.n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: 'var(--indigo-lt)', border: '1px solid var(--indigo-bdr)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 13, color: 'var(--indigo-mid)', flexShrink: 0,
                    }}>{s.n}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>{s.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Features grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {FEATURES.map(f => (
                <div key={f.title} className="card-flat" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: 'var(--indigo-lt)', border: '1px solid var(--indigo-bdr)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 17, flexShrink: 0,
                  }}>{f.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button className="btn btn-primary btn-lg" onClick={() => setActiveTab('assets')}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Get Started — Add Your First Asset
              </button>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
                Your data stays in your browser — nothing is sent to any server
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

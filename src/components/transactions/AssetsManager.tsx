import { useState } from 'react';
import type { Asset, AssetClass, AssetSource } from '../../types';
import { genId } from '../../utils';
import MFSearchInput from './MFSearchInput';
import NSESearchInput from './NSESearchInput';

interface Props {
  assets:   Asset[];
  onChange: (assets: Asset[]) => void;
}

const ASSET_CLASSES: AssetClass[] = ['EQUITY', 'DEBT', 'COMMODITY', 'MF'];
const SOURCES: { value: AssetSource; label: string }[] = [
  { value: 'YF', label: 'Yahoo Finance (Stocks/ETFs)' },
  { value: 'MF', label: 'MF API — mfapi.in (Mutual Funds)' },
];
const BLANK: Omit<Asset, 'id'> = { asset_name: '', asset_class: 'EQUITY', ticker: '', source: 'YF' };
const CLASS_BADGE: Record<AssetClass, string> = {
  EQUITY: 'badge-blue', DEBT: 'badge-amber', COMMODITY: 'badge-green', MF: 'badge-indigo',
};

// ── Ticker validation ────────────────────────────────────────────────────────
function tickerStatus(asset: Asset): 'ok' | 'warn' | 'empty' {
  if (!asset.ticker.trim()) return 'empty';
  if (asset.source === 'MF') {
    return /^\d{4,8}$/.test(asset.ticker.trim()) ? 'ok' : 'warn';
  }
  // YF ticker should end in .NS or .BO
  return (asset.ticker.includes('.NS') || asset.ticker.includes('.BO')) ? 'ok' : 'warn';
}

function needsVerification(assets: Asset[]): Asset[] {
  return assets.filter(a => tickerStatus(a) !== 'ok');
}

// ── Help content per source ──────────────────────────────────────────────────
const TICKER_HELP = {
  YF: {
    title: 'Yahoo Finance Ticker (Stocks & ETFs)',
    steps: [
      'Go to finance.yahoo.com',
      'Search for your stock/ETF name',
      'Copy the ticker symbol shown (e.g. RELIANCE.NS, NIFTYBEES.NS)',
      'NSE stocks end in .NS — BSE stocks end in .BO',
    ],
    examples: [
      { name: 'Reliance Industries', ticker: 'RELIANCE.NS' },
      { name: 'NIFTYBEES ETF', ticker: 'NIFTYBEES.NS' },
      { name: 'GOLDBEES ETF', ticker: 'GOLDBEES.NS' },
      { name: 'TCS', ticker: 'TCS.NS' },
      { name: 'HDFC Bank', ticker: 'HDFCBANK.NS' },
      { name: 'ITC', ticker: 'ITC.NS' },
    ],
    link: 'https://finance.yahoo.com',
    linkText: 'Search on Yahoo Finance →',
    note: 'Tip: If a stock was imported as "ITC LIMITED" from Zerodha, the correct Yahoo ticker is just "ITC.NS"',
  },
  MF: {
    title: 'AMFI Scheme Code (Mutual Funds)',
    steps: [
      'Go to amfiindia.com → NAV History',
      'OR use mfapi.in and search your fund name',
      'Find your exact fund and copy the 4-6 digit scheme code',
      'Enter that number as the ticker',
    ],
    examples: [
      { name: 'ICICI Pru Nifty 50 Index Fund', ticker: '120505' },
      { name: 'HDFC Nifty 50 Index Fund', ticker: '118989' },
      { name: 'ICICI Pru Gilt Fund', ticker: '120503' },
      { name: 'Nippon India Gilt Fund', ticker: '101206' },
      { name: 'ICICI Pru Gold ETF FoF', ticker: '120831' },
      { name: 'HDFC Gold Fund', ticker: '107280' },
    ],
    link: 'https://www.mfapi.in',
    linkText: 'Search on mfapi.in →',
    note: 'Tip: The scheme code is a 4-6 digit number. Do NOT use the fund name — only the number works.',
  },
};

export default function AssetsManager({ assets, onChange }: Props) {
  const [form,       setForm]       = useState({ ...BLANK });
  const [editId,     setEditId]     = useState<string | null>(null);
  const [error,      setError]      = useState('');
  const [showHelp,   setShowHelp]   = useState<'YF' | 'MF' | null>(null);
  const [dismissed,  setDismissed]  = useState(false);

  const unverified    = needsVerification(assets);
  const showBanner    = !dismissed && unverified.length > 0;
  const mfAssets      = assets.filter(a => a.source === 'MF');
  const stockAssets   = assets.filter(a => a.source === 'YF');

  const validate = () => {
    if (!form.asset_name.trim()) return 'Asset name is required';
    if (assets.some(a => a.id !== editId &&
      a.asset_name === form.asset_name.trim().toUpperCase()))
      return 'Asset name already exists';
    return '';
  };

  const handleSave = () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    const entry = { ...form, asset_name: form.asset_name.trim().toUpperCase() };
    if (editId) {
      onChange(assets.map(a => a.id === editId ? { ...entry, id: editId } : a));
      setEditId(null);
    } else {
      onChange([...assets, { ...entry, id: genId() }]);
    }
    setForm({ ...BLANK });
  };

  const handleEdit = (a: Asset) => {
    setForm({ asset_name: a.asset_name, asset_class: a.asset_class, ticker: a.ticker, source: a.source });
    setEditId(a.id);
    setError('');
  };

  const handleDelete = (id: string) => {
    onChange(assets.filter(a => a.id !== id));
    if (editId === id) { setEditId(null); setForm({ ...BLANK }); }
  };

  const help = showHelp ? TICKER_HELP[showHelp] : null;

  return (
    <div className="fade-up">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Assets</h1>
          <p className="page-sub">Stocks, ETFs and mutual funds in your portfolio</p>
        </div>
        {assets.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {stockAssets.length > 0 && (
              <span className="badge badge-blue">{stockAssets.length} stocks/ETFs</span>
            )}
            {mfAssets.length > 0 && (
              <span className="badge badge-indigo">{mfAssets.length} mutual funds</span>
            )}
          </div>
        )}
      </div>

      {/* ── Verification banner ─────────────────────────────────── */}
      {showBanner && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 10, padding: '14px 16px', marginBottom: 20,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 4 }}>
              {unverified.length} asset{unverified.length > 1 ? 's' : ''} need ticker verification
            </div>
            <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6, marginBottom: 8 }}>
              Correct tickers are required to fetch live prices and calculate unrealised gains.
              Assets imported from Zerodha CSV may have incorrect or missing tickers.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {unverified.filter(a => a.source === 'YF').length > 0 && (
                <button
                  className="btn btn-sm"
                  style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontWeight: 700 }}
                  onClick={() => setShowHelp('YF')}
                >
                  📈 How to find stock tickers
                </button>
              )}
              {unverified.filter(a => a.source === 'MF').length > 0 && (
                <button
                  className="btn btn-sm"
                  style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontWeight: 700 }}
                  onClick={() => setShowHelp('MF')}
                >
                  🏦 How to find AMFI codes
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => setDismissed(true)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Help panel ──────────────────────────────────────────── */}
      {help && showHelp && (
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 10, padding: '16px 18px', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e40af' }}>
              {showHelp === 'MF' ? '🏦' : '📈'} {help.title}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowHelp(null)}>✕ Close</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Steps */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Steps
              </div>
              {help.steps.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, color: '#1e3a8a' }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%', background: '#bfdbfe',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, flexShrink: 0, color: '#1e40af',
                  }}>{i + 1}</span>
                  {s}
                </div>
              ))}
              <a
                href={help.link} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: '#2563eb', fontWeight: 700, display: 'block', marginTop: 8 }}
              >
                {help.linkText}
              </a>
            </div>

            {/* Examples */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Common examples
              </div>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', color: '#64748b', paddingBottom: 4, fontWeight: 600 }}>Fund / Stock</th>
                    <th style={{ textAlign: 'left', color: '#64748b', paddingBottom: 4, fontWeight: 600 }}>
                      {showHelp === 'MF' ? 'AMFI Code' : 'Ticker'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {help.examples.map((ex, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.6)' : 'transparent' }}>
                      <td style={{ padding: '3px 6px', color: '#1e3a8a' }}>{ex.name}</td>
                      <td style={{ padding: '3px 6px' }}>
                        <code style={{
                          fontFamily: 'var(--mono)', background: '#dbeafe',
                          padding: '1px 5px', borderRadius: 3, color: '#1e40af', fontSize: 11,
                          cursor: 'pointer',
                        }}
                          onClick={() => setForm(f => ({ ...f, ticker: ex.ticker }))}
                          title="Click to use this ticker"
                        >
                          {ex.ticker}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, fontStyle: 'italic' }}>
                💡 {help.note}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit form ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">{editId ? '✎ Edit Asset' : '+ Add New Asset'}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr 1.3fr', gap: 14, marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">Asset Name *</label>
            <input className="input" placeholder="e.g. NIFTYBEES, ITC, HDFC GOLD FUND"
              value={form.asset_name}
              onChange={e => setForm(f => ({ ...f, asset_name: e.target.value.toUpperCase() }))} />
          </div>

          <div className="form-group">
            <label className="form-label">Asset Class</label>
            <select className="select input" value={form.asset_class}
              onChange={e => setForm(f => ({ ...f, asset_class: e.target.value as AssetClass }))}>
              {ASSET_CLASSES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>
                {form.source === 'MF' ? 'AMFI Scheme Code *' : 'Yahoo Finance Ticker *'}
              </span>
              {form.source === 'YF' && (
                <button
                  type="button"
                  onClick={() => setShowHelp(form.source)}
                  style={{ fontSize: 10, color: 'var(--indigo-mid)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  How to find? →
                </button>
              )}
            </label>

            {form.source === 'MF' ? (
              <MFSearchInput
                value={form.ticker}
                onChange={(code) => setForm(f => ({ ...f, ticker: code }))}
              />
            ) : (
              <NSESearchInput
                value={form.ticker}
                onChange={(ticker) => setForm(f => ({ ...f, ticker }))}
              />
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Price Source</label>
            <select className="select input" value={form.source}
              onChange={e => {
                const src = e.target.value as AssetSource;
                setForm(f => ({ ...f, source: src, ticker: '' }));
                setShowHelp(src);
              }}>
              {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 12, padding: '8px 12px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleSave}>
            {editId ? '✓ Update Asset' : '+ Add Asset'}
          </button>
          {editId && (
            <button className="btn btn-ghost" onClick={() => { setEditId(null); setForm({ ...BLANK }); setError(''); setShowHelp(null); }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ── Assets table ────────────────────────────────────────── */}
      {assets.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">◈</div>
            <div className="empty-title">No assets added yet</div>
            <div className="empty-sub">Add assets manually above or import from Zerodha CSV in the Transactions tab</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Asset Name</th>
                  <th>Class</th>
                  <th>Ticker / AMFI Code</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th style={{ width: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((a, i) => {
                  const status = tickerStatus(a);
                  return (
                    <tr key={a.id} style={{ background: editId === a.id ? '#f8f7ff' : '' }}>
                      <td className="mono" style={{ color: 'var(--muted2)', fontSize: 11 }}>{i + 1}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 12 }}>{a.asset_name}</span>
                      </td>
                      <td>
                        <span className={`badge ${CLASS_BADGE[a.asset_class]}`}>{a.asset_class}</span>
                      </td>
                      <td>
                        {a.ticker ? (
                          <span className="mono" style={{
                            fontSize: 12, color: 'var(--text2)',
                            background: status === 'warn' ? '#fef3c7' : 'var(--surface3)',
                            padding: '2px 7px', borderRadius: 4,
                          }}>
                            {a.ticker}
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--red)', fontStyle: 'italic' }}>not set</span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-gray" style={{ fontSize: 10 }}>
                          {a.source === 'YF' ? '📈 Yahoo Finance' : '🏦 MF API'}
                        </span>
                      </td>
                      <td>
                        {status === 'ok' && (
                          <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>✓ Ready</span>
                        )}
                        {status === 'warn' && (
                          <button
                            style={{ fontSize: 11, color: '#b45309', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            onClick={() => { handleEdit(a); setShowHelp(a.source); }}
                          >
                            ⚠ Fix ticker
                          </button>
                        )}
                        {status === 'empty' && (
                          <button
                            style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            onClick={() => { handleEdit(a); setShowHelp(a.source); }}
                          >
                            ✕ Add ticker
                          </button>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn-icon" title="Edit" onClick={() => { handleEdit(a); setShowHelp(null); }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button className="btn-icon danger" title="Delete" onClick={() => handleDelete(a.id)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6"/>
                              <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Quick reference ─────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 12, marginTop: 16,
      }}>
        <div className="info-box" style={{ cursor: 'pointer' }} onClick={() => setShowHelp('YF')}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
            📈 Stocks & ETFs — Yahoo Finance
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
            Format: <code style={{ fontFamily: 'var(--mono)', background: '#dbeafe', padding: '1px 4px', borderRadius: 3 }}>SYMBOL.NS</code> for NSE,{' '}
            <code style={{ fontFamily: 'var(--mono)', background: '#dbeafe', padding: '1px 4px', borderRadius: 3 }}>SYMBOL.BO</code> for BSE.{' '}
            <span style={{ color: 'var(--indigo-mid)', fontWeight: 600 }}>Click for examples →</span>
          </div>
        </div>
        <div className="info-box" style={{ cursor: 'pointer' }} onClick={() => setShowHelp('MF')}>
          <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
            🏦 Mutual Funds — AMFI Scheme Code
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
            Use the 4-6 digit scheme code from{' '}
            <a href="https://www.mfapi.in" target="_blank" rel="noreferrer" style={{ color: 'var(--indigo-mid)' }}>mfapi.in</a>
            {' '}or{' '}
            <a href="https://www.amfiindia.com/net-asset-value" target="_blank" rel="noreferrer" style={{ color: 'var(--indigo-mid)' }}>amfiindia.com</a>.{' '}
            <span style={{ color: 'var(--indigo-mid)', fontWeight: 600 }}>Click for examples →</span>
          </div>
        </div>
      </div>

    </div>
  );
}

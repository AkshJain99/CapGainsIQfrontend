import { useState } from 'react';
import type { CapGainsResult } from '../../types';
import { fmtINR, fmtPct, fmtNum, exportToCSV, gainColor } from '../../utils';
import TaxHarvesting from './TaxHarvesting';
import PortfolioHealth from './PortfolioHealth';

interface Props { result: CapGainsResult }

// ── Smart grouped warnings ────────────────────────────────────────────────
function WarningsSummary({ warnings }: { warnings: string[] }) {
  const [expanded, setExpanded] = useState(false);

  const priceWarnings    = warnings.filter(w => w.includes('Could not fetch live price'));
  const unmatchedWarnings= warnings.filter(w => w.includes('unmatched sell units'));
  const otherWarnings    = warnings.filter(w =>
    !w.includes('Could not fetch live price') && !w.includes('unmatched sell units')
  );

  return (
    <div style={{ marginBottom: 20 }}>

      {/* Price fetch warnings — grouped */}
      {priceWarnings.length > 0 && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fde68a',
          borderRadius: 10, padding: '14px 16px', marginBottom: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 4 }}>
                ⚠ Live prices unavailable for {priceWarnings.length} asset{priceWarnings.length > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.65, marginBottom: 8 }}>
                Unrealised gains show ₹0 for these assets. This is usually because:
                <br />• <strong>Mutual funds</strong> need an AMFI scheme code (not a Yahoo ticker)
                <br />• <strong>Stocks</strong> imported from Zerodha have full legal names — Yahoo needs short NSE symbols
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a
                  href="https://www.mfapi.in"
                  target="_blank" rel="noreferrer"
                  style={{
                    fontSize: 11, fontWeight: 700, color: '#1e40af',
                    background: '#dbeafe', border: '1px solid #bfdbfe',
                    borderRadius: 5, padding: '3px 10px', textDecoration: 'none',
                  }}
                >
                  🏦 Find AMFI codes on mfapi.in →
                </a>
                <a
                  href="https://finance.yahoo.com"
                  target="_blank" rel="noreferrer"
                  style={{
                    fontSize: 11, fontWeight: 700, color: '#065f46',
                    background: '#d1fae5', border: '1px solid #6ee7b7',
                    borderRadius: 5, padding: '3px 10px', textDecoration: 'none',
                  }}
                >
                  📈 Find stock tickers on Yahoo Finance →
                </a>
                <span style={{ fontSize: 11, color: '#92400e' }}>
                  Then go to <strong>Assets tab</strong> → edit each asset → fix the ticker
                </span>
              </div>
            </div>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                fontSize: 11, color: '#92400e', background: 'none',
                border: '1px solid #fde68a', borderRadius: 5,
                padding: '3px 8px', cursor: 'pointer', flexShrink: 0, marginLeft: 12,
              }}
            >
              {expanded ? 'Hide' : `Show ${priceWarnings.length}`}
            </button>
          </div>
          {expanded && (
            <div style={{ marginTop: 10, maxHeight: 200, overflowY: 'auto' }}>
              {priceWarnings.map((w, i) => (
                <div key={i} style={{ fontSize: 11, color: '#92400e', padding: '2px 0', borderTop: i > 0 ? '1px solid #fde68a' : 'none' }}>
                  {w.replace('Could not fetch live price for ', '').replace('. Unrealised gains will show ₹0.', '')}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unmatched sell warnings — grouped */}
      {unmatchedWarnings.length > 0 && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 10, padding: '14px 16px', marginBottom: 10,
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#dc2626', marginBottom: 4 }}>
            ⚠ Incomplete transaction history ({unmatchedWarnings.length} unmatched sells)
          </div>
          <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.65 }}>
            Some sell transactions have no matching buy transactions. This usually means:
            <br />• You imported only recent data — older buy transactions are missing
            <br />• The buys happened before the date range you imported
            <br /><br />
            <strong>Fix:</strong> Import your complete transaction history from when you first started investing.
            Capital gains on available transactions are still calculated correctly.
          </div>
        </div>
      )}

      {/* Other warnings */}
      {otherWarnings.map((w, i) => (
        <div key={i} className="alert alert-warn" style={{ marginBottom: 8, fontSize: 12 }}>
          ⚠ {w}
        </div>
      ))}

    </div>
  );
}

export default function ResultsTable({ result }: Props) {
  const { capital_gains, summary, warnings } = result;

  const handleExport = () => {
    exportToCSV(
      ['Asset','Class','Ticker','Latest Price','Remaining Units','Portfolio Value','Intraday CG','R-LTCG','R-STCG','R-Total','U-LTCG','U-STCG','U-Total','XIRR%','Total Charges'],
      capital_gains.map(r => [r.asset_name,r.asset_class,r.ticker,r.latest_price,r.remaining_units,r.current_portfolio_value,r.intraday_cg,r.r_ltcg,r.r_stcg,r.r_total,r.u_ltcg,r.u_stcg,r.u_total,r.xirr,r.total_charges]),
      'capital_gains.csv'
    );
  };

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Capital Gains Report</h1>
          <p className="page-sub">FIFO-based realised & unrealised gains · {result.computed_at}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleExport}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Export CSV
        </button>
      </div>

      {warnings.length > 0 && <WarningsSummary warnings={warnings} />}

      {/* Summary stats */}
      <div className="stat-grid">
        {[
          { label: 'Portfolio Value',   value: fmtINR(summary.current_value),         sub: `XIRR: ${fmtPct(summary.overall_xirr)}`,          color: 'var(--text)',    accent: 'var(--indigo-mid)' },
          { label: 'Realised LTCG',     value: fmtINR(summary.r_ltcg),                sub: 'Long-term gains',                                  color: gainColor(summary.r_ltcg) },
          { label: 'Realised STCG',     value: fmtINR(summary.r_stcg),                sub: 'Short-term gains',                                 color: gainColor(summary.r_stcg) },
          { label: 'Unrealised Gains',  value: fmtINR(summary.total_unrealised_pnl),  sub: `LTCG ${fmtINR(summary.u_ltcg)} · STCG ${fmtINR(summary.u_stcg)}`, color: gainColor(summary.total_unrealised_pnl) },
          { label: 'Total Charges',     value: fmtINR(summary.total_charges),          sub: 'Brokerage + STT + GST',                            color: 'var(--amber)' },
          { label: 'Intraday CG',       value: fmtINR(summary.r_intraday),             sub: 'Speculative business income',                      color: gainColor(summary.r_intraday) },
        ].map(s => (
          <div className="stat-card" key={s.label}
            style={s.label === 'Portfolio Value' ? { borderLeft: '3px solid var(--indigo-mid)' } : {}}>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color, fontSize: 18 }}>{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Main table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Class</th>
                <th className="right">Price</th>
                <th className="right">Units Left</th>
                <th className="right">Value</th>
                <th className="right">R-LTCG</th>
                <th className="right">R-STCG</th>
                <th className="right">R-Total</th>
                <th className="right">U-LTCG</th>
                <th className="right">U-STCG</th>
                <th className="right">XIRR</th>
              </tr>
            </thead>
            <tbody>
              {capital_gains.map((row, i) => (
                <tr key={i} className={row.is_grand_total ? 'grand-total' : row.is_subtotal ? 'subtotal' : ''}>
                  <td style={{ fontWeight: row.is_subtotal || row.is_grand_total ? 700 : 600, color: 'var(--text)' }}>
                    {row.asset_name}
                  </td>
                  <td>
                    {!row.is_subtotal && !row.is_grand_total && row.asset_class && (
                      <span className={`badge ${row.asset_class === 'EQUITY' ? 'badge-blue' : row.asset_class === 'DEBT' ? 'badge-amber' : row.asset_class === 'MF' ? 'badge-indigo' : 'badge-green'}`}>
                        {row.asset_class}
                      </span>
                    )}
                  </td>
                  <td className="mono right">{row.latest_price ? fmtINR(row.latest_price, 2) : '—'}</td>
                  <td className="mono right">{row.remaining_units ? fmtNum(row.remaining_units, 3) : '—'}</td>
                  <td className="mono right" style={{ fontWeight: 600 }}>{row.current_portfolio_value ? fmtINR(row.current_portfolio_value) : '—'}</td>
                  <td className="mono right" style={{ color: row.r_ltcg !== 0 ? gainColor(row.r_ltcg) : 'var(--muted2)' }}>{row.r_ltcg !== 0 ? fmtINR(row.r_ltcg) : '—'}</td>
                  <td className="mono right" style={{ color: row.r_stcg !== 0 ? gainColor(row.r_stcg) : 'var(--muted2)' }}>{row.r_stcg !== 0 ? fmtINR(row.r_stcg) : '—'}</td>
                  <td className="mono right" style={{ color: gainColor(row.r_total), fontWeight: 700 }}>{fmtINR(row.r_total)}</td>
                  <td className="mono right" style={{ color: row.u_ltcg !== 0 ? gainColor(row.u_ltcg) : 'var(--muted2)' }}>{row.u_ltcg !== 0 ? fmtINR(row.u_ltcg) : '—'}</td>
                  <td className="mono right" style={{ color: row.u_stcg !== 0 ? gainColor(row.u_stcg) : 'var(--muted2)' }}>{row.u_stcg !== 0 ? fmtINR(row.u_stcg) : '—'}</td>
                  <td className="mono right" style={{ color: row.xirr ? gainColor(row.xirr) : 'var(--muted2)' }}>{row.xirr ? fmtPct(row.xirr) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Harvesting Suggestions */}
      <TaxHarvesting result={result} />

      {/* Portfolio Health Score */}
      <PortfolioHealth result={result} />
    </div>
  );
}

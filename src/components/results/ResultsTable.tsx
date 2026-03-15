import type { CapGainsResult } from '../../types';
import { fmtINR, fmtPct, fmtNum, exportToCSV, gainColor } from '../../utils';

interface Props { result: CapGainsResult }

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

      {warnings.map((w, i) => (
        <div key={i} className="alert alert-warn" style={{ marginBottom: 10 }}>⚠ {w}</div>
      ))}

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
    </div>
  );
}

import type { CapGainsResult } from '../../types';
import CarryForward from './CarryForward';
import { fmtINR, exportToCSV, gainColor } from '../../utils';

interface Props { result: CapGainsResult }

export default function FYBreakdown({ result }: Props) {
  const { fy_breakdown } = result;

  const handleExport = () => {
    exportToCSV(
      ['FY', 'Intraday CG', 'R-STCG', 'R-LTCG', 'Total CG'],
      fy_breakdown.map(r => [r.financial_year, r.intraday_cg, r.r_stcg, r.r_ltcg, r.total_cg]),
      'fy_breakdown.csv'
    );
  };

  const maxAbs = Math.max(...fy_breakdown.map(r => Math.abs(r.total_cg)), 1);
  const totals = {
    intraday: fy_breakdown.reduce((s,r) => s + r.intraday_cg, 0),
    stcg:     fy_breakdown.reduce((s,r) => s + r.r_stcg, 0),
    ltcg:     fy_breakdown.reduce((s,r) => s + r.r_ltcg, 0),
    total:    fy_breakdown.reduce((s,r) => s + r.total_cg, 0),
  };

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">FY Breakdown</h1>
          <p className="page-sub">Year-by-year capital gains summary — share with your CA for ITR filing</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleExport}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Export CSV
        </button>
      </div>

      {/* Visual bars */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="section-title">Year-wise Overview</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fy_breakdown.map(fy => {
            const pct = Math.min(100, (Math.abs(fy.total_cg) / maxAbs) * 100);
            const positive = fy.total_cg >= 0;
            return (
              <div key={fy.financial_year} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 68, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: 'var(--text2)', flexShrink: 0 }}>
                  {fy.financial_year}
                </div>
                <div style={{ flex: 1, height: 10, background: 'var(--bg2)', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%', borderRadius: 5,
                    background: positive ? 'var(--green)' : 'var(--red)',
                    opacity: 0.75,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ width: 120, fontFamily: 'var(--mono)', fontSize: 13, textAlign: 'right', fontWeight: 700, color: gainColor(fy.total_cg), flexShrink: 0 }}>
                  {fmtINR(fy.total_cg)}
                </div>
                <div style={{ width: 90, fontSize: 11, color: 'var(--muted)', textAlign: 'right', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                  L {fmtINR(fy.r_ltcg, 0)}
                </div>
                <div style={{ width: 90, fontSize: 11, color: 'var(--muted)', textAlign: 'right', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                  S {fmtINR(fy.r_stcg, 0)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Financial Year</th>
                <th className="right">Intraday CG</th>
                <th className="right">R-STCG</th>
                <th className="right">R-LTCG</th>
                <th className="right">Total CG</th>
                <th className="center">Status</th>
              </tr>
            </thead>
            <tbody>
              {fy_breakdown.map(fy => (
                <tr key={fy.financial_year}>
                  <td style={{ fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--text)' }}>{fy.financial_year}</td>
                  <td className="mono right" style={{ color: fy.intraday_cg !== 0 ? gainColor(fy.intraday_cg) : 'var(--muted2)' }}>
                    {fy.intraday_cg !== 0 ? fmtINR(fy.intraday_cg) : '—'}
                  </td>
                  <td className="mono right" style={{ color: fy.r_stcg !== 0 ? gainColor(fy.r_stcg) : 'var(--muted2)' }}>
                    {fy.r_stcg !== 0 ? fmtINR(fy.r_stcg) : '—'}
                  </td>
                  <td className="mono right" style={{ color: fy.r_ltcg !== 0 ? gainColor(fy.r_ltcg) : 'var(--muted2)' }}>
                    {fy.r_ltcg !== 0 ? fmtINR(fy.r_ltcg) : '—'}
                  </td>
                  <td className="mono right" style={{ color: gainColor(fy.total_cg), fontWeight: 700, fontSize: 14 }}>
                    {fmtINR(fy.total_cg)}
                  </td>
                  <td className="center">
                    {fy.total_cg > 0
                      ? <span className="badge badge-red">Taxable</span>
                      : fy.total_cg < 0
                        ? <span className="badge badge-green">Loss → Carry Fwd</span>
                        : <span className="badge badge-gray">Nil</span>
                    }
                  </td>
                </tr>
              ))}
              <tr className="grand-total">
                <td>All Years</td>
                <td className="mono right">{fmtINR(totals.intraday)}</td>
                <td className="mono right">{fmtINR(totals.stcg)}</td>
                <td className="mono right">{fmtINR(totals.ltcg)}</td>
                <td className="mono right" style={{ fontSize: 15 }}>{fmtINR(totals.total)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="info-box" style={{ marginTop: 16 }}>
        <strong>ITR Filing tip:</strong> Losses can be carried forward for 8 years.
        LTCG losses offset only LTCG gains. STCG losses offset both STCG and LTCG.
        Share this breakdown with your CA for Schedule CG in ITR-2/3.
      </div>

      <CarryForward result={result} />
    </div>
  );
}

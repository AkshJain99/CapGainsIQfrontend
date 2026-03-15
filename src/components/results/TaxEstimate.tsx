import type { CapGainsResult } from '../../types';
import { fmtINR, calcTax, currentFY } from '../../utils';

interface Props { result: CapGainsResult }

export default function TaxEstimate({ result }: Props) {
  const { fy_breakdown } = result;
  const curFY = currentFY();

  const grandTaxL = fy_breakdown.reduce((s,r) => { const { taxL } = calcTax(r.r_ltcg, r.r_stcg, r.financial_year); return s + taxL; }, 0);
  const grandTaxS = fy_breakdown.reduce((s,r) => { const { taxS } = calcTax(r.r_ltcg, r.r_stcg, r.financial_year); return s + taxS; }, 0);

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Tax Estimate</h1>
          <p className="page-sub">Estimated Indian capital gains tax — SEBI/IT Act rates</p>
        </div>
      </div>

      {/* Rate cards */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <div className="card" style={{ borderLeft: '3px solid var(--amber)', borderColor: 'var(--amber-bdr)' }}>
          <div className="section-title">Pre FY2024-25 rates</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>LTCG</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>
                10% above ₹1,00,000 exemption
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>STCG</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>15%</span>
            </div>
          </div>
        </div>
        <div className="card" style={{ borderLeft: '3px solid var(--indigo-mid)', borderColor: 'var(--indigo-bdr)' }}>
          <div className="section-title">FY2024-25 onwards (Budget 2024)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>LTCG</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>
                12.5% above ₹1,25,000 exemption
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>STCG</span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>20%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--red)' }}>
          <div className="stat-label">Total LTCG Tax</div>
          <div className="stat-value" style={{ color: grandTaxL > 0 ? 'var(--red)' : 'var(--green)', fontSize: 22 }}>
            {fmtINR(grandTaxL)}
          </div>
          <div className="stat-sub">All financial years</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--amber)' }}>
          <div className="stat-label">Total STCG Tax</div>
          <div className="stat-value" style={{ color: grandTaxS > 0 ? 'var(--red)' : 'var(--green)', fontSize: 22 }}>
            {fmtINR(grandTaxS)}
          </div>
          <div className="stat-sub">All financial years</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--indigo-mid)', background: 'var(--indigo-lt)' }}>
          <div className="stat-label">Total Estimated Tax</div>
          <div className="stat-value" style={{ color: (grandTaxL + grandTaxS) > 0 ? 'var(--red)' : 'var(--green)', fontSize: 22 }}>
            {fmtINR(grandTaxL + grandTaxS)}
          </div>
          <div className="stat-sub">Excl. surcharge & cess</div>
        </div>
      </div>

      {/* FY table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Financial Year</th>
                <th className="right">R-LTCG</th>
                <th className="right">R-STCG</th>
                <th className="right">Exemption</th>
                <th className="right">Effective LTCG</th>
                <th className="right">LTCG Tax</th>
                <th className="right">STCG Tax</th>
                <th className="right">Total Tax</th>
              </tr>
            </thead>
            <tbody>
              {fy_breakdown.map(fy => {
                const { taxL, taxS, exemption, ltcgRate, stcgRate } = calcTax(fy.r_ltcg, fy.r_stcg, fy.financial_year);
                const total = taxL + taxS;
                const effectiveLtcg = Math.max(0, fy.r_ltcg - exemption);
                const isCurrent = fy.financial_year === curFY;
                return (
                  <tr key={fy.financial_year} style={{ background: isCurrent ? 'var(--indigo-lt)' : '' }}>
                    <td style={{ fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                      {fy.financial_year}
                      {isCurrent && <span className="badge badge-indigo" style={{ marginLeft: 8, fontSize: 9 }}>current</span>}
                    </td>
                    <td className="mono right" style={{ color: fy.r_ltcg > 0 ? 'var(--amber)' : 'var(--muted2)' }}>{fmtINR(fy.r_ltcg)}</td>
                    <td className="mono right" style={{ color: fy.r_stcg > 0 ? 'var(--amber)' : 'var(--muted2)' }}>{fmtINR(fy.r_stcg)}</td>
                    <td className="mono right" style={{ color: 'var(--green)', fontWeight: 600 }}>{fmtINR(exemption)}</td>
                    <td className="mono right">{fmtINR(effectiveLtcg)}</td>
                    <td className="mono right">
                      {taxL > 0 ? (
                        <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                          {fmtINR(taxL)}
                          <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>@{ltcgRate}%</span>
                        </span>
                      ) : <span style={{ color: 'var(--muted2)' }}>—</span>}
                    </td>
                    <td className="mono right">
                      {taxS > 0 ? (
                        <span style={{ color: 'var(--red)', fontWeight: 600 }}>
                          {fmtINR(taxS)}
                          <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>@{stcgRate}%</span>
                        </span>
                      ) : <span style={{ color: 'var(--muted2)' }}>—</span>}
                    </td>
                    <td className="mono right" style={{ fontWeight: 800, fontSize: 14, color: total > 0 ? 'var(--red)' : 'var(--muted2)' }}>
                      {total > 0 ? fmtINR(total) : '—'}
                    </td>
                  </tr>
                );
              })}
              <tr className="grand-total">
                <td>Total</td>
                <td className="mono right">{fmtINR(fy_breakdown.reduce((s,r)=>s+r.r_ltcg,0))}</td>
                <td className="mono right">{fmtINR(fy_breakdown.reduce((s,r)=>s+r.r_stcg,0))}</td>
                <td /><td />
                <td className="mono right">{fmtINR(grandTaxL)}</td>
                <td className="mono right">{fmtINR(grandTaxS)}</td>
                <td className="mono right" style={{ fontSize: 15 }}>{fmtINR(grandTaxL + grandTaxS)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="alert alert-warn" style={{ marginTop: 16 }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <strong>Disclaimer:</strong> This is an estimate only. Surcharge and 4% health & education cess are not included.
          Prior-year carry-forward losses are not applied. Intraday gains are taxed as business income at slab rates.
          Please consult your CA before filing ITR.
        </div>
      </div>
    </div>
  );
}

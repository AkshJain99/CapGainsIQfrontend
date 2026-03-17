import type { CapGainsResult } from '../../types';
import { fmtINR } from '../../utils';
import { currentFYRule as currentTaxRule } from '../../config/taxRules';

interface Props { result: CapGainsResult }
interface CFRow { fy: string; lossBooked: number; offsetUsed: number; remaining: number; expiryFY: string; expired: boolean; }

function buildCFTable(result: CapGainsResult): CFRow[] {
  const rows: CFRow[] = [];
  result.fy_breakdown.forEach(fy => {
    const totalCG = fy.total_cg + fy.intraday_cg;
    if (totalCG < 0) {
      const startYear = parseInt(fy.financial_year.split('-')[0]);
      rows.push({ fy: fy.financial_year, lossBooked: Math.abs(totalCG), offsetUsed: 0, remaining: Math.abs(totalCG), expiryFY: `${startYear + 8}-${String(startYear + 9).slice(2)}`, expired: false });
    } else if (totalCG > 0) {
      let g = totalCG;
      rows.forEach(r => { if (r.remaining > 0 && !r.expired && g > 0) { const o = Math.min(r.remaining, g); r.offsetUsed += o; r.remaining -= o; g -= o; } });
    }
  });
  const cy = parseInt(currentTaxRule().fy.split('-')[0]);
  rows.forEach(r => { if (cy - parseInt(r.fy.split('-')[0]) >= 8) r.expired = true; });
  return rows;
}

export default function CarryForward({ result }: Props) {
  const rows = buildCFTable(result).filter(r => r.lossBooked > 0);
  const totalActive = rows.filter(r => !r.expired && r.remaining > 0).reduce((s, r) => s + r.remaining, 0);
  const totalExpired = rows.filter(r => r.expired && r.remaining > 0).reduce((s, r) => s + r.remaining, 0);

  if (rows.length === 0) return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="section-title">📋 Carry Forward Loss Tracker</div>
      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>No carry forward losses. All years profitable.
      </div>
    </div>
  );

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 3 }}>📋 Carry Forward Loss Tracker</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Losses can offset future gains for up to 8 years</div>
        </div>
        {totalActive > 0 && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#2563eb', fontWeight: 700 }}>ACTIVE CARRY FORWARD</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1d4ed8' }}>{fmtINR(totalActive)}</div>
          </div>
        )}
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>FY</th><th className="right">Loss Booked</th><th className="right">Offset Used</th>
              <th className="right">Remaining</th><th className="center">Expires</th><th className="center">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.fy} style={{ opacity: r.expired ? 0.5 : 1 }}>
                <td style={{ fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--text)' }}>{r.fy}</td>
                <td className="mono right" style={{ color: '#dc2626' }}>{fmtINR(r.lossBooked)}</td>
                <td className="mono right" style={{ color: 'var(--green)' }}>{r.offsetUsed > 0 ? fmtINR(r.offsetUsed) : '—'}</td>
                <td className="mono right" style={{ fontWeight: 700, color: r.remaining > 0 ? '#2563eb' : 'var(--muted2)' }}>{r.remaining > 0 ? fmtINR(r.remaining) : '—'}</td>
                <td className="center" style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{r.expiryFY}</td>
                <td className="center">
                  {r.expired ? <span className="badge badge-gray">Expired</span>
                    : r.remaining <= 0 ? <span className="badge badge-green">Fully Used</span>
                    : <span className="badge badge-blue">Active</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalActive > 0 && <div style={{ marginTop: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#1e40af', lineHeight: 1.6 }}><strong>💡 {fmtINR(totalActive)} in active carry-forward losses</strong> can offset future gains. Mention to your CA when filing ITR.</div>}
      {totalExpired > 0 && <div style={{ marginTop: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'var(--muted)' }}>⚠ {fmtINR(totalExpired)} in losses expired beyond 8-year limit.</div>}
    </div>
  );
}

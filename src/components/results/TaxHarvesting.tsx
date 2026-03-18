/**
 * TaxHarvesting.tsx
 * Actionable tax saving suggestions. Logic in taxRules.ts only.
 */
import type { CapGainsResult } from '../../types';
import { fmtINR } from '../../utils';
import { currentFYRule as currentTaxRule } from '../../config/taxRules';

interface Props { result: CapGainsResult }
interface Suggestion {
  type: 'harvest_gain' | 'harvest_loss' | 'stcg_to_ltcg';
  asset: string; message: string; saving: number; action: string;
  urgency: 'high' | 'medium' | 'low';
}

function generateSuggestions(result: CapGainsResult): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const rule = currentTaxRule();
  const fyData = result.fy_breakdown.find(f => f.financial_year === rule.fy);
  const currentLTCG = fyData?.r_ltcg ?? result.summary.r_ltcg;
  const assetRows = result.capital_gains.filter(r => !r.is_subtotal && !r.is_grand_total);
  const exemptionLeft = Math.max(0, rule.ltcg_exemption - currentLTCG);

  // 1. Harvest unrealised LTCG within exemption
  if (exemptionLeft > 5000) {
    assetRows.filter(r => r.u_ltcg > 2000).forEach(row => {
      const gain = Math.min(row.u_ltcg, exemptionLeft);
      const saved = gain * (rule.ltcg_rate / 100);
      if (saved > 500) suggestions.push({
        type: 'harvest_gain', asset: row.asset_name,
        message: `${row.asset_name} has ${fmtINR(row.u_ltcg)} unrealised LTCG. Your remaining exemption is ${fmtINR(exemptionLeft)}. Sell and immediately rebuy to reset your cost basis — this gain becomes completely tax-free.`,
        saving: saved,
        action: `Sell ${row.asset_name} → rebuy same day → save ${fmtINR(saved)} in future tax`,
        urgency: exemptionLeft > 50000 ? 'high' : 'medium',
      });
    });
  }

  // 2. Harvest unrealised losses to offset gains
  const totalRealised = result.summary.r_ltcg + result.summary.r_stcg;
  if (totalRealised > 0) {
    assetRows.filter(r => (r.u_ltcg + r.u_stcg) < -2000).forEach(row => {
      const loss = Math.abs(row.u_ltcg + row.u_stcg);
      const offset = Math.min(loss, totalRealised);
      const saved = offset * (rule.stcg_rate / 100);
      if (saved > 500) suggestions.push({
        type: 'harvest_loss', asset: row.asset_name,
        message: `${row.asset_name} is at a loss of ${fmtINR(loss)}. Booking this loss offsets your ${fmtINR(totalRealised)} realised gains and reduces your tax bill directly.`,
        saving: saved,
        action: `Sell ${row.asset_name} → books loss → offsets gains → save ~${fmtINR(saved)}`,
        urgency: loss > 20000 ? 'high' : 'medium',
      });
    });
  }

  // 3. STCG → LTCG by holding longer
  assetRows.filter(r => r.u_stcg > 5000).forEach(row => {
    const stcgTax = row.u_stcg * (rule.stcg_rate / 100);
    const ltcgTax = Math.max(0, row.u_stcg - rule.ltcg_exemption) * (rule.ltcg_rate / 100);
    const saved = stcgTax - ltcgTax;
    if (saved > 1000) suggestions.push({
      type: 'stcg_to_ltcg', asset: row.asset_name,
      message: `${row.asset_name} has ${fmtINR(row.u_stcg)} unrealised STCG at ${rule.stcg_rate}%. Holding past the 1-year mark converts it to LTCG at ${rule.ltcg_rate}% — saving you ${fmtINR(saved)}.`,
      saving: saved,
      action: `Hold ${row.asset_name} until 1-year mark → STCG becomes LTCG → save ${fmtINR(saved)}`,
      urgency: saved > 5000 ? 'high' : 'low',
    });
  });

  return suggestions.sort((a, b) => b.saving - a.saving).slice(0, 5);
}

const U = {
  high:   { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', label: 'High Priority' },
  medium: { bg: '#fffbeb', border: '#fde68a', color: '#b45309', label: 'Consider This' },
  low:    { bg: '#f0fdf4', border: '#bbf7d0', color: '#059669', label: 'Good to Know' },
};
const ICONS  = { harvest_gain: '💰', harvest_loss: '🛡️', stcg_to_ltcg: '⏳' };
const LABELS = { harvest_gain: 'Tax-Free Gain Harvest', harvest_loss: 'Loss Harvest', stcg_to_ltcg: 'Hold for Lower Rate' };

export default function TaxHarvesting({ result }: Props) {
  const suggestions = generateSuggestions(result);
  const rule = currentTaxRule();
  const totalSaving = suggestions.reduce((s, x) => s + x.saving, 0);

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 3 }}>💡 Tax Saving Opportunities</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            FY {rule.fy} · LTCG {rule.ltcg_rate}% · STCG {rule.stcg_rate}% · Exemption {fmtINR(rule.ltcg_exemption)}
          </div>
        </div>
        {totalSaving > 0 && (
          <div style={{ background: 'var(--green-lt)', border: '1px solid #86efac', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>POTENTIAL SAVING</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{fmtINR(totalSaving)}</div>
          </div>
        )}
      </div>

      {suggestions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          Portfolio is well optimised. No immediate tax saving actions needed.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {suggestions.map((s, i) => {
            const c = U[s.urgency];
            return (
              <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15 }}>{ICONS[s.type]}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.color, background: 'white', border: `1px solid ${c.border}`, borderRadius: 4, padding: '2px 8px' }}>
                        {LABELS[s.type]}
                      </span>
                      <span style={{ fontSize: 10, color: c.color, fontWeight: 600 }}>{c.label}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, marginBottom: 8 }}>{s.message}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', background: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '5px 10px', fontFamily: 'var(--mono)' }}>
                      → {s.action}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'white', borderRadius: 8, padding: '10px 14px', border: `1px solid ${c.border}`, flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, marginBottom: 2 }}>SAVE UP TO</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{fmtINR(s.saving)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6, padding: '8px 12px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
        <strong>Disclaimer:</strong> Automated suggestions based on your data. Consider brokerage costs before acting. Consult a CA before making tax-related decisions. Surcharge and cess not included.
      </div>
    </div>
  );
}

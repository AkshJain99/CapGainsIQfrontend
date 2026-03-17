import type { CapGainsResult } from '../../types';
import { fmtINR, fmtPct } from '../../utils';
import { currentFYRule as currentTaxRule } from '../../config/taxRules';

interface Props { result: CapGainsResult }

interface HealthCheck { label: string; status: 'good' | 'warn' | 'bad'; message: string; }

function calcHealth(result: CapGainsResult) {
  const rule = currentTaxRule();
  const checks: HealthCheck[] = [];
  const assetRows = result.capital_gains.filter(r => !r.is_subtotal && !r.is_grand_total);
  const { summary } = result;

  // 1. XIRR vs Nifty 500 benchmark (~14%)
  const NIFTY_BENCH = 14;
  if (summary.overall_xirr > NIFTY_BENCH) {
    checks.push({ label: 'Returns vs Nifty 500', status: 'good', message: `Your XIRR of ${fmtPct(summary.overall_xirr)} beats the Nifty 500 benchmark of ~${NIFTY_BENCH}%` });
  } else if (summary.overall_xirr > 0) {
    checks.push({ label: 'Returns vs Nifty 500', status: 'warn', message: `Your XIRR of ${fmtPct(summary.overall_xirr)} is below the Nifty 500 benchmark of ~${NIFTY_BENCH}%` });
  } else {
    checks.push({ label: 'Returns vs Nifty 500', status: 'bad', message: `Negative XIRR. Portfolio is underperforming significantly.` });
  }

  // 2. LTCG exemption utilisation
  const fyData = result.fy_breakdown.find(f => f.financial_year === rule.fy);
  const currentLTCG = fyData?.r_ltcg ?? summary.r_ltcg;
  // const exemptionUsed = Math.min(currentLTCG, rule.ltcg_exemption);
  const exemptionLeft = Math.max(0, rule.ltcg_exemption - currentLTCG);
  if (exemptionLeft > 50000) {
    checks.push({ label: 'LTCG Exemption Usage', status: 'warn', message: `${fmtINR(exemptionLeft)} of your ${fmtINR(rule.ltcg_exemption)} exemption is unused this FY. Consider harvesting gains.` });
  } else if (currentLTCG <= rule.ltcg_exemption) {
    checks.push({ label: 'LTCG Exemption Usage', status: 'good', message: `LTCG of ${fmtINR(currentLTCG)} is within the ${fmtINR(rule.ltcg_exemption)} exemption limit. No tax on long-term gains.` });
  } else {
    checks.push({ label: 'LTCG Exemption Usage', status: 'warn', message: `LTCG of ${fmtINR(currentLTCG)} exceeds the ${fmtINR(rule.ltcg_exemption)} exemption by ${fmtINR(currentLTCG - rule.ltcg_exemption)}.` });
  }

  // 3. Concentration risk
  const totalVal = summary.current_value;
  if (totalVal > 0) {
    const maxAsset = assetRows.reduce((max, r) => r.current_portfolio_value > max.current_portfolio_value ? r : max, assetRows[0]);
    if (maxAsset) {
      const concentration = (maxAsset.current_portfolio_value / totalVal) * 100;
      if (concentration > 60) {
        checks.push({ label: 'Concentration Risk', status: 'bad', message: `${maxAsset.asset_name} makes up ${concentration.toFixed(0)}% of portfolio. High concentration risk.` });
      } else if (concentration > 40) {
        checks.push({ label: 'Concentration Risk', status: 'warn', message: `${maxAsset.asset_name} makes up ${concentration.toFixed(0)}% of portfolio. Consider diversifying.` });
      } else {
        checks.push({ label: 'Concentration Risk', status: 'good', message: `Portfolio is well diversified. Largest position is ${concentration.toFixed(0)}%.` });
      }
    }
  }

  // 4. Unrealised losses check
  const unrealisedLoss = assetRows.filter(r => (r.u_ltcg + r.u_stcg) < 0).reduce((s, r) => s + Math.abs(r.u_ltcg + r.u_stcg), 0);
  if (unrealisedLoss > 10000) {
    checks.push({ label: 'Unrealised Losses', status: 'warn', message: `${fmtINR(unrealisedLoss)} in unrealised losses. Consider harvesting before March 31 to offset gains.` });
  } else {
    checks.push({ label: 'Unrealised Losses', status: 'good', message: unrealisedLoss > 0 ? `Minor unrealised losses of ${fmtINR(unrealisedLoss)}.` : 'No significant unrealised losses.' });
  }

  // 5. Charges efficiency
  const chargesPct = summary.total_invested > 0 ? (summary.total_charges / summary.total_invested) * 100 : 0;
  if (chargesPct > 1) {
    checks.push({ label: 'Transaction Costs', status: 'warn', message: `Total charges of ${fmtINR(summary.total_charges)} are ${chargesPct.toFixed(2)}% of invested amount. Consider optimising trade frequency.` });
  } else {
    checks.push({ label: 'Transaction Costs', status: 'good', message: `Transaction costs are ${chargesPct.toFixed(2)}% of invested amount. Well controlled.` });
  }

  const score = Math.round((checks.filter(c => c.status === 'good').length / checks.length) * 10);
  return { checks, score };
}

const STATUS = {
  good: { icon: '✅', color: 'var(--green)', bg: '#f0fdf4', border: '#bbf7d0' },
  warn: { icon: '⚠️', color: '#b45309',     bg: '#fffbeb', border: '#fde68a' },
  bad:  { icon: '❌', color: '#dc2626',      bg: '#fef2f2', border: '#fecaca' },
};

export default function PortfolioHealth({ result }: Props) {
  const { checks, score } = calcHealth(result);
  const scoreColor = score >= 8 ? 'var(--green)' : score >= 5 ? '#b45309' : '#dc2626';
  const scoreLabel = score >= 8 ? 'Excellent' : score >= 6 ? 'Good' : score >= 4 ? 'Fair' : 'Needs Attention';

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div>
          <div className="section-title" style={{ marginBottom: 3 }}>🏥 Portfolio Health Score</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Based on returns, diversification, tax efficiency and costs</div>
        </div>
        <div style={{ textAlign: 'center', background: 'var(--indigo-lt)', border: '1px solid var(--indigo-bdr)', borderRadius: 12, padding: '10px 20px' }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{score}/10</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: scoreColor, marginTop: 2 }}>{scoreLabel}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {checks.map((c, i) => {
          const s = STATUS[c.status];
          return (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 8, padding: '10px 14px' }}>
              <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{c.label}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55 }}>{c.message}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

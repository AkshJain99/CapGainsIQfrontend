/**
 * src/config/taxRules.ts
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for all Indian capital gains tax rules.
 * When budget changes → update ONLY this file.
 * All components read from here — nothing hardcoded elsewhere.
 */

export interface FYTaxRule {
  fy:               string;
  ltcg_rate:        number;
  stcg_rate:        number;
  ltcg_exemption:   number;
  equity_threshold: number;
  debt_threshold:   number;
  budget_note:      string;
}

export const TAX_RULES: FYTaxRule[] = [
  {
    fy: '2023-24', ltcg_rate: 10, stcg_rate: 15,
    ltcg_exemption: 100_000, equity_threshold: 365, debt_threshold: 1095,
    budget_note: 'Pre Budget 2024 — LTCG 10% above Rs 1L, STCG 15%',
  },
  {
    fy: '2024-25', ltcg_rate: 12.5, stcg_rate: 20,
    ltcg_exemption: 125_000, equity_threshold: 365, debt_threshold: 1095,
    budget_note: 'Budget 2024 — LTCG 12.5% above Rs 1.25L, STCG 20%',
  },
  {
    fy: '2025-26', ltcg_rate: 12.5, stcg_rate: 20,
    ltcg_exemption: 125_000, equity_threshold: 365, debt_threshold: 1095,
    budget_note: 'Budget 2024 rates continue',
  },
];

export function getTaxRule(fy: string): FYTaxRule {
  return TAX_RULES.find(r => r.fy === fy) ?? TAX_RULES[TAX_RULES.length - 1];
}

export function currentFYRule(): FYTaxRule {
  const now  = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return getTaxRule(`${year}-${String(year + 1).slice(2)}`);
}

export function calcHarvestingSaving(
  unrealisedLTCG: number,
  realisedLTCG: number,
  fy: string
): { canHarvest: number; taxSaved: number; exemptionLeft: number } {
  const rule          = getTaxRule(fy);
  const exemptionLeft = Math.max(0, rule.ltcg_exemption - realisedLTCG);
  const canHarvest    = Math.min(Math.max(0, unrealisedLTCG), exemptionLeft);
  const taxSaved      = canHarvest * (rule.ltcg_rate / 100);
  return { canHarvest, taxSaved, exemptionLeft };
}

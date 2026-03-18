/**
 * src/config/taxRules.ts
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for all Indian capital gains tax rules.
 * When budget changes → update ONLY this file.
 * All components read from here — nothing hardcoded elsewhere.
 *
 * Key rules:
 *  EQUITY / Equity MF:    LTCG if held > 365 days
 *  DEBT MF (post Apr 2023): ALWAYS STCG — no LTCG benefit regardless of holding
 *  COMMODITY (Gold/Silver FoF): LTCG if held > 730 days (24 months, post Budget 2024)
 */

export interface FYTaxRule {
  fy:                  string;
  ltcg_rate:           number;
  stcg_rate:           number;
  ltcg_exemption:      number;
  equity_threshold:    number;
  debt_threshold:      number;   // set to 99999 for post-2023 = always STCG
  commodity_threshold: number;   // Gold/Silver FoF = 730 days
  budget_note:         string;
}

export const TAX_RULES: FYTaxRule[] = [
  {
    fy: '2022-23', ltcg_rate: 10, stcg_rate: 15,
    ltcg_exemption: 100_000,
    equity_threshold:    365,
    debt_threshold:      1095,   // pre Budget 2023: debt had 3yr LTCG
    commodity_threshold: 1095,
    budget_note: 'Pre Budget 2023 — debt funds had 3yr LTCG benefit',
  },
  {
    fy: '2023-24', ltcg_rate: 10, stcg_rate: 15,
    ltcg_exemption: 100_000,
    equity_threshold:    365,
    debt_threshold:      99999,  // Budget 2023: debt MF always STCG
    commodity_threshold: 1095,   // Gold FoF still 3yr (changed in Budget 2024)
    budget_note: 'Budget 2023 — debt MF gains always STCG, no LTCG benefit',
  },
  {
    fy: '2024-25', ltcg_rate: 12.5, stcg_rate: 20,
    ltcg_exemption: 125_000,
    equity_threshold:    365,
    debt_threshold:      99999,  // debt MF always STCG
    commodity_threshold: 730,    // Budget 2024: Gold/Silver FoF LTCG after 24 months
    budget_note: 'Budget 2024 — LTCG 12.5%, STCG 20%, Gold FoF 24 months',
  },
  {
    fy: '2025-26', ltcg_rate: 12.5, stcg_rate: 20,
    ltcg_exemption: 125_000,
    equity_threshold:    365,
    debt_threshold:      99999,
    commodity_threshold: 730,
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

/**
 * Get the correct holding period threshold for an asset class in a given FY.
 * This is the single source of truth — backend mirrors this logic exactly.
 */
export function getThreshold(assetClass: string, fy: string): number {
  const rule = getTaxRule(fy);
  const cls  = assetClass.toUpperCase();
  if (cls === 'EQUITY' || cls === 'MF') return rule.equity_threshold;
  if (cls === 'DEBT')                   return rule.debt_threshold;
  if (cls === 'COMMODITY')              return rule.commodity_threshold;
  return rule.equity_threshold;  // default
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

// ─── Types matching exact Python capital gains engine output ─────────────────

export type AssetClass = 'EQUITY' | 'DEBT' | 'COMMODITY' | 'MF';
export type AssetSource = 'YF' | 'MF';
export type TxType = 'Buy' | 'Sell';
export type CGType = 'LTCG' | 'STCG' | 'Intraday';

// ─── Input types (what user enters) ──────────────────────────────────────────

export interface Asset {
  id: string;
  asset_name: string;
  asset_class: AssetClass;
  ticker: string;
  source: AssetSource;
}

export interface Transaction {
  id: string;
  asset_name: string;
  date: string;           // DD-MM-YYYY
  tr_type: TxType;
  rate: number;
  quantity: number;
  amount: number;
  brokerage: number;
  gst: number;
  stt: number;
  sebi_tax: number;
  exchange_charges: number;
  stamp_duty: number;
  other_charges: number;
  ipft_charges: number;
  total_charges: number;
}

// ─── Output types (what Python engine returns) ────────────────────────────────

export interface CapitalGainRow {
  asset_name: string;
  asset_class: AssetClass;
  ticker: string;
  latest_price: number;
  remaining_units: number;
  current_portfolio_value: number;
  intraday_cg: number;
  r_ltcg: number;
  r_stcg: number;
  r_total: number;
  u_ltcg: number;
  u_stcg: number;
  u_total: number;
  xirr: number;
  total_charges: number;
  is_subtotal?: boolean;
  is_grand_total?: boolean;
}

export interface FYCapitalGain {
  financial_year: string;
  intraday_cg: number;
  r_stcg: number;
  r_ltcg: number;
  total_cg: number;
}

export interface TaxSummary {
  financial_year: string;
  ltcg_taxable: number;
  stcg_taxable: number;
  ltcg_tax: number;
  stcg_tax: number;
  total_tax: number;
  ltcg_exemption: number;
  ltcg_rate: number;
  stcg_rate: number;
}

export interface PortfolioSummary {
  total_invested: number;
  current_value: number;
  total_realised_pnl: number;
  total_unrealised_pnl: number;
  overall_xirr: number;
  total_charges: number;
  r_ltcg: number;
  r_stcg: number;
  r_intraday: number;
  u_ltcg: number;
  u_stcg: number;
}

export interface CapGainsResult {
  summary: PortfolioSummary;
  capital_gains: CapitalGainRow[];
  fy_breakdown: FYCapitalGain[];
  tax_estimates: TaxSummary[];
  warnings: string[];
  computed_at: string;
}

// ─── API types ────────────────────────────────────────────────────────────────

export interface RunPayload {
  assets: Asset[];
  transactions: Transaction[];
  config: FYConfig[];
}

export interface FYConfig {
  financial_year: string;
  equity_threshold: number;
  debt_threshold: number;
  commodity_threshold: number;
}

export type RunStatus = 'idle' | 'running' | 'done' | 'error';

export interface RunState {
  status: RunStatus;
  result: CapGainsResult | null;
  error: string | null;
  job_id: string | null;
}

// ─── UI types ─────────────────────────────────────────────────────────────────

export type ActiveTab = 'assets' | 'transactions' | 'results' | 'tax' | 'fy';
export type Theme = 'dark' | 'light';

import type { RunPayload, CapGainsResult } from '../types';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  public status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new ApiError(res.status, text);
  }
  return res.json() as Promise<T>;
}

// ─── Run capital gains calculation ───────────────────────────────────────────
export async function runCapGains(payload: RunPayload): Promise<{ job_id: string }> {
  const res = await fetch(`${BASE}/api/capgains/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// ─── Poll job status ──────────────────────────────────────────────────────────
export async function pollJob(jobId: string): Promise<{
  status: 'running' | 'done' | 'error';
  result?: CapGainsResult;
  error?: string;
  progress?: string;
}> {
  const res = await fetch(`${BASE}/api/capgains/job/${jobId}`);
  return handleResponse(res);
}

// ─── Fetch latest price for a ticker ─────────────────────────────────────────
export async function fetchPrice(ticker: string, source: string): Promise<{ price: number }> {
  const res = await fetch(`${BASE}/api/price?ticker=${ticker}&source=${source}`);
  return handleResponse(res);
}

// ─── Download CSV export ──────────────────────────────────────────────────────
export async function downloadCSV(jobId: string, sheet: string): Promise<Blob> {
  const res = await fetch(`${BASE}/api/capgains/export/${jobId}?sheet=${sheet}`);
  if (!res.ok) throw new ApiError(res.status, 'Export failed');
  return res.blob();
}

// ─── Health check ─────────────────────────────────────────────────────────────
export async function healthCheck(): Promise<{ status: string; version: string }> {
  const res = await fetch(`${BASE}/api/health`);
  return handleResponse(res);
}

// ─── MF Search ────────────────────────────────────────────────────────────────

export interface MFMatch {
  scheme_code: string;
  scheme_name: string;
  score:       number;
}

export interface MFSearchResponse {
  query:   string;
  results: MFMatch[];
}

export interface MFAutoMatchResponse {
  matched:      boolean;
  scheme_code?: string;
  scheme_name?: string;
  score?:       number;
}

export interface MFBulkMatchResponse {
  results: Record<string, MFAutoMatchResponse>;
}

/** Search funds by name — used for typeahead in AssetsManager */
export async function searchMFFunds(q: string, topN = 5): Promise<MFSearchResponse> {
  const res = await fetch(`${BASE}/api/mf/search?q=${encodeURIComponent(q)}&top_n=${topN}`);
  return handleResponse(res);
}

/** Auto-match a single fund name — used during import */
export async function autoMatchMF(name: string, minScore = 0.55): Promise<MFAutoMatchResponse> {
  const res = await fetch(
    `${BASE}/api/mf/match?name=${encodeURIComponent(name)}&min_score=${minScore}`
  );
  return handleResponse(res);
}

/** Bulk auto-match multiple fund names in one request — used during Zerodha import */
export async function bulkMatchMF(names: string[], minScore = 0.55): Promise<MFBulkMatchResponse> {
  const res = await fetch(`${BASE}/api/mf/match-bulk`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ names, min_score: minScore }),
  });
  return handleResponse(res);
}

/** Validate a scheme code the user typed manually */
export async function getMFByCode(schemeCode: string): Promise<MFMatch> {
  const res = await fetch(`${BASE}/api/mf/code/${encodeURIComponent(schemeCode)}`);
  return handleResponse(res);
}

// ─── NSE Stock Search ─────────────────────────────────────────────────────────

export interface NSEMatch {
  symbol:       string;
  company_name: string;
  nse_ticker:   string;
  bse_ticker:   string;
  score:        number;
}

export interface NSESearchResponse {
  query:   string;
  results: NSEMatch[];
}

export interface NSEBulkMatchResponse {
  results: Record<string, { matched: boolean } & Partial<NSEMatch>>;
}

/** Search NSE stocks by company name or symbol — used for typeahead */
export async function searchNSEStocks(q: string, topN = 5): Promise<NSESearchResponse> {
  const res = await fetch(`${BASE}/api/nse/search?q=${encodeURIComponent(q)}&top_n=${topN}`);
  return handleResponse(res);
}

/** Bulk match company names to NSE tickers — used during Zerodha import */
export async function bulkMatchNSE(names: string[], minScore = 0.50): Promise<NSEBulkMatchResponse> {
  const res = await fetch(`${BASE}/api/nse/match-bulk`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ names, min_score: minScore }),
  });
  return handleResponse(res);
}

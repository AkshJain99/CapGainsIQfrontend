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

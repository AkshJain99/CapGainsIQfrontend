// ─── ID generation (browser-safe, no external dep) ──────────────────────────
export function genId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

// ─── Number formatting ────────────────────────────────────────────────────────
export function fmtINR(val: number, decimals = 0): string {
  if (!isFinite(val)) return '—';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(abs);
  return `${sign}₹${formatted}`;
}

export function fmtPct(val: number, decimals = 2): string {
  if (!isFinite(val)) return '—';
  return `${val >= 0 ? '+' : ''}${val.toFixed(decimals)}%`;
}

export function fmtNum(val: number, decimals = 2): string {
  if (!isFinite(val)) return '—';
  return val.toFixed(decimals);
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function toDisplayDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split('-');
  return `${d}/${m}/${y}`;
}

export function todayDDMMYYYY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export function getIndianFY(ddmmyyyy: string): string {
  const [, mm, yyyy] = ddmmyyyy.split('-').map(Number);
  if (mm > 3) return `${yyyy}-${String(yyyy + 1).slice(2)}`;
  return `${yyyy - 1}-${String(yyyy).slice(2)}`;
}

export function currentFY(): string {
  return getIndianFY(todayDDMMYYYY());
}

// ─── CSV export ───────────────────────────────────────────────────────────────
export function exportToCSV(headers: string[], rows: (string | number | null)[][], filename: string) {
  const escape = (v: string | number | null) => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Tax calculation (mirrors Python engine exactly) ─────────────────────────
export function calcTax(ltcg: number, stcg: number, fy: string) {
  const startYear = parseInt(fy.split('-')[0]);
  if (startYear < 2024) {
    const taxL = Math.max(0, (ltcg - 100000) * 0.10);
    const taxS = Math.max(0, stcg * 0.15);
    return { taxL, taxS, exemption: 100000, ltcgRate: 10, stcgRate: 15 };
  }
  const taxL = Math.max(0, (ltcg - 125000) * 0.125);
  const taxS = Math.max(0, stcg * 0.20);
  return { taxL, taxS, exemption: 125000, ltcgRate: 12.5, stcgRate: 20 };
}

// ─── Validate transaction ─────────────────────────────────────────────────────
export function validateTx(tx: Record<string, unknown>): string[] {
  const errs: string[] = [];
  if (!tx.asset_name) errs.push('Asset name required');
  if (!tx.date) errs.push('Date required');
  if (!tx.tr_type) errs.push('Transaction type required');
  if (!tx.rate || Number(tx.rate) <= 0) errs.push('Rate must be > 0');
  if (!tx.quantity || Number(tx.quantity) <= 0) errs.push('Quantity must be > 0');
  return errs;
}

// ─── Color helpers ────────────────────────────────────────────────────────────
export function gainColor(val: number): string {
  if (val > 0) return 'var(--green)';
  if (val < 0) return 'var(--red)';
  return 'var(--muted)';
}

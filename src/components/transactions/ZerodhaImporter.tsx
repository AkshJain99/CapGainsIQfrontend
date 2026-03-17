import { useState, useRef } from 'react';
import type { Asset, Transaction } from '../../types';
import { genId } from '../../utils';

interface Props {
  existingAssets:       Asset[];
  existingTransactions: Transaction[];
  onImport: (assets: Asset[], transactions: Transaction[]) => void;
  onClose:  () => void;
}

type ImportMode  = 'merge' | 'replace';
type CsvFormat   = 'tradebook' | 'taxpnl' | 'unknown';

interface ParseResult {
  assets:       Asset[];
  transactions: Transaction[];
  warnings:     string[];
  format:       string;
  rows:         number;
}

// ── Detect CSV format from headers ────────────────────────────────────────
function detectFormat(headers: string[]): CsvFormat {
  const h = headers.map(x => x.toLowerCase().trim().replace(/[\s-]+/g, '_'));
  if (h.some(x => x.includes('brokerage')) || h.some(x => x === 'stt') || h.some(x => x.includes('total_charge'))) {
    return 'taxpnl';
  }
  if (h.some(x => x === 'tradingsymbol') || (h.some(x => x === 'symbol') && h.some(x => x === 'trade_type'))) {
    return 'tradebook';
  }
  return 'unknown';
}

// ── Parse date → DD-MM-YYYY ────────────────────────────────────────────────
function toAppDate(raw: string): string {
  const s = (raw || '').trim();

  // YYYY-MM-DD or YYYY-MM-DD HH:MM:SS  (ISO format)
  const m1 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m1) return `${m1[3]}-${m1[2]}-${m1[1]}`;

  // DD-MM-YYYY or DD/MM/YYYY  (Indian format - day first, day <= 12 ambiguous)
  const m2 = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (m2) {
    const d = parseInt(m2[1]), mo = parseInt(m2[2]);
    // If first part > 12 it MUST be DD-MM-YYYY
    // If second part > 12 it MUST be MM-DD-YYYY
    if (d > 12) return `${m2[1]}-${m2[2]}-${m2[3]}`;  // DD-MM-YYYY
    if (mo > 12) return `${m2[2]}-${m2[1]}-${m2[3]}`;  // MM-DD-YYYY → swap
    // Both <= 12: assume DD-MM-YYYY (Indian standard)
    return `${m2[1]}-${m2[2]}-${m2[3]}`;
  }

  // MM-DD-YYYY explicit (month > 12 impossible, detect by context)
  // Handles dates like '11-21-2024' where day part (21) > 12
  const m3 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (m3) {
    const p1 = parseInt(m3[1]), p2 = parseInt(m3[2]);
    if (p2 > 12 && p1 <= 12) {
      // MM-DD-YYYY → convert to DD-MM-YYYY
      return `${m3[2].padStart(2,'0')}-${m3[1].padStart(2,'0')}-${m3[3]}`;
    }
    return `${m3[1].padStart(2,'0')}-${m3[2].padStart(2,'0')}-${m3[3]}`;
  }

  return s;
}

// ── Safely get column value ────────────────────────────────────────────────
function col(row: string[], idx: number): string {
  return idx >= 0 && idx < row.length ? (row[idx] || '').trim() : '';
}

function num(row: string[], idx: number): number {
  return parseFloat(col(row, idx).replace(/,/g, '')) || 0;
}

function findCol(headers: string[], ...names: string[]): number {
  for (const name of names) {
    const idx = headers.findIndex(h =>
      h.toLowerCase().trim().replace(/[\s_-]+/g, '') === name.toLowerCase().replace(/[\s_-]+/g, '')
    );
    if (idx >= 0) return idx;
  }
  return -1;
}

// ── Parse Tradebook CSV ────────────────────────────────────────────────────
function parseTradebook(rows: string[][], headers: string[]): ParseResult {
  const iSym  = findCol(headers, 'tradingsymbol', 'symbol', 'scripname');
  const iDate = findCol(headers, 'trade_date', 'tradedate', 'date');
  const iType = findCol(headers, 'trade_type', 'tradetype', 'buysell', 'type');
  const iQty  = findCol(headers, 'quantity', 'qty');
  const iPrice= findCol(headers, 'price', 'tradeprice', 'rate');
  const iExch = findCol(headers, 'exchange', 'exch');
  const iSeg  = findCol(headers, 'segment', 'seg');

  const warnings: string[]         = [];
  const seenAssets = new Map<string, Asset>();
  const transactions: Transaction[] = [];

  rows.forEach((row, i) => {
    const symbol  = col(row, iSym).toUpperCase();
    const dateRaw = col(row, iDate);
    const typeRaw = col(row, iType).toLowerCase();
    const qty     = num(row, iQty);
    const price   = num(row, iPrice);
    const exch    = col(row, iExch).toUpperCase() || 'NSE';
    const seg     = col(row, iSeg).toUpperCase();

    if (!symbol || !dateRaw) return;
    // Skip F&O / commodity
    if (seg && (seg.includes('FO') || seg.includes('F&O') || seg.includes('COM') || seg.includes('CUR'))) return;

    if (qty <= 0 || price <= 0) {
      warnings.push(`Row ${i + 2}: Skipped ${symbol} — qty=${qty} price=${price}`);
      return;
    }

    const date      = toAppDate(dateRaw);
    const trType    = typeRaw.startsWith('b') ? 'Buy' : 'Sell';
    const detected  = detectAssetType(symbol);
    // For BSE stocks override ticker suffix
    const ticker    = detected.source === 'YF' && exch === 'BSE'
      ? `${detected.symbol}.BO`
      : detected.ticker;

    if (!seenAssets.has(detected.symbol)) {
      seenAssets.set(detected.symbol, {
        id: genId(), asset_name: detected.symbol,
        asset_class: detected.assetClass,
        ticker, source: detected.source,
      });
    }

    transactions.push({
      id: genId(), asset_name: detected.symbol, date,
      tr_type: trType as 'Buy' | 'Sell',
      rate: price, quantity: qty,
      amount: parseFloat((qty * price).toFixed(2)),
      brokerage: 0, gst: 0, stt: 0, sebi_tax: 0,
      exchange_charges: 0, stamp_duty: 0,
      other_charges: 0, ipft_charges: 0, total_charges: 0,
    });
  });

  return { assets: [...seenAssets.values()], transactions, warnings, format: 'Zerodha Tradebook', rows: transactions.length };
}

// ── Parse Tax P&L CSV ──────────────────────────────────────────────────────
function parseTaxPnL(rows: string[][], headers: string[]): ParseResult {
  const iSym   = findCol(headers, 'symbol', 'tradingsymbol', 'scripname');
  const iDate  = findCol(headers, 'trade_date', 'tradedate', 'date');
  const iType  = findCol(headers, 'trade_type', 'tradetype', 'buysell');
  const iQty   = findCol(headers, 'quantity', 'qty');
  const iPrice = findCol(headers, 'price', 'rate', 'tradeprice');
  const iBrok  = findCol(headers, 'brokerage');
  const iSTT   = findCol(headers, 'stt', 'securities transaction tax');
  const iExchC = findCol(headers, 'exchange_charges', 'exchange charges', 'exchcharges');
  const iSEBI  = findCol(headers, 'sebi_tax', 'sebi charges', 'sebi turnover fees');
  const iStamp = findCol(headers, 'stamp_duty', 'stamp duty');
  const iGST   = findCol(headers, 'gst', 'cgst', 'sgst', 'igst');
  const iIPFT  = findCol(headers, 'ipft');
  const iTotal = findCol(headers, 'total_charges', 'total charges', 'totalcharges');
  const iExch  = findCol(headers, 'exchange', 'exch');
  const iSeg   = findCol(headers, 'segment', 'seg');

  const warnings: string[]         = [];
  const seenAssets = new Map<string, Asset>();
  const transactions: Transaction[] = [];

  rows.forEach((row, i) => {
    const symbol  = col(row, iSym).toUpperCase();
    const dateRaw = col(row, iDate);
    const typeRaw = col(row, iType).toLowerCase();
    const qty     = num(row, iQty);
    const price   = num(row, iPrice);
    const exch    = col(row, iExch).toUpperCase() || 'NSE';
    const seg     = col(row, iSeg).toUpperCase();

    if (!symbol || !dateRaw) return;
    if (seg && (seg.includes('FO') || seg.includes('F&O') || seg.includes('COM') || seg.includes('CUR'))) return;

    if (qty <= 0 || price <= 0) {
      warnings.push(`Row ${i + 2}: Skipped ${symbol} — qty=${qty} price=${price}`);
      return;
    }

    const brok  = num(row, iBrok);
    const stt   = num(row, iSTT);
    const exchC = num(row, iExchC);
    const sebi  = num(row, iSEBI);
    const stamp = num(row, iStamp);
    const gst   = num(row, iGST);
    const ipft  = num(row, iIPFT);
    const total = num(row, iTotal) || parseFloat((brok + stt + exchC + sebi + stamp + gst + ipft).toFixed(2));

    const date     = toAppDate(dateRaw);
    const trType   = typeRaw.startsWith('b') ? 'Buy' : 'Sell';
    const detected = detectAssetType(symbol);
    const ticker   = detected.source === 'YF' && exch === 'BSE'
      ? `${detected.symbol}.BO`
      : detected.ticker;

    if (!seenAssets.has(detected.symbol)) {
      seenAssets.set(detected.symbol, {
        id: genId(), asset_name: detected.symbol,
        asset_class: detected.assetClass,
        ticker, source: detected.source,
      });
    }

    transactions.push({
      id: genId(), asset_name: detected.symbol, date,
      tr_type: trType as 'Buy' | 'Sell',
      rate: price, quantity: qty,
      amount: parseFloat((qty * price).toFixed(2)),
      brokerage: brok, gst, stt, sebi_tax: sebi,
      exchange_charges: exchC, stamp_duty: stamp,
      other_charges: 0, ipft_charges: ipft, total_charges: total,
    });
  });

  return { assets: [...seenAssets.values()], transactions, warnings, format: 'Zerodha Tax P&L', rows: transactions.length };
}

// ── Parse raw CSV text ─────────────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  return text.trim().split('\n').map(line => {
    const cols: string[] = [];
    let cur = ''; let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  });
}

// ── Detect if asset is a mutual fund ─────────────────────────────────────
const MF_KEYWORDS = [
  'fund', 'growth', 'direct plan', 'direct-plan', 'fof', 'fund of fund',
  'index fund', 'liquid', 'gilt', 'debt', 'income fund', 'balanced',
  'hybrid', 'arbitrage', 'overnight', 'dynamic bond', 'credit risk',
  'banking and psu', 'corporate bond', 'money market', 'ultra short',
  'low duration', 'short duration', 'medium duration', 'long duration',
  'floater', 'saving fund', 'savings fund',
];

const DEBT_KEYWORDS = [
  'gilt', 'debt', 'bond', 'liquid', 'overnight', 'money market',
  'floating interest', 'floater', 'banking and psu', 'corporate bond',
  'credit risk', 'dynamic bond', 'ultra short', 'low duration',
  'short duration', 'medium duration', 'long duration',
];

function detectAssetType(name: string): {
  assetClass: 'EQUITY' | 'DEBT' | 'MF';
  source: 'YF' | 'MF';
  ticker: string;
  symbol: string;
} {
  const lower = name.toLowerCase();
  const isMF  = MF_KEYWORDS.some(k => lower.includes(k));

  if (isMF) {
    const isDebt = DEBT_KEYWORDS.some(k => lower.includes(k));
    return {
      assetClass: isDebt ? 'DEBT' : 'MF',
      source:     'MF',
      ticker:     '',          // user must fill AMFI code manually
      symbol:     name.toUpperCase().trim(),
    };
  }

  // Stock — use short symbol with .NS
  // Symbol is the raw short name from CSV (e.g. RELIANCE, ITC)
  const symbol = name.toUpperCase().trim();
  // Clean up common suffixes Zerodha adds
  const cleanSymbol = symbol
    .replace(/ LIMITED$/, '').replace(/ LTD$/, '')
    .replace(/ CORPORATION LIMITED$/, '').replace(/ CORP$/, '')
    .trim();

  return {
    assetClass: 'EQUITY',
    source:     'YF',
    ticker:     `${cleanSymbol}.NS`,
    symbol:     cleanSymbol,
  };
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ZerodhaImporter({ existingAssets, existingTransactions, onImport, onClose }: Props) {
  const [parsed,  setParsed]  = useState<ParseResult | null>(null);
  const [mode,    setMode]    = useState<ImportMode>('merge');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(''); setLoading(true);

    const reader = new FileReader();
    reader.onload = ev => {
      // Use setTimeout to yield to browser — prevents UI freeze on large CSVs
      setTimeout(() => {
        try {
          const text = ev.target?.result as string;
          const all  = parseCSV(text);
          if (all.length < 2) throw new Error('CSV is empty or has no data rows.');

          const headers = all[0];
          const rows    = all.slice(1).filter(r => r.some(c => c));
          const fmt     = detectFormat(headers);

          let result: ParseResult;
          if (fmt === 'taxpnl')         result = parseTaxPnL(rows, headers);
          else if (fmt === 'tradebook') result = parseTradebook(rows, headers);
          else throw new Error('Unrecognised format. Upload a Zerodha Tradebook or Tax P&L CSV.');

          if (result.transactions.length === 0) throw new Error('No valid equity transactions found.');
          setParsed(result);
        } catch (err: any) {
          setError((err as Error).message);
        } finally {
          setLoading(false);
        }
      }, 50); // 50ms lets React render the loading state first
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!parsed) return;
    if (mode === 'replace') {
      onImport(parsed.assets, parsed.transactions);
    } else {
      const existing = new Set(existingAssets.map(a => a.asset_name.toUpperCase()));
      const newA     = parsed.assets.filter(a => !existing.has(a.asset_name.toUpperCase()));
      onImport([...existingAssets, ...newA], [...existingTransactions, ...parsed.transactions]);
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,22,40,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: 'var(--white)', borderRadius: 16,
        boxShadow: '0 24px 64px rgba(15,22,40,0.2)',
        width: '100%', maxWidth: 520, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
          padding: '18px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'white' }}>Import from Zerodha</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              Tradebook CSV or Tax P&L CSV — auto-detected
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6,
            padding: '5px 10px', cursor: 'pointer', color: 'white', fontSize: 15,
          }}>✕</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Instructions */}
          <div style={{
            background: 'var(--indigo-lt)', border: '1px solid var(--indigo-bdr)',
            borderRadius: 8, padding: '12px 14px', marginBottom: 16, fontSize: 12,
          }}>
            <div style={{ fontWeight: 700, color: 'var(--indigo-mid)', marginBottom: 6 }}>
              How to download from Zerodha Console:
            </div>
            <div style={{ color: 'var(--text2)', lineHeight: 1.7 }}>
              <strong>Tradebook</strong> (no charges included):<br />
              Console → Portfolio → Tradebook → set date range → Download CSV<br /><br />
              <strong>Tax P&L</strong> (charges included — recommended):<br />
              Console → Reports → Tax P&L → select FY → Download
            </div>
          </div>

          {/* Upload area */}
          {!parsed && (
            <div
              onClick={() => fileRef.current?.click()}
              style={{
                border: '2px dashed var(--indigo-bdr)', borderRadius: 10,
                padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
                background: 'var(--indigo-lt)', marginBottom: 14, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#4f46e5'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--indigo-bdr)'; }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>📂</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--indigo-mid)' }}>
                {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span style={{
                    display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid var(--indigo-bdr)', borderTopColor: 'var(--indigo-mid)',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  Parsing {'—'} please wait...
                </span>
              ) : 'Click to upload Zerodha CSV'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                .csv files only
              </div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 12, fontSize: 12 }}>
              ⚠ {error}
            </div>
          )}

          {/* Preview */}
          {parsed && (
            <div>
              <div className="alert alert-success" style={{ marginBottom: 12, fontSize: 12 }}>
                ✓ <strong>{parsed.format}</strong> — {parsed.rows} transactions, {parsed.assets.length} assets
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {[
                  { l: 'Transactions', v: parsed.rows },
                  { l: 'Assets',       v: parsed.assets.length },
                  { l: 'Skipped',      v: parsed.warnings.length },
                ].map(s => (
                  <div key={s.l} style={{
                    background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '10px 0', textAlign: 'center',
                  }}>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--indigo-mid)' }}>{s.v}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.l}</div>
                  </div>
                ))}
              </div>

              {parsed.warnings.length > 0 && (
                <div style={{
                  background: '#fffbeb', border: '1px solid #fde68a',
                  borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 11,
                  color: '#92400e',
                }}>
                  <strong>{parsed.warnings.length} rows skipped</strong> (F&O / invalid data — equity only imported)
                </div>
              )}

              {/* MF detected notice */}
              {parsed.assets.filter(a => a.source === 'MF').length > 0 && (
                <div style={{
                  background: '#eff6ff', border: '1px solid #bfdbfe',
                  borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 11,
                  color: '#1e40af',
                }}>
                  <strong>
                    {parsed.assets.filter(a => a.source === 'MF').length} mutual funds detected
                  </strong>
                  {' '}— ticker left blank. After import, go to Assets tab and add the
                  AMFI scheme code for each fund to see live NAV and unrealised gains.{' '}
                  <a
                    href="https://www.amfiindia.com/net-asset-value"
                    target="_blank" rel="noreferrer"
                    style={{ color: '#2563eb', fontWeight: 700 }}
                  >
                    Find AMFI codes →
                  </a>
                </div>
              )}

              {/* Mode */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                  Handle existing data:
                </div>
                {(['merge', 'replace'] as const).map(opt => (
                  <label key={opt} style={{
                    display: 'flex', gap: 10, alignItems: 'flex-start',
                    padding: '8px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 6,
                    border: `1.5px solid ${mode === opt ? '#4f46e5' : 'var(--border)'}`,
                    background: mode === opt ? 'var(--indigo-lt)' : 'var(--white)',
                  }}>
                    <input type="radio" name="mode" checked={mode === opt} onChange={() => setMode(opt)} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)', textTransform: 'capitalize' }}>{opt}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {opt === 'merge' ? 'Add to existing assets and transactions' : 'Clear everything and use only this file'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <button className="btn btn-ghost btn-sm" onClick={() => { setParsed(null); setError(''); }}>
                ← Upload different file
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-outline" onClick={onClose}>Cancel</button>
            {parsed && (
              <button className="btn btn-primary" onClick={handleImport}>
                Import {parsed.rows} Transactions →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

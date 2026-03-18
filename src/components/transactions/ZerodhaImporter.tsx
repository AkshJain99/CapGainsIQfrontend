import { useState, useRef } from 'react';
import type { Asset, Transaction } from '../../types';
import { genId } from '../../utils';
import { bulkMatchMF, bulkMatchNSE } from '../../api/client';

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

// ── Detect date format from ALL dates in the file ─────────────────────────
// Looks at every date and finds one where first or second part > 12
// That unambiguously tells us the format for the whole file.
// This works for ANY broker — Zerodha, Groww, Upstox, ICICI etc.
function detectDateFormat(allRows: string[][], dateColIdx: number): 'DMY' | 'MDY' | 'YMD' | 'unknown' {
  if (dateColIdx < 0) return 'unknown';

  for (const row of allRows) {
    const raw = (row[dateColIdx] || '').trim();

    // ISO: YYYY-MM-DD — unambiguous
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return 'YMD';

    const m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (!m) continue;

    const p1 = parseInt(m[1]), p2 = parseInt(m[2]);
    if (p1 > 12) return 'DMY';   // first part > 12 → must be day → DD-MM-YYYY
    if (p2 > 12) return 'MDY';   // second part > 12 → must be day → MM-DD-YYYY
    // both ≤ 12 → ambiguous, keep looking
  }

  // All ambiguous — Zerodha uses MM-DD-YYYY (American format) by default
  // This is the safest fallback for Zerodha Tax P&L and Tradebook CSVs
  return 'MDY';
}

// ── Parse a single date string given a known format ────────────────────────
function parseDateWithFormat(raw: string, fmt: 'DMY' | 'MDY' | 'YMD' | 'unknown'): string {
  const s = (raw || '').trim();

  // ISO YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;

  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (!m) return s;

  const p1 = m[1].padStart(2, '0');
  const p2 = m[2].padStart(2, '0');
  const yr = m[3];

  if (fmt === 'DMY') return `${p1}-${p2}-${yr}`;   // DD-MM-YYYY → keep
  if (fmt === 'MDY') return `${p2}-${p1}-${yr}`;   // MM-DD-YYYY → swap
  if (fmt === 'YMD') return `${p2}-${p1}-${yr}`;   // already handled above

  // unknown: guess by value
  const n1 = parseInt(m[1]), n2 = parseInt(m[2]);
  if (n1 > 12) return `${p1}-${p2}-${yr}`;   // p1 is day
  if (n2 > 12) return `${p2}-${p1}-${yr}`;   // p2 is day
  return `${p2}-${p1}-${yr}`;                 // default MDY (Zerodha)
}

// ── Safely get column value ────────────────────────────────────────────────
function col(row: string[], idx: number): string {
  return idx >= 0 && idx < row.length ? (row[idx] || '').trim() : '';
}

// ── Parse number — handles spaces, commas (e.g. "1 234.47" or "27,540") ──
function num(row: string[], idx: number): number {
  const raw = col(row, idx);
  // Remove spaces and commas — both used by different brokers for thousands sep
  const cleaned = raw.replace(/[\s,]/g, '');
  return parseFloat(cleaned) || 0;
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

  // Auto-detect date format from the whole file
  const dateFmt = detectDateFormat(rows, iDate);

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

    const date      = parseDateWithFormat(dateRaw, dateFmt);
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

  // Auto-detect date format from the whole file
  const dateFmt = detectDateFormat(rows, iDate);
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

    const date     = parseDateWithFormat(dateRaw, dateFmt);
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

// ── CapGainsIQ Template format detection ──────────────────────────────────
function isTemplateFormat(headers: string[]): boolean {
  const h = headers.map(x => x.toLowerCase().trim().replace(/[\s_-]+/g, ''));
  return h.includes('assetname') && h.includes('date') && h.includes('trtype');
}

// ── Parse CapGainsIQ own template CSV ─────────────────────────────────────
function parseTemplate(rows: string[][], headers: string[]): ParseResult {
  const iName  = findCol(headers, 'asset_name', 'assetname', 'name');
  const iDate  = findCol(headers, 'date', 'trade_date');
  const iType  = findCol(headers, 'tr_type', 'trtype', 'type', 'trade_type');
  const iRate  = findCol(headers, 'rate', 'price');
  const iQty   = findCol(headers, 'quantity', 'qty');
  const iBrok  = findCol(headers, 'brokerage');
  const iGST   = findCol(headers, 'gst');
  const iSTT   = findCol(headers, 'stt');
  const iSEBI  = findCol(headers, 'sebi_tax', 'sebitax', 'sebi');
  const iExchC = findCol(headers, 'exchange_charges', 'exchcharges');
  const iStamp = findCol(headers, 'stamp_duty', 'stampduty');
  const iOther = findCol(headers, 'other_charges', 'othercharges');
  const iIPFT  = findCol(headers, 'ipft_charges', 'ipft');
  const iTotal = findCol(headers, 'total_charges', 'totalcharges');

  // Template uses DD-MM-YYYY — explicitly DMY
  const dateFmt = detectDateFormat(rows, iDate) === 'unknown' ? 'DMY' : detectDateFormat(rows, iDate);

  const warnings: string[]          = [];
  const seenAssets = new Map<string, Asset>();
  const transactions: Transaction[]  = [];

  rows.forEach((row, i) => {
    const assetName = col(row, iName).toUpperCase().trim();
    const dateRaw   = col(row, iDate);
    const typeRaw   = col(row, iType).toLowerCase();
    const rate      = num(row, iRate);
    const qty       = num(row, iQty);

    if (!assetName || !dateRaw) return;
    if (rate <= 0 || qty <= 0) {
      warnings.push(`Row ${i + 2}: Skipped ${assetName} — rate=${rate} qty=${qty} must be > 0`);
      return;
    }

    const date   = parseDateWithFormat(dateRaw, dateFmt);
    const trType = typeRaw.startsWith('b') ? 'Buy' : 'Sell';
    const brok   = num(row, iBrok);
    const gst    = num(row, iGST);
    const stt    = num(row, iSTT);
    const sebi   = num(row, iSEBI);
    const exchC  = num(row, iExchC);
    const stamp  = num(row, iStamp);
    const other  = num(row, iOther);
    const ipft   = num(row, iIPFT);
    const total  = num(row, iTotal) || parseFloat((brok+gst+stt+sebi+exchC+stamp+other+ipft).toFixed(2));

    // For template imports — user must have already set up assets manually
    // We create a placeholder asset if not seen, source = YF by default
    if (!seenAssets.has(assetName)) {
      const detected = detectAssetType(assetName);
      seenAssets.set(assetName, {
        id: genId(), asset_name: assetName,
        asset_class: detected.assetClass,
        ticker: detected.ticker,
        source: detected.source,
      });
    }

    transactions.push({
      id: genId(), asset_name: assetName, date,
      tr_type: trType as 'Buy' | 'Sell',
      rate, quantity: qty,
      amount: parseFloat((qty * rate).toFixed(2)),
      brokerage: brok, gst, stt, sebi_tax: sebi,
      exchange_charges: exchC, stamp_duty: stamp,
      other_charges: other, ipft_charges: ipft, total_charges: total,
    });
  });

  return {
    assets: [...seenAssets.values()],
    transactions,
    warnings,
    format: 'CapGainsIQ Template',
    rows: transactions.length,
  };
}

// ── Download blank transaction template ───────────────────────────────────
function downloadTemplate() {
  const headers = [
    'asset_name', 'date', 'tr_type', 'rate', 'quantity',
    'brokerage', 'gst', 'stt', 'sebi_tax', 'exchange_charges',
    'stamp_duty', 'other_charges', 'ipft_charges', 'total_charges',
  ].join(',');

  const example = [
    'RELIANCE',       // asset_name — must match exactly what you added in Assets tab
    '01-09-2022',     // date — DD-MM-YYYY format
    'Buy',            // tr_type — Buy or Sell
    '2500.00',        // rate — price per unit
    '10',             // quantity — number of units
    '20.00',          // brokerage
    '3.60',           // gst
    '2.50',           // stt
    '0.05',           // sebi_tax
    '1.50',           // exchange_charges
    '1.25',           // stamp_duty
    '0',              // other_charges
    '0',              // ipft_charges
    '28.90',          // total_charges
  ].join(',');

  const example2 = [
    'RELIANCE', '15-03-2024', 'Sell', '2900.00', '5',
    '20.00', '3.60', '2.90', '0.05', '1.50', '0', '0', '0', '28.05',
  ].join(',');

  const notes = [
    '# CapGainsIQ Transaction Template',
    '# Instructions:',
    '#   1. date format: DD-MM-YYYY  (e.g. 01-09-2022 = 1st September 2022)',
    '#   2. asset_name must exactly match the name you added in the Assets tab',
    '#   3. tr_type must be exactly: Buy  or  Sell',
    '#   4. Leave charges as 0 if unknown — only rate and quantity are required',
    '#   5. Delete these comment lines before uploading',
    '#   6. Save as .csv (comma separated)',
    '#',
  ].join('\n');

  const csv = `${notes}\n${headers}\n${example}\n${example2}\n`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'capgainsiq_template.csv';
  a.click();
  URL.revokeObjectURL(url);
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
      setTimeout(async () => {
        try {
          const text = ev.target?.result as string;

          // Strip comment lines (lines starting with #) before parsing
          const stripped = text.split('\n').filter(l => !l.trim().startsWith('#')).join('\n');

          const all  = parseCSV(stripped);
          if (all.length < 2) throw new Error('CSV is empty or has no data rows.');

          const headers = all[0];
          const rows    = all.slice(1).filter(r => r.some(c => c));
          const fmt     = detectFormat(headers);

          let result: ParseResult;
          if (fmt === 'taxpnl')         result = parseTaxPnL(rows, headers);
          else if (fmt === 'tradebook') result = parseTradebook(rows, headers);
          else if (isTemplateFormat(headers)) result = parseTemplate(rows, headers);
          else throw new Error('Unrecognised format. Upload a Zerodha CSV or our CapGainsIQ template.');

          if (result.transactions.length === 0) throw new Error('No valid equity transactions found.');
          
          // ── Auto-match MF tickers via backend ──────────────────────────────
          const mfAssets = result.assets.filter(a => a.source === 'MF' && !a.ticker);
          if (mfAssets.length > 0) {
            try {
              const names  = mfAssets.map(a => a.asset_name);
              const matched = await bulkMatchMF(names, 0.55);
              result.assets = result.assets.map(asset => {
                if (asset.source !== 'MF' || asset.ticker) return asset;
                const m = matched.results[asset.asset_name];
                if (m?.matched && m.scheme_code) {
                  return { ...asset, ticker: m.scheme_code };
                }
                return asset;
              });
              const autoFilled = result.assets.filter(
                (a, i) => a.source === 'MF' && a.ticker && !mfAssets[i]?.ticker
              ).length;
              if (autoFilled > 0) {
                result.warnings = [
                  `Auto-filled AMFI codes for ${autoFilled} mutual fund(s). Please verify in the Assets tab.`,
                  ...result.warnings,
                ];
              }
            } catch {
              // silent — user can fill manually
            }
          }

          // ── Auto-fix stock tickers (full legal names → NSE symbols) ────────
          // Zerodha stores "ADANI ENTERPRISES LIMITED" but Yahoo needs "ADANIENT.NS"
          const badStockAssets = result.assets.filter(a =>
            a.source === 'YF' && a.ticker && (
              a.ticker.includes(' ') ||           // has spaces — definitely wrong
              a.ticker.endsWith('.NS') === false  // doesn't end in .NS or .BO
            )
          );
          if (badStockAssets.length > 0) {
            try {
              const names   = badStockAssets.map(a => a.asset_name);
              const matched = await bulkMatchNSE(names, 0.50);
              result.assets = result.assets.map(asset => {
                if (asset.source !== 'YF') return asset;
                const m = matched.results[asset.asset_name];
                if (m?.matched && m.nse_ticker) {
                  return { ...asset, ticker: m.nse_ticker };
                }
                return asset;
              });
              const fixedCount = badStockAssets.filter(a => {
                const m = matched.results[a.asset_name];
                return m?.matched;
              }).length;
              if (fixedCount > 0) {
                result.warnings = [
                  `Auto-fixed NSE tickers for ${fixedCount} stock(s). Please verify in the Assets tab.`,
                  ...result.warnings,
                ];
              }
            } catch {
              // silent — user can fix manually
            }
          }

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
            <div style={{ fontWeight: 800, fontSize: 15, color: 'white' }}>Import Transactions</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              Zerodha CSV — or use our template for any broker
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

          {/* Template download — for non-Zerodha users */}
          <div style={{
            background: 'var(--green-lt)', border: '1px solid #86efac',
            borderRadius: 8, padding: '10px 14px', marginBottom: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--green)', display: 'block', marginBottom: 2 }}>
                Not on Zerodha? Use our template
              </strong>
              Works for Groww, Angel, ICICI, Upstox — any broker.
              Download, fill in Excel, upload here.
            </div>
            <button
              onClick={downloadTemplate}
              style={{
                flexShrink: 0, fontSize: 12, fontWeight: 700,
                color: 'var(--green)', background: 'white',
                border: '1px solid #86efac', borderRadius: 6,
                padding: '6px 12px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              ⬇ Template
            </button>
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
              ) : 'Click to upload CSV'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                Zerodha CSV or CapGainsIQ template · .csv files only
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

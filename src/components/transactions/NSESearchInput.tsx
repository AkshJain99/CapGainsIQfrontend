  /**
 * NSESearchInput.tsx
 * Smart ticker input for NSE stocks/ETFs.
 * Replaces plain text input when source === 'YF'.
 *
 * Features:
 *  - Debounced search against /api/nse/search as user types
 *  - Shows company name + NSE/BSE ticker options
 *  - User can pick NSE (.NS) or BSE (.BO) exchange
 *  - If user types a proper ticker (e.g. RELIANCE.NS), shows no dropdown
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { searchNSEStocks, type NSEMatch } from '../../api/client';

interface Props {
  value:    string;
  onChange: (ticker: string) => void;
}

function ScoreBadge({ score }: { score: number }) {
  const pct   = Math.round(score * 100);
  const color = pct >= 80 ? 'var(--green)' : pct >= 55 ? '#b45309' : 'var(--muted)';
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color,
      background: 'var(--surface3)', borderRadius: 4,
      padding: '1px 5px', flexShrink: 0, fontFamily: 'var(--mono)',
    }}>
      {pct}%
    </span>
  );
}

export default function NSESearchInput({ value, onChange }: Props) {
  const [inputVal, setInputVal] = useState(value);
  const [results,  setResults]  = useState<NSEMatch[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [open,     setOpen]     = useState(false);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  // Sync when parent changes value (e.g. editing an existing asset)
  useEffect(() => { setInputVal(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const doSearch = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query || query.trim().length < 2) {
      setResults([]); setOpen(false); return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchNSEStocks(query.trim(), 6);
        setResults(data.results);
        setOpen(data.results.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, []);

  const handleInput = (val: string) => {
    setInputVal(val);
    onChange(val);

    // If it already looks like a valid ticker (e.g. RELIANCE.NS), no search needed
    const isFullTicker = /^[A-Z0-9-]{2,20}\.(NS|BO)$/i.test(val.trim());
    if (isFullTicker) {
      setOpen(false);
      setResults([]);
      return;
    }
    doSearch(val);
  };

  const pickExchange = (match: NSEMatch, exchange: 'NSE' | 'BSE') => {
    const ticker = exchange === 'NSE' ? match.nse_ticker : match.bse_ticker;
    setInputVal(ticker);
    onChange(ticker);
    setOpen(false);
    setResults([]);
  };

  const isValidTicker = /^[A-Z0-9-]{2,20}\.(NS|BO)$/i.test(inputVal.trim());

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          className="input mono"
          placeholder="e.g. RELIANCE.NS or type company name..."
          value={inputVal}
          onChange={e => handleInput(e.target.value.toUpperCase())}
          onFocus={() => results.length > 0 && setOpen(true)}
          style={{ paddingRight: 32, borderColor: isValidTicker ? 'var(--green)' : undefined }}
          autoComplete="off"
        />
        <span style={{
          position: 'absolute', right: 10, top: '50%',
          transform: 'translateY(-50%)', fontSize: 13, pointerEvents: 'none',
        }}>
          {loading ? (
            <span style={{
              display: 'inline-block', width: 12, height: 12, borderRadius: '50%',
              border: '2px solid var(--indigo-bdr)', borderTopColor: 'var(--indigo-mid)',
              animation: 'spin 0.8s linear infinite',
            }} />
          ) : isValidTicker ? '✓' : ''}
        </span>
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', zIndex: 200, left: 0, right: 0,
          top: 'calc(100% + 4px)', background: 'var(--white)',
          border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 8px 24px rgba(15,22,40,0.12)',
          maxHeight: 300, overflowY: 'auto',
        }}>
          <div style={{
            padding: '6px 10px 4px', fontSize: 10, color: 'var(--muted)',
            fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
            borderBottom: '1px solid var(--border)',
          }}>
            Best matches — pick NSE or BSE
          </div>

          {results.map(r => (
            <div key={r.symbol} style={{
              padding: '9px 12px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              {/* Company info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 700, color: 'var(--text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {r.company_name}
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--muted)',
                  fontFamily: 'var(--mono)', marginTop: 2,
                }}>
                  Symbol: {r.symbol}
                </div>
              </div>

              <ScoreBadge score={r.score} />

              {/* Exchange buttons */}
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                <button
                  onClick={() => pickExchange(r, 'NSE')}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px',
                    borderRadius: 5, cursor: 'pointer',
                    background: 'var(--indigo-lt)', border: '1px solid var(--indigo-bdr)',
                    color: 'var(--indigo-mid)',
                  }}
                >
                  NSE
                </button>
                <button
                  onClick={() => pickExchange(r, 'BSE')}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 8px',
                    borderRadius: 5, cursor: 'pointer',
                    background: 'var(--surface3)', border: '1px solid var(--border)',
                    color: 'var(--text2)',
                  }}
                >
                  BSE
                </button>
              </div>
            </div>
          ))}

          <div style={{ padding: '6px 10px', fontSize: 10, color: 'var(--muted2)' }}>
            Not seeing your stock? Type the NSE symbol directly (e.g. ADANIENT.NS)
          </div>
        </div>
      )}

      {/* Empty state */}
      {open && !loading && results.length === 0 && inputVal.trim().length >= 2 && !isValidTicker && (
        <div style={{
          position: 'absolute', zIndex: 200, left: 0, right: 0,
          top: 'calc(100% + 4px)', background: 'var(--white)',
          border: '1px solid var(--border)', borderRadius: 8,
          padding: '12px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          fontSize: 12, color: 'var(--muted)',
        }}>
          No match found. Try shorter keywords or type the NSE symbol directly.{' '}
          <a href="https://finance.yahoo.com" target="_blank" rel="noreferrer"
            style={{ color: 'var(--indigo-mid)', fontWeight: 600 }}>
            Find on Yahoo Finance →
          </a>
        </div>
      )}
    </div>
  );
}

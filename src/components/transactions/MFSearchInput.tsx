/**
 * MFSearchInput.tsx
 * Smart ticker input for mutual funds.
 * Replaces the plain text input when source === 'MF'.
 *
 * Features:
 *  - Debounced search against /api/mf/search as user types
 *  - Dropdown with top 6 matches + confidence score
 *  - Validates manually entered scheme codes against /api/mf/code/{code}
 *  - Shows fund name confirmation once a code is selected
 */

import { useState, useRef, useEffect } from 'react';
import { useMFSearch } from '../../hooks/useMFSearch';
import { getMFByCode } from '../../api/client';

interface Props {
  value:       string;
  onChange:    (code: string, name: string) => void;
  placeholder?: string;
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

export default function MFSearchInput({ value, onChange, placeholder }: Props) {
  const [inputVal,    setInputVal]    = useState(value);
  const [confirmedName, setConfirmedName] = useState('');
  const [open,        setOpen]        = useState(false);
  const [validating,  setValidating]  = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { results, loading, search, clear } = useMFSearch(280);

  // When parent changes value (e.g. edit existing asset), sync input
  useEffect(() => {
    setInputVal(value);
    if (value && /^\d{4,8}$/.test(value)) {
      // valid code already — look up name silently
      getMFByCode(value)
        .then(f => setConfirmedName(f.scheme_name))
        .catch(() => setConfirmedName(''));
    } else {
      setConfirmedName('');
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = (val: string) => {
    setInputVal(val);
    setConfirmedName('');
    onChange(val, '');

    if (/^\d{4,8}$/.test(val.trim())) {
      // looks like a scheme code — validate it
      setValidating(true);
      setOpen(false);
      getMFByCode(val.trim())
        .then(f => {
          setConfirmedName(f.scheme_name);
          onChange(f.scheme_code, f.scheme_name);
        })
        .catch(() => setConfirmedName(''))
        .finally(() => setValidating(false));
    } else {
      // treat as name search
      search(val);
      setOpen(val.trim().length >= 2);
    }
  };

  const handleSelect = (code: string, name: string) => {
    setInputVal(code);
    setConfirmedName(name);
    onChange(code, name);
    setOpen(false);
    clear();
  };

  const isValid = confirmedName.length > 0;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* Input row */}
      <div style={{ position: 'relative' }}>
        <input
          className="input mono"
          placeholder={placeholder ?? 'e.g. 120505 or type fund name...'}
          value={inputVal}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          style={{
            paddingRight: 32,
            borderColor: isValid ? 'var(--green)' : undefined,
          }}
          autoComplete="off"
        />
        {/* Status icon */}
        <span style={{
          position: 'absolute', right: 10, top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 13, pointerEvents: 'none',
        }}>
          {validating || loading ? (
            <span style={{
              display: 'inline-block', width: 12, height: 12,
              borderRadius: '50%', border: '2px solid var(--indigo-bdr)',
              borderTopColor: 'var(--indigo-mid)',
              animation: 'spin 0.8s linear infinite',
            }} />
          ) : isValid ? '✓' : ''}
        </span>
      </div>

      {/* Confirmed fund name */}
      {isValid && (
        <div style={{
          fontSize: 11, color: 'var(--green)', marginTop: 4,
          lineHeight: 1.4, fontWeight: 600,
        }}>
          ✓ {confirmedName}
        </div>
      )}

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', zIndex: 200, left: 0, right: 0,
          top: 'calc(100% + 4px)',
          background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(15,22,40,0.12)',
          maxHeight: 260, overflowY: 'auto',
        }}>
          <div style={{
            padding: '6px 10px 4px',
            fontSize: 10, color: 'var(--muted)', fontWeight: 700,
            letterSpacing: 0.5, textTransform: 'uppercase',
            borderBottom: '1px solid var(--border)',
          }}>
            Best matches — click to select
          </div>
          {results.map(r => (
            <button
              key={r.scheme_code}
              onClick={() => handleSelect(r.scheme_code, r.scheme_name)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                width: '100%', textAlign: 'left',
                padding: '9px 12px', background: 'none', border: 'none',
                cursor: 'pointer', borderBottom: '1px solid var(--border)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--indigo-lt)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {r.scheme_name}
                </div>
                <div style={{
                  fontSize: 11, color: 'var(--muted)',
                  fontFamily: 'var(--mono)', marginTop: 2,
                }}>
                  Code: {r.scheme_code}
                </div>
              </div>
              <ScoreBadge score={r.score} />
            </button>
          ))}
          <div style={{
            padding: '6px 10px',
            fontSize: 10, color: 'var(--muted2)',
          }}>
            Not seeing your fund? Try shorter keywords or enter scheme code directly.
          </div>
        </div>
      )}

      {/* Empty state */}
      {open && !loading && results.length === 0 && inputVal.trim().length >= 2 && (
        <div style={{
          position: 'absolute', zIndex: 200, left: 0, right: 0,
          top: 'calc(100% + 4px)',
          background: 'var(--white)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '12px 14px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          fontSize: 12, color: 'var(--muted)',
        }}>
          No funds found. Try shorter keywords or enter the AMFI code directly.{' '}
          <a href="https://www.mfapi.in" target="_blank" rel="noreferrer"
            style={{ color: 'var(--indigo-mid)', fontWeight: 600 }}>
            Find code on mfapi.in →
          </a>
        </div>
      )}
    </div>
  );
}

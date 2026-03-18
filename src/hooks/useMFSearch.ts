/**
 * useMFSearch.ts
 * Debounced MF fund name search hook.
 * Calls /api/mf/search as user types — returns ranked matches.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { searchMFFunds, type MFMatch } from '../api/client';

interface UseMFSearchResult {
  results:   MFMatch[];
  loading:   boolean;
  error:     string | null;
  search:    (query: string) => void;
  clear:     () => void;
}

export function useMFSearch(debounceMs = 300): UseMFSearchResult {
  const [results, setResults] = useState<MFMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef              = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
    setResults([]);
    setLoading(false);
    setError(null);
  }, []);

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query || query.trim().length < 2) {
      clear();
      return;
    }

    timerRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);
      try {
        const data = await searchMFFunds(query.trim(), 6);
        setResults(data.results);
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setError('Search failed');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, debounceMs);
  }, [debounceMs, clear]);

  // Cleanup on unmount
  useEffect(() => () => { clear(); }, [clear]);

  return { results, loading, error, search, clear };
}

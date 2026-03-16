import { useState, useRef, useCallback } from 'react';
import { runCapGains, pollJob } from '../api/client';
import type { RunPayload, RunState} from '../types';

export function useCapGains() {
  const [state, setState] = useState<RunState>({
    status: 'idle',
    result: null,
    error: null,
    job_id: null,
  });
  const [progress, setProgress] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const run = useCallback(async (payload: RunPayload) => {
    setState({ status: 'running', result: null, error: null, job_id: null });
    setProgress('Submitting job...');
    try {
      const { job_id } = await runCapGains(payload);
      setState(s => ({ ...s, job_id }));
      setProgress('Fetching latest prices...');

      pollRef.current = setInterval(async () => {
        try {
          const res = await pollJob(job_id);
          if (res.progress) setProgress(res.progress);
          if (res.status === 'done' && res.result) {
            stopPolling();
            setState({ status: 'done', result: res.result, error: null, job_id });
            setProgress('');
          } else if (res.status === 'error') {
            stopPolling();
            setState({ status: 'error', result: null, error: res.error ?? 'Unknown error', job_id });
            setProgress('');
          }
        } catch (e) {
          stopPolling();
          setState({ status: 'error', result: null, error: String(e), job_id });
          setProgress('');
        }
      }, 1500);
    } catch (e) {
      setState({ status: 'error', result: null, error: String(e), job_id: null });
      setProgress('');
    }
  }, [stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setState({ status: 'idle', result: null, error: null, job_id: null });
    setProgress('');
  }, [stopPolling]);

  return { state, progress, run, reset };
}

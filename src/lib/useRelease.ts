import { useEffect, useState } from 'react';
import { REFRESH_INTERVAL, getLatestRelease, type Release } from './releases';

export function useRelease() {
  const [release, setRelease] = useState<Release | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    let pending = false;
    let lastAttempt = 0;
    const refresh = async () => {
      if (pending || Date.now() - lastAttempt < 60_000) return;
      lastAttempt = Date.now();
      pending = true;
      setLoading(true);
      try {
        const next = await getLatestRelease();
        if (alive) {
          setRelease(next);
          setError(false);
        }
      } catch {
        if (alive) setError(true);
      } finally {
        pending = false;
        if (alive) setLoading(false);
      }
    };
    void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, REFRESH_INTERVAL);
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [attempt]);
  return {
    release,
    loading,
    error,
    retry: () => setAttempt((value) => value + 1),
  };
}

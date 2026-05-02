import { useState, useEffect, useMemo } from 'react';
import apiServerClient from '@/lib/apiServerClient';

/**
 * Fetch public profile option lists for dropdowns (Supabase-backed).
 * @param {string[]} setKeys - Machine keys e.g. ['preferred_language','sex_assigned_at_birth']
 */
export function useProfileOptionCatalog(setKeys) {
  const signature = useMemo(
    () => JSON.stringify([...(setKeys || [])].filter(Boolean).sort()),
    [setKeys],
  );

  const [catalog, setCatalog] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const keys = signature ? JSON.parse(signature) : [];
    if (!keys.length) {
      setCatalog({});
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = keys.join(',');
        const res = await apiServerClient.fetch(`/option-catalog?sets=${encodeURIComponent(qs)}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to load options');
        }
        const data = await res.json();
        if (!cancelled) setCatalog(data.catalog || {});
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load options');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [signature]);

  return { catalog, loading, error };
}

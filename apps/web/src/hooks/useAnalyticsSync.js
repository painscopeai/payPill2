
import { useState, useEffect, useCallback } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

export function useAnalyticsSync(endpoint, options = {}) {
  const { refreshInterval = 300000, startDate, endDate } = options; // Default 5 mins
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await apiServerClient.fetch(`${endpoint}${queryString}`);
      
      if (!response.ok) {
        let detail = response.statusText?.trim();
        if (!detail) detail = `HTTP ${response.status}`;
        try {
          const body = await response.clone().json();
          if (body?.message && typeof body.message === 'string') detail = body.message;
          else if (typeof body?.error === 'string') detail = body.error;
        } catch {
          try {
            const text = await response.clone().text();
            if (text?.length && text.length < 300) detail = text;
          } catch {
            /* ignore */
          }
        }
        throw new Error(`Analytics fetch failed: ${detail}`);
      }
      
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(`Error fetching analytics from ${endpoint}:`, err);
      if (showLoading) {
        const aborted =
          err?.name === 'AbortError' || /aborted|timed out/i.test(String(err?.message || ''));
        const message = aborted
          ? 'Request timed out. Check your connection or try again.'
          : err.message;
        setError(message);
        toast.error('Failed to sync analytics data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, startDate, endDate]);

  useEffect(() => {
    fetchData(true);

    const intervalId = setInterval(() => {
      fetchData(false); // Background refresh
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [fetchData, refreshInterval]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    reconnect: () => fetchData(true)
  };
}

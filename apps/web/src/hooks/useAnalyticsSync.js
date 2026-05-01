
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
        throw new Error(`Analytics fetch failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(`Error fetching analytics from ${endpoint}:`, err);
      setError(err.message);
      toast.error('Failed to sync analytics data');
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

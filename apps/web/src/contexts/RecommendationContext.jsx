import React, { createContext, useContext, useState, useCallback } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

/** Must stay under Vercel serverless maxDuration; default 285s so the browser does not abort before the server finishes. */
const AI_POST_TIMEOUT_MS = Math.min(
	600_000,
	Math.max(120_000, Number(process.env.NEXT_PUBLIC_AI_RECOMMENDATIONS_TIMEOUT_MS) || 285_000),
);

const RecommendationContext = createContext(null);

export const RecommendationProvider = ({ children }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  /** POST — Gemini generation only */
  const [isGenerating, setIsGenerating] = useState(false);

  /** Silent background fetch — Insights page should not block on list load */
  const fetchRecommendations = useCallback(async () => {
    try {
      const response = await apiServerClient.fetch('/ai-recommendations');
      if (response.ok) {
        const data = await response.json();
        setRecommendations(Array.isArray(data) ? data : (data.recommendations || []));
      } else {
        toast.error('Could not load saved recommendations');
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      toast.error('Failed to load recommendations');
    }
  }, []);

  const generateRecommendations = async (focusArea = 'general') => {
    setIsGenerating(true);
    let errorToastShown = false;
    try {
      const response = await apiServerClient.fetch('/ai-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focus_area: focusArea }),
        timeoutMs: AI_POST_TIMEOUT_MS,
      });
      let data = {};
      try {
        data = await response.json();
      } catch {
        /* non-JSON error body */
      }
      if (!response.ok) {
        const msg =
          (typeof data?.message === 'string' && data.message) ||
          (typeof data?.error === 'string' && data.error) ||
          `Generation failed (${response.status})`;
        toast.error(msg);
        errorToastShown = true;
        throw new Error(msg);
      }
      toast.success('New recommendations generated!');
      await fetchRecommendations();
      return data;
    } catch (error) {
      console.error('Failed to generate:', error);
      if (!errorToastShown) {
        toast.error(error instanceof Error ? error.message : 'Failed to generate recommendations');
      }
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const acceptRecommendation = async (id) => {
    try {
      await apiServerClient.fetch(`/ai-recommendations/${id}/accept`, { method: 'POST' });
      setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status: 'Accepted' } : r));
      toast.success('Recommendation accepted');
    } catch (error) {
      toast.error('Failed to accept recommendation');
    }
  };

  const declineRecommendation = async (id, reason) => {
    try {
      await apiServerClient.fetch(`/ai-recommendations/${id}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status: 'Declined' } : r));
      toast.success('Recommendation declined');
    } catch (error) {
      toast.error('Failed to decline recommendation');
    }
  };

  const refineRecommendation = async (id, updates) => {
    try {
      const response = await apiServerClient.fetch(`/ai-recommendations/${id}/refine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const updated = await response.json();
      setRecommendations(prev => prev.map(r => r.id === id ? updated : r));
      toast.success('Recommendation refined');
    } catch (error) {
      toast.error('Failed to refine recommendation');
    }
  };

  const getRecommendationHistory = useCallback(async () => {
    try {
      const response = await apiServerClient.fetch('/recommendation-history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
        setStats(data.statistics || null);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  }, []);

  return (
    <RecommendationContext.Provider value={{
      recommendations,
      history,
      stats,
      isGenerating,
      fetchRecommendations,
      generateRecommendations,
      acceptRecommendation,
      declineRecommendation,
      refineRecommendation,
      getRecommendationHistory
    }}>
      {children}
    </RecommendationContext.Provider>
  );
};

export const useRecommendations = () => useContext(RecommendationContext);
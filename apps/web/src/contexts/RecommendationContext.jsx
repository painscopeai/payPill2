import React, { createContext, useContext, useState, useCallback } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

/** POST only waits for n8n webhook ACK (~12s server-side); default 30s client buffer. */
const AI_POST_ACK_TIMEOUT_MS = Math.min(
	120_000,
	Math.max(10_000, Number(process.env.NEXT_PUBLIC_AI_RECOMMENDATIONS_POST_TIMEOUT_MS) || 30_000),
);

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 40;

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const RecommendationContext = createContext(null);

export const RecommendationProvider = ({ children }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  /** POST ack / modal spinner — clears quickly after webhook accepts */
  const [isGenerating, setIsGenerating] = useState(false);

  /** Returns the list on success, or null. Updates React state. */
  const fetchRecommendations = useCallback(async () => {
    try {
      const response = await apiServerClient.fetch('/ai-recommendations');
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.recommendations || []);
        setRecommendations(list);
        return list;
      }
      toast.error('Could not load saved recommendations');
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      toast.error('Failed to load recommendations');
    }
    return null;
  }, []);

  const pollForNewRecommendations = useCallback(async (baselineCount, baselineLatestCreatedAt) => {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);
      const list = await fetchRecommendations();
      if (!list) continue;

      if (list.length > baselineCount) {
        toast.success('New recommendations are ready!');
        return;
      }

      if (
        baselineLatestCreatedAt &&
        list[0]?.created_at &&
        list[0].created_at !== baselineLatestCreatedAt &&
        new Date(list[0].created_at) > new Date(baselineLatestCreatedAt)
      ) {
        toast.success('New recommendations are ready!');
        return;
      }
    }
    toast.info('Still processing — refresh this page in a minute.');
  }, [fetchRecommendations]);

  const generateRecommendations = async (focusArea = 'general') => {
    const baselineCount = recommendations.length;
    const baselineLatestCreatedAt = recommendations[0]?.created_at ?? null;

    setIsGenerating(true);
    let errorToastShown = false;
    try {
      const response = await apiServerClient.fetch('/ai-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focus_area: focusArea }),
        timeoutMs: AI_POST_ACK_TIMEOUT_MS,
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

      const asyncAck = response.status === 202 || data.accepted === true;
      if (asyncAck) {
        toast.success(
          typeof data.message === 'string' ? data.message : 'Recommendations are generating…',
        );
        setIsGenerating(false);
        await pollForNewRecommendations(baselineCount, baselineLatestCreatedAt);
        return data;
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

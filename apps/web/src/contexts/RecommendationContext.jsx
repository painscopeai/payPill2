import React, { createContext, useContext, useState, useCallback } from 'react';
import apiServerClient from '@/lib/apiServerClient';
import { toast } from 'sonner';

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
    try {
      const response = await apiServerClient.fetch('/ai-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ focus_area: focusArea }),
      });
      if (!response.ok) throw new Error('Generation failed');
      const data = await response.json();
      toast.success('New recommendations generated!');
      await fetchRecommendations();
      return data;
    } catch (error) {
      console.error('Failed to generate:', error);
      toast.error('Failed to generate recommendations');
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